const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all facilities
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM facilities');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one facility by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM facilities WHERE facility_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET facilities by type
router.get('/type/:type', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM facilities WHERE type = ?', [req.params.type]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET facilities by location
router.get('/location/:location', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM facilities WHERE location LIKE ?', [`%${req.params.location}%`]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique facility types
router.get('/meta/types', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT type FROM facilities WHERE type IS NOT NULL ORDER BY type');
    res.json(rows.map(row => row.type));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique facility locations
router.get('/meta/locations', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT location FROM facilities WHERE location IS NOT NULL ORDER BY location');
    res.json(rows.map(row => row.location));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new facility
router.post('/', async (req, res) => {
  try {
    const { name, type, location } = req.body;
    const [result] = await db.query(
      'INSERT INTO facilities (name, type, location) VALUES (?, ?, ?)',
      [name, type, location]
    );
    res.status(201).json({ facility_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update facility by ID
router.put('/:id', async (req, res) => {
  try {
    const { name, type, location } = req.body;
    const [result] = await db.query(
      'UPDATE facilities SET name = ?, type = ?, location = ? WHERE facility_id = ?',
      [name, type, location, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json({ message: 'Facility updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE facility by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM facilities WHERE facility_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json({ message: 'Facility deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;