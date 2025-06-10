const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all equipment
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, 
             CONCAT(s.first_name, ' ', s.last_name) as assigned_staff_name
      FROM equipment e
      LEFT JOIN staff s ON e.assigned_to = s.staff_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one equipment by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, 
             CONCAT(s.first_name, ' ', s.last_name) as assigned_staff_name
      FROM equipment e
      LEFT JOIN staff s ON e.assigned_to = s.staff_id
      WHERE e.equipment_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET equipment by assigned staff ID
router.get('/assigned/:staffId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, 
             CONCAT(s.first_name, ' ', s.last_name) as assigned_staff_name
      FROM equipment e
      LEFT JOIN staff s ON e.assigned_to = s.staff_id
      WHERE e.assigned_to = ?
    `, [req.params.staffId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET available equipment (not assigned)
router.get('/status/available', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM equipment WHERE assigned_to IS NULL');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new equipment
router.post('/', async (req, res) => {
  try {
    const { name, quantity, assigned_to } = req.body;
    const [result] = await db.query(
      'INSERT INTO equipment (name, quantity, assigned_to) VALUES (?, ?, ?)',
      [name, quantity, assigned_to]
    );
    res.status(201).json({ equipment_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Invalid assigned_to staff_id' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update equipment by ID
router.put('/:id', async (req, res) => {
  try {
    const { name, quantity, assigned_to } = req.body;
    const [result] = await db.query(
      'UPDATE equipment SET name = ?, quantity = ?, assigned_to = ? WHERE equipment_id = ?',
      [name, quantity, assigned_to, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Equipment not found' });
    res.json({ message: 'Equipment updated successfully' });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Invalid assigned_to staff_id' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT assign equipment to staff
router.put('/:id/assign', async (req, res) => {
  try {
    const { assigned_to } = req.body;
    const [result] = await db.query(
      'UPDATE equipment SET assigned_to = ? WHERE equipment_id = ?',
      [assigned_to, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Equipment not found' });
    res.json({ message: 'Equipment assigned successfully' });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Invalid staff_id' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT unassign equipment
router.put('/:id/unassign', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE equipment SET assigned_to = NULL WHERE equipment_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Equipment not found' });
    res.json({ message: 'Equipment unassigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE equipment by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM equipment WHERE equipment_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Equipment not found' });
    res.json({ message: 'Equipment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;