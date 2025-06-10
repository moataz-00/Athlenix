const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all teams
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, COUNT(p.player_id) as player_count
      FROM teams t
      LEFT JOIN players p ON t.team_id = p.team_id
      GROUP BY t.team_id
      ORDER BY t.season_year DESC, t.level
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one team by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, COUNT(p.player_id) as player_count
      FROM teams t
      LEFT JOIN players p ON t.team_id = p.team_id
      WHERE t.team_id = ?
      GROUP BY t.team_id
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Team not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET teams by level
router.get('/level/:level', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, COUNT(p.player_id) as player_count
      FROM teams t
      LEFT JOIN players p ON t.team_id = p.team_id
      WHERE t.level = ?
      GROUP BY t.team_id
      ORDER BY t.season_year DESC
    `, [req.params.level]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET teams by season year
router.get('/season/:year', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, COUNT(p.player_id) as player_count
      FROM teams t
      LEFT JOIN players p ON t.team_id = p.team_id
      WHERE t.season_year = ?
      GROUP BY t.team_id
      ORDER BY t.level
    `, [req.params.year]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET current season teams
router.get('/season/current/teams', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const [rows] = await db.query(`
      SELECT t.*, COUNT(p.player_id) as player_count
      FROM teams t
      LEFT JOIN players p ON t.team_id = p.team_id
      WHERE t.season_year = ?
      GROUP BY t.team_id
      ORDER BY t.level
    `, [currentYear]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique season years
router.get('/meta/seasons', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT season_year FROM teams WHERE season_year IS NOT NULL ORDER BY season_year DESC');
    res.json(rows.map(row => row.season_year));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET team with players
router.get('/:id/players', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, t.name as team_name, t.level as team_level
      FROM players p
      JOIN teams t ON p.team_id = t.team_id
      WHERE t.team_id = ?
      ORDER BY p.jersey_number
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new team
router.post('/', async (req, res) => {
  try {
    const { name, level, season_year } = req.body;
    const [result] = await db.query(
      'INSERT INTO teams (name, level, season_year) VALUES (?, ?, ?)',
      [name, level, season_year]
    );
    res.status(201).json({ team_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update team by ID
router.put('/:id', async (req, res) => {
  try {
    const { name, level, season_year } = req.body;
    const [result] = await db.query(
      'UPDATE teams SET name = ?, level = ?, season_year = ? WHERE team_id = ?',
      [name, level, season_year, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Team not found' });
    res.json({ message: 'Team updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE team by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM teams WHERE team_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Team not found' });
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;