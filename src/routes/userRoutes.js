const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');

// GET all users (excluding password_hash)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, name, email, role, created_at FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one user by ID (excluding password_hash)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET users by role
router.get('/role/:role', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, name, email, role, created_at FROM users WHERE role = ?', [req.params.role]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new user
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, role]
    );
    res.status(201).json({ user_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email must be unique' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update user by ID
router.put('/:id', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const [result] = await db.query(
      'UPDATE users SET name = ?, email = ?, role = ? WHERE user_id = ?',
      [name, email, role, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email must be unique' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update user password
router.put('/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    
    // Hash new password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const [result] = await db.query(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [password_hash, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;