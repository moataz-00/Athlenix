const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all department permissions
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT dp.*, d.name as department_name, pl.level_name 
      FROM department_permissions dp
      LEFT JOIN departments d ON dp.department_id = d.department_id
      LEFT JOIN permission_levels pl ON dp.level_id = pl.level_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one department permission by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT dp.*, d.name as department_name, pl.level_name 
      FROM department_permissions dp
      LEFT JOIN departments d ON dp.department_id = d.department_id
      LEFT JOIN permission_levels pl ON dp.level_id = pl.level_id
      WHERE dp.permission_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Department permission not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET permissions by department ID
router.get('/department/:departmentId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT dp.*, d.name as department_name, pl.level_name 
      FROM department_permissions dp
      LEFT JOIN departments d ON dp.department_id = d.department_id
      LEFT JOIN permission_levels pl ON dp.level_id = pl.level_id
      WHERE dp.department_id = ?
    `, [req.params.departmentId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new department permission
router.post('/', async (req, res) => {
  try {
    const { department_id, permission, level_id } = req.body;
    const [result] = await db.query(
      'INSERT INTO department_permissions (department_id, permission, level_id) VALUES (?, ?, ?)',
      [department_id, permission, level_id]
    );
    res.status(201).json({ permission_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Invalid department_id or level_id' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update department permission by ID
router.put('/:id', async (req, res) => {
  try {
    const { department_id, permission, level_id } = req.body;
    const [result] = await db.query(
      'UPDATE department_permissions SET department_id = ?, permission = ?, level_id = ? WHERE permission_id = ?',
      [department_id, permission, level_id, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Department permission not found' });
    res.json({ message: 'Department permission updated successfully' });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Invalid department_id or level_id' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE department permission by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM department_permissions WHERE permission_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Department permission not found' });
    res.json({ message: 'Department permission deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;