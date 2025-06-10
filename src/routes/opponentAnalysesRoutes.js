const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all opponent analyses
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT oa.*, m.opponent, s.first_name, s.last_name 
      FROM opponent_analysis oa
      LEFT JOIN matches m ON oa.match_id = m.match_id
      LEFT JOIN staff s ON oa.analyst_id = s.staff_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one opponent analysis by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT oa.*, m.opponent, s.first_name, s.last_name 
      FROM opponent_analysis oa
      LEFT JOIN matches m ON oa.match_id = m.match_id
      LEFT JOIN staff s ON oa.analyst_id = s.staff_id
      WHERE oa.analysis_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Opponent analysis not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET opponent analyses by match
router.get('/match/:matchId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT oa.*, s.first_name, s.last_name 
      FROM opponent_analysis oa
      LEFT JOIN staff s ON oa.analyst_id = s.staff_id
      WHERE oa.match_id = ?
    `, [req.params.matchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET opponent analyses by analyst
router.get('/analyst/:analystId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT oa.*, m.opponent 
      FROM opponent_analysis oa
      LEFT JOIN matches m ON oa.match_id = m.match_id
      WHERE oa.analyst_id = ?
    `, [req.params.analystId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new opponent analysis
router.post('/', async (req, res) => {
  try {
    const { match_id, analysis, analyst_id } = req.body;
    const [result] = await db.query(
      'INSERT INTO opponent_analysis (match_id, analysis, analyst_id) VALUES (?, ?, ?)',
      [match_id, analysis, analyst_id]
    );
    res.status(201).json({ analysis_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update opponent analysis by ID
router.put('/:id', async (req, res) => {
  try {
    const { match_id, analysis, analyst_id } = req.body;
    const [result] = await db.query(
      'UPDATE opponent_analysis SET match_id = ?, analysis = ?, analyst_id = ? WHERE analysis_id = ?',
      [match_id, analysis, analyst_id, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Opponent analysis not found' });
    res.json({ message: 'Opponent analysis updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE opponent analysis by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM opponent_analysis WHERE analysis_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Opponent analysis not found' });
    res.json({ message: 'Opponent analysis deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;