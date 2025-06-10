const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all departments
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, COUNT(s.staff_id) as staff_count
      FROM departments d
      LEFT JOIN staff s ON d.department_id = s.department_id
      GROUP BY d.department_id
      ORDER BY d.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one department by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, COUNT(s.staff_id) as staff_count
      FROM departments d
      LEFT JOIN staff s ON d.department_id = s.department_id
      WHERE d.department_id = ?
      GROUP BY d.department_id
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET department with staff
router.get('/:id/staff', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, u.username, u.email, u.first_name, u.last_name, d.name as department_name
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.user_id
      JOIN departments d ON s.department_id = d.department_id
      WHERE d.department_id = ?
      ORDER BY s.hire_date DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET department statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.name as department_name,
        COUNT(s.staff_id) as total_staff,
        COUNT(DISTINCT s.position) as unique_positions,
        MIN(s.hire_date) as earliest_hire_date,
        MAX(s.hire_date) as latest_hire_date
      FROM departments d
      LEFT JOIN staff s ON d.department_id = s.department_id
      WHERE d.department_id = ?
      GROUP BY d.department_id
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new department
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name is required' });
    
    const [result] = await db.query(
      'INSERT INTO departments (name) VALUES (?)',
      [name]
    );
    res.status(201).json({ department_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update department by ID
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name is required' });
    
    const [result] = await db.query(
      'UPDATE departments SET name = ? WHERE department_id = ?',
      [name, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Department not found' });
    res.json({ message: 'Department updated successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE department by ID
router.delete('/:id', async (req, res) => {
  try {
    // Check if department has staff
    const [staffCheck] = await db.query('SELECT COUNT(*) as count FROM staff WHERE department_id = ?', [req.params.id]);
    if (staffCheck[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete department with assigned staff' });
    }
    
    const [result] = await db.query('DELETE FROM departments WHERE department_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Department not found' });
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;