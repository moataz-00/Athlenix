const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

// Rate limiting middleware
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { message: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation helpers
const validateEmail = (email) => {
  return validator.isEmail(email) && email.length <= 254;
};

const validatePassword = (password) => {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password) && password.length <= 128;
};

const validateRole = (role) => {
  const allowedRoles = ['admin', 'user', 'moderator'];
  return allowedRoles.includes(role);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
};

// Security helper to add delay on auth failures
const securityDelay = () => {
  return new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
};

exports.authLimiter = authLimiter;

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Input validation
    if (!email || !password) {
      await securityDelay();
      return res.status(400).json({ 
        message: 'Email and password are required',
        errors: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      await securityDelay();
      return res.status(400).json({ 
        message: 'Invalid email format',
        errors: { email: 'Please provide a valid email address' }
      });
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    // Query user with prepared statement
    const [users] = await db.execute(
      'SELECT user_id, name, email, password_hash, role, is_active, failed_login_attempts, locked_until FROM users WHERE email = ?', 
      [sanitizedEmail]
    );

    if (users.length === 0) {
      await securityDelay();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if account is locked
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      return res.status(423).json({ 
        message: 'Account temporarily locked due to multiple failed attempts' 
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Compare password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      // Increment failed login attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = failedAttempts >= 5 ? 
        new Date(Date.now() + 30 * 60 * 1000) : null; // Lock for 30 minutes after 5 failed attempts

      await db.execute(
        'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE user_id = ?',
        [failedAttempts, lockUntil, user.user_id]
      );

      await securityDelay();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    await db.execute(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE user_id = ?',
      [user.user_id]
    );

    // Generate JWT token with shorter expiration
    const tokenPayload = { 
      userId: user.user_id, 
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: process.env.JWT_ISSUER || 'your-app-name',
        audience: process.env.JWT_AUDIENCE || 'your-app-users'
      }
    );

    // Create refresh token (optional)
    const refreshToken = jwt.sign(
      { userId: user.user_id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set secure HTTP-only cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return success response (excluding sensitive data)
    res.json({ 
      message: 'Login successful',
      token,
      user: { 
        id: user.user_id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // Input validation
    const errors = {};
    
    if (!name || name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    } else if (name.trim().length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }

    if (!email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please provide a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      errors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    if (!validateRole(role)) {
      errors.role = 'Invalid role specified';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors 
      });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name.trim());
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());

    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT user_id FROM users WHERE email = ?', 
      [sanitizedEmail]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ 
        message: 'Email already in use',
        errors: { email: 'An account with this email already exists' }
      });
    }

    // Hash password with higher cost for better security
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Begin transaction for data integrity
    await db.beginTransaction();

    try {
      // Insert user into database
      const [result] = await db.execute(
        `INSERT INTO users (name, email, password_hash, role, is_active, created_at) 
         VALUES (?, ?, ?, ?, true, NOW())`,
        [sanitizedName, sanitizedEmail, passwordHash, role]
      );

      // Log the registration (optional audit trail)
      await db.execute(
        'INSERT INTO user_audit_log (user_id, action, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, NOW())',
        [result.insertId, 'REGISTER', req.ip, req.get('User-Agent')]
      );

      await db.commit();

      // Send success response (without sensitive data)
      res.status(201).json({ 
        message: 'User registered successfully',
        user: {
          id: result.insertId,
          name: sanitizedName,
          email: sanitizedEmail,
          role: role
        }
      });

    } catch (dbError) {
      await db.rollback();
      throw dbError;
    }

  } catch (error) {
    console.error('Register error:', error);
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        message: 'Email already in use',
        errors: { email: 'An account with this email already exists' }
      });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Additional utility endpoints
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not provided' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // Verify user still exists and is active
    const [users] = await db.execute(
      'SELECT user_id, role, is_active FROM users WHERE user_id = ?',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Generate new access token
    const newToken = jwt.sign(
      { userId: decoded.userId, role: users[0].role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token: newToken });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    // Optional: Add token to blacklist table for extra security
    // await db.execute('INSERT INTO token_blacklist (token, expires_at) VALUES (?, ?)', [token, expiresAt]);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};