const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all staff permissions
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sp.*, s.first_name, s.last_name, dp.permission_name, pl.level_name 
      FROM staff_permissions sp 
      LEFT JOIN staff s ON sp.staff_id = s.staff_id 
      LEFT JOIN department_permissions dp ON sp.permission_id = dp.permission_id 
      LEFT JOIN permission_levels pl ON sp.level_id = pl.level_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET permissions by staff ID
router.get('/staff/:staff_id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sp.*, s.first_name, s.last_name, dp.permission_name, pl.level_name 
      FROM staff_permissions sp 
      LEFT JOIN staff s ON sp.staff_id = s.staff_id 
      LEFT JOIN department_permissions dp ON sp.permission_id = dp.permission_id 
      LEFT JOIN permission_levels pl ON sp.level_id = pl.level_id 
      WHERE sp.staff_id = ?
    `, [req.params.staff_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET staff by permission ID
router.get('/permission/:permission_id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sp.*, s.first_name, s.last_name, dp.permission_name, pl.level_name 
      FROM staff_permissions sp 
      LEFT JOIN staff s ON sp.staff_id = s.staff_id 
      LEFT JOIN department_permissions dp ON sp.permission_id = dp.permission_id 
      LEFT JOIN permission_levels pl ON sp.level_id = pl.level_id 
      WHERE sp.permission_id = ?
    `, [req.params.permission_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET staff by level ID
router.get('/level/:level_id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sp.*, s.first_name, s.last_name, dp.permission_name, pl.level_name 
      FROM staff_permissions sp 
      LEFT JOIN staff s ON sp.staff_id = s.staff_id 
      LEFT JOIN department_permissions dp ON sp.permission_id = dp.permission_id 
      LEFT JOIN permission_levels pl ON sp.level_id = pl.level_id 
      WHERE sp.level_id = ?
    `, [req.params.level_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET specific staff permission
router.get('/:staff_id/:permission_id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sp.*, s.first_name, s.last_name, dp.permission_name, pl.level_name 
      FROM staff_permissions sp 
      LEFT JOIN staff s ON sp.staff_id = s.staff_id 
      LEFT JOIN department_permissions dp ON sp.permission_id = dp.permission_id 
      LEFT JOIN permission_levels pl ON sp.level_id = pl.level_id 
      WHERE sp.staff_id = ? AND sp.permission_id = ?
    `, [req.params.staff_id, req.params.permission_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Staff permission not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique permission levels
router.get('/meta/levels', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT pl.level_id, pl.level_name 
      FROM permission_levels pl 
      INNER JOIN staff_permissions sp ON pl.level_id = sp.level_id 
      ORDER BY pl.level_name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new staff permission
router.post('/', async (req, res) => {
  try {
    const { staff_id, permission_id, level_id } = req.body;
    const [result] = await db.query(
      'INSERT INTO staff_permissions (staff_id, permission_id, level_id) VALUES (?, ?, ?)',
      [staff_id, permission_id, level_id]
    );
    res.status(201).json({ message: 'Staff permission created successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Staff permission already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PUT update staff permission level
router.put('/:staff_id/:permission_id', async (req, res) => {
  try {
    const { level_id } = req.body;
    const [result] = await db.query(
      'UPDATE staff_permissions SET level_id = ? WHERE staff_id = ? AND permission_id = ?',
      [level_id, req.params.staff_id, req.params.permission_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Staff permission not found' });
    res.json({ message: 'Staff permission updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE staff permission
router.delete('/:staff_id/:permission_id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM staff_permissions WHERE staff_id = ? AND permission_id = ?',
      [req.params.staff_id, req.params.permission_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Staff permission not found' });
    res.json({ message: 'Staff permission deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;