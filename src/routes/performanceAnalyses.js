const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all performance analyses
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pa.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             m.opponent, m.match_date,
             s.first_name as analyst_first_name, s.last_name as analyst_last_name
      FROM performance_analysis pa
      LEFT JOIN players p ON pa.player_id = p.player_id
      LEFT JOIN matches m ON pa.match_id = m.match_id
      LEFT JOIN staff s ON pa.analyst_id = s.staff_id
      ORDER BY m.match_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one performance analysis by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pa.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             m.opponent, m.match_date,
             s.first_name as analyst_first_name, s.last_name as analyst_last_name
      FROM performance_analysis pa
      LEFT JOIN players p ON pa.player_id = p.player_id
      LEFT JOIN matches m ON pa.match_id = m.match_id
      LEFT JOIN staff s ON pa.analyst_id = s.staff_id
      WHERE pa.analysis_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Performance analysis not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET performance analyses by player
router.get('/player/:playerId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pa.*, 
             m.opponent, m.match_date,
             s.first_name as analyst_first_name, s.last_name as analyst_last_name
      FROM performance_analysis pa
      LEFT JOIN matches m ON pa.match_id = m.match_id
      LEFT JOIN staff s ON pa.analyst_id = s.staff_id
      WHERE pa.player_id = ?
      ORDER BY m.match_date DESC
    `, [req.params.playerId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET performance analyses by match
router.get('/match/:matchId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pa.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             s.first_name as analyst_first_name, s.last_name as analyst_last_name
      FROM performance_analysis pa
      LEFT JOIN players p ON pa.player_id = p.player_id
      LEFT JOIN staff s ON pa.analyst_id = s.staff_id
      WHERE pa.match_id = ?
    `, [req.params.matchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET performance analyses by analyst
router.get('/analyst/:analystId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pa.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             m.opponent, m.match_date
      FROM performance_analysis pa
      LEFT JOIN players p ON pa.player_id = p.player_id
      LEFT JOIN matches m ON pa.match_id = m.match_id
      WHERE pa.analyst_id = ?
      ORDER BY m.match_date DESC
    `, [req.params.analystId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET performance analysis summary by player
router.get('/player/:playerId/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_analyses,
        MIN(m.match_date) as first_analysis_date,
        MAX(m.match_date) as latest_analysis_date
      FROM performance_analysis pa
      LEFT JOIN matches m ON pa.match_id = m.match_id
      WHERE pa.player_id = ?
    `, [req.params.playerId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new performance analysis
router.post('/', async (req, res) => {
  try {
    const { player_id, match_id, metrics, analyst_id } = req.body;
    const [result] = await db.query(
      'INSERT INTO performance_analysis (player_id, match_id, metrics, analyst_id) VALUES (?, ?, ?, ?)',
      [player_id, match_id, metrics, analyst_id]
    );
    res.status(201).json({ analysis_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update performance analysis by ID
router.put('/:id', async (req, res) => {
  try {
    const { player_id, match_id, metrics, analyst_id } = req.body;
    const [result] = await db.query(
      'UPDATE performance_analysis SET player_id = ?, match_id = ?, metrics = ?, analyst_id = ? WHERE analysis_id = ?',
      [player_id, match_id, metrics, analyst_id, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Performance analysis not found' });
    res.json({ message: 'Performance analysis updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE performance analysis by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM performance_analysis WHERE analysis_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Performance analysis not found' });
    res.json({ message: 'Performance analysis deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;