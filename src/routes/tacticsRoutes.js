const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all tactics
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, m.match_date, m.opponent 
      FROM tactics t 
      LEFT JOIN matches m ON t.match_id = m.match_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one tactic by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, m.match_date, m.opponent 
      FROM tactics t 
      LEFT JOIN matches m ON t.match_id = m.match_id 
      WHERE t.tactic_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Tactic not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET tactics by match ID
router.get('/match/:match_id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, m.match_date, m.opponent 
      FROM tactics t 
      LEFT JOIN matches m ON t.match_id = m.match_id 
      WHERE t.match_id = ?
    `, [req.params.match_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET tactics by formation
router.get('/formation/:formation', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, m.match_date, m.opponent 
      FROM tactics t 
      LEFT JOIN matches m ON t.match_id = m.match_id 
      WHERE t.formation = ?
    `, [req.params.formation]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET tactics by strategy keyword
router.get('/strategy/:keyword', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, m.match_date, m.opponent 
      FROM tactics t 
      LEFT JOIN matches m ON t.match_id = m.match_id 
      WHERE t.strategy LIKE ?
    `, [`%${req.params.keyword}%`]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique formations
router.get('/meta/formations', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT formation FROM tactics WHERE formation IS NOT NULL ORDER BY formation');
    res.json(rows.map(row => row.formation));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET tactics with match info
router.get('/meta/matches', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT t.match_id, m.match_date, m.opponent 
      FROM tactics t 
      LEFT JOIN matches m ON t.match_id = m.match_id 
      WHERE t.match_id IS NOT NULL 
      ORDER BY m.match_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new tactic
router.post('/', async (req, res) => {
  try {
    const { match_id, formation, strategy } = req.body;
    const [result] = await db.query(
      'INSERT INTO tactics (match_id, formation, strategy) VALUES (?, ?, ?)',
      [match_id, formation, strategy]
    );
    res.status(201).json({ tactic_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update tactic by ID
router.put('/:id', async (req, res) => {
  try {
    const { match_id, formation, strategy } = req.body;
    const [result] = await db.query(
      'UPDATE tactics SET match_id = ?, formation = ?, strategy = ? WHERE tactic_id = ?',
      [match_id, formation, strategy, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Tactic not found' });
    res.json({ message: 'Tactic updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE tactic by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM tactics WHERE tactic_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Tactic not found' });
    res.json({ message: 'Tactic deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;