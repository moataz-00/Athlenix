const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all staff
router.get('/departments', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, 
             u.username, u.email, u.first_name, u.last_name,
             d.name as department_name,
             DATEDIFF(CURDATE(), s.hire_date) as days_employed
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      ORDER BY s.hire_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one staff member by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, 
             u.username, u.email, u.first_name, u.last_name,
             d.name as department_name,
             DATEDIFF(CURDATE(), s.hire_date) as days_employed
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      WHERE s.staff_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Staff member not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET staff by department
router.get('/department/:departmentId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, 
             u.username, u.email, u.first_name, u.last_name,
             d.name as department_name,
             DATEDIFF(CURDATE(), s.hire_date) as days_employed
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      WHERE s.department_id = ?
      ORDER BY s.hire_date DESC
    `, [req.params.departmentId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET staff by position
router.get('/position/:position', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, 
             u.username, u.email, u.first_name, u.last_name,
             d.name as department_name,
             DATEDIFF(CURDATE(), s.hire_date) as days_employed
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      WHERE s.position = ?
      ORDER BY s.hire_date DESC
    `, [req.params.position]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET staff hired in date range
router.get('/hired/:startDate/:endDate', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, 
             u.username, u.email, u.first_name, u.last_name,
             d.name as department_name,
             DATEDIFF(CURDATE(), s.hire_date) as days_employed
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      WHERE s.hire_date BETWEEN ? AND ?
      ORDER BY s.hire_date DESC
    `, [req.params.startDate, req.params.endDate]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET staff without user account
router.get('/no-user/list', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, d.name as department_name
      FROM staff s
      LEFT JOIN departments d ON s.department_id = d.department_id
      WHERE s.user_id IS NULL
      ORDER BY s.hire_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET staff contracts
router.get('/:id/contracts', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, 
             DATEDIFF(c.end_date, c.start_date) as contract_duration_days,
             CASE 
               WHEN c.end_date < CURDATE() THEN 'Expired'
               WHEN c.start_date > CURDATE() THEN 'Future'
               ELSE 'Active'
             END as contract_status
      FROM contracts c
      WHERE c.staff_id = ?
      ORDER BY c.start_date DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique positions
router.get('/meta/positions', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT position FROM staff WHERE position IS NOT NULL ORDER BY position');
    res.json(rows.map(row => row.position));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET staff statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_staff,
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as staff_with_user_account,
        COUNT(CASE WHEN user_id IS NULL THEN 1 END) as staff_without_user_account,
        COUNT(DISTINCT department_id) as departments_with_staff,
        COUNT(DISTINCT position) as unique_positions,
        AVG(DATEDIFF(CURDATE(), hire_date)) as avg_days_employed
      FROM staff
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new staff member
router.post('/', async (req, res) => {
  try {
    const { user_id, department_id, position, hire_date } = req.body;
    
    // Check if user_id already has a staff record
    if (user_id) {
      const [existing] = await db.query('SELECT staff_id FROM staff WHERE user_id = ?', [user_id]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'User already has a staff record' });
      }
    }
    
    const [result] = await db.query(
      'INSERT INTO staff (user_id, department_id, position, hire_date) VALUES (?, ?, ?, ?)',
      [user_id || null, department_id || null, position || null, hire_date || null]
    );
    res.status(201).json({ staff_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update staff member by ID
router.put('/:id', async (req, res) => {
  try {
    const { user_id, department_id, position, hire_date } = req.body;
    
    // Check if user_id already has a staff record (excluding current record)
    if (user_id) {
      const [existing] = await db.query('SELECT staff_id FROM staff WHERE user_id = ? AND staff_id != ?', [user_id, req.params.id]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'User already has a staff record' });
      }
    }
    
    const [result] = await db.query(
      'UPDATE staff SET user_id = ?, department_id = ?, position = ?, hire_date = ? WHERE staff_id = ?',
      [user_id || null, department_id || null, position || null, hire_date || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Staff member not found' });
    res.json({ message: 'Staff member updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH assign user to staff
router.patch('/:id/assign-user', async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'User ID is required' });
    
    // Check if user_id already has a staff record
    const [existing] = await db.query('SELECT staff_id FROM staff WHERE user_id = ?', [user_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already has a staff record' });
    }
    
    const [result] = await db.query('UPDATE staff SET user_id = ? WHERE staff_id = ?', [user_id, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Staff member not found' });
    res.json({ message: 'User assigned to staff successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH change department
router.patch('/:id/change-department', async (req, res) => {
  try {
    const { department_id } = req.body;
    const [result] = await db.query('UPDATE staff SET department_id = ? WHERE staff_id = ?', [department_id || null, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Staff member not found' });
    res.json({ message: 'Department changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE staff member by ID
router.delete('/:id', async (req, res) => {
  try {
    // Check if staff member has contracts
    const [contractCheck] = await db.query('SELECT COUNT(*) as count FROM contracts WHERE staff_id = ?', [req.params.id]);
    if (contractCheck[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete staff member with existing contracts' });
    }
    
    const [result] = await db.query('DELETE FROM staff WHERE staff_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Staff member not found' });
    res.json({ message: 'Staff member deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;