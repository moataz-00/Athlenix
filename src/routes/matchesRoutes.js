const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all matches
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, 
             t.name as team_name,
             CASE 
               WHEN m.team_score > m.opponent_score THEN 'Win'
               WHEN m.team_score < m.opponent_score THEN 'Loss'
               WHEN m.team_score = m.opponent_score THEN 'Draw'
               ELSE 'Unknown'
             END as match_result,
             ABS(m.team_score - m.opponent_score) as score_difference,
             DATEDIFF(CURDATE(), m.match_date) as days_since_match
      FROM matches m
      LEFT JOIN teams t ON m.team_id = t.team_id
      ORDER BY m.match_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one match by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, 
             t.name as team_name,
             CASE 
               WHEN m.team_score > m.opponent_score THEN 'Win'
               WHEN m.team_score < m.opponent_score THEN 'Loss'
               WHEN m.team_score = m.opponent_score THEN 'Draw'
               ELSE 'Unknown'
             END as match_result,
             ABS(m.team_score - m.opponent_score) as score_difference,
             DATEDIFF(CURDATE(), m.match_date) as days_since_match
      FROM matches m
      LEFT JOIN teams t ON m.team_id = t.team_id
      WHERE m.match_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET matches by team
router.get('/team/:teamId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, 
             t.name as team_name,
             CASE 
               WHEN m.team_score > m.opponent_score THEN 'Win'
               WHEN m.team_score < m.opponent_score THEN 'Loss'
               WHEN m.team_score = m.opponent_score THEN 'Draw'
               ELSE 'Unknown'
             END as match_result,
             ABS(m.team_score - m.opponent_score) as score_difference,
             DATEDIFF(CURDATE(), m.match_date) as days_since_match
      FROM matches m
      LEFT JOIN teams t ON m.team_id = t.team_id
      WHERE m.team_id = ?
      ORDER BY m.match_date DESC
    `, [req.params.teamId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET matches by home/away
router.get('/venue/:homeOrAway', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, 
             t.name as team_name,
             CASE 
               WHEN m.team_score > m.opponent_score THEN 'Win'
               WHEN m.team_score < m.opponent_score THEN 'Loss'
               WHEN m.team_score = m.opponent_score THEN 'Draw'
               ELSE 'Unknown'
             END as match_result,
             ABS(m.team_score - m.opponent_score) as score_difference,
             DATEDIFF(CURDATE(), m.match_date) as days_since_match
      FROM matches m
      LEFT JOIN teams t ON m.team_id = t.team_id
      WHERE m.home_or_away = ?
      ORDER BY m.match_date DESC
    `, [req.params.homeOrAway]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET matches by opponent
router.get('/opponent/:opponentName', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, 
             t.name as team_name,
             CASE 
               WHEN m.team_score > m.opponent_score THEN 'Win'
               WHEN m.team_score < m.opponent_score THEN 'Loss'
               WHEN m.team_score = m.opponent_score THEN 'Draw'
               ELSE 'Unknown'
             END as match_result,
             ABS(m.team_score - m.opponent_score) as score_difference,
             DATEDIFF(CURDATE(), m.match_date) as days_since_match
      FROM matches m
      LEFT JOIN teams t ON m.team_id = t.team_id
      WHERE m.opponent_name LIKE ?
      ORDER BY m.match_date DESC
    `, [`%${req.params.opponentName}%`]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET matches in date range
router.get('/date-range/:startDate/:endDate', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, 
             t.name as team_name,
             CASE 
               WHEN m.team_score > m.opponent_score THEN 'Win'
               WHEN m.team_score < m.opponent_score THEN 'Loss'
               WHEN m.team_score = m.opponent_score THEN 'Draw'
               ELSE 'Unknown'
             END as match_result,
             ABS(m.team_score - m.opponent_score) as score_difference,
             DATEDIFF(CURDATE(), m.match_date) as days_since_match
      FROM matches m
      LEFT JOIN teams t ON m.team_id = t.team_id
      WHERE m.match_date BETWEEN ? AND ?
      ORDER BY m.match_date DESC
    `, [req.params.startDate, req.params.endDate]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET upcoming matches
router.get('/upcoming/all', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, 
             t.name as team_name,
             DATEDIFF(m.match_date, CURDATE()) as days_until_match
      FROM matches m
      LEFT JOIN teams t ON m.team_id = t.team_id
      WHERE m.match_date > CURDATE()
      ORDER BY m.match_date ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET recent matches
router.get('/recent/all', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, 
             t.name as team_name,
             CASE 
               WHEN m.team_score > m.opponent_score THEN 'Win'
               WHEN m.team_score < m.opponent_score THEN 'Loss'
               WHEN m.team_score = m.opponent_score THEN 'Draw'
               ELSE 'Unknown'
             END as match_result,
             ABS(m.team_score - m.opponent_score) as score_difference,
             DATEDIFF(CURDATE(), m.match_date) as days_since_match
      FROM matches m
      LEFT JOIN teams t ON m.team_id = t.team_id
      WHERE m.match_date <= CURDATE() AND m.team_score IS NOT NULL AND m.opponent_score IS NOT NULL
      ORDER BY m.match_date DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique opponents
router.get('/meta/opponents', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT opponent_name FROM matches WHERE opponent_name IS NOT NULL ORDER BY opponent_name');
    res.json(rows.map(row => row.opponent_name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET match statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_matches,
        COUNT(CASE WHEN team_score > opponent_score THEN 1 END) as wins,
        COUNT(CASE WHEN team_score < opponent_score THEN 1 END) as losses,
        COUNT(CASE WHEN team_score = opponent_score THEN 1 END) as draws,
        COUNT(CASE WHEN home_or_away = 'Home' THEN 1 END) as home_matches,
        COUNT(CASE WHEN home_or_away = 'Away' THEN 1 END) as away_matches,
        AVG(team_score) as avg_team_score,
        AVG(opponent_score) as avg_opponent_score,
        COUNT(DISTINCT opponent_name) as unique_opponents,
        COUNT(CASE WHEN match_date > CURDATE() THEN 1 END) as upcoming_matches
      FROM matches
      WHERE team_score IS NOT NULL AND opponent_score IS NOT NULL
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET team statistics
router.get('/stats/team/:teamId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_matches,
        COUNT(CASE WHEN team_score > opponent_score THEN 1 END) as wins,
        COUNT(CASE WHEN team_score < opponent_score THEN 1 END) as losses,
        COUNT(CASE WHEN team_score = opponent_score THEN 1 END) as draws,
        COUNT(CASE WHEN home_or_away = 'Home' THEN 1 END) as home_matches,
        COUNT(CASE WHEN home_or_away = 'Away' THEN 1 END) as away_matches,
        AVG(team_score) as avg_team_score,
        AVG(opponent_score) as avg_opponent_score,
        MAX(team_score) as highest_score,
        MIN(team_score) as lowest_score
      FROM matches
      WHERE team_id = ? AND team_score IS NOT NULL AND opponent_score IS NOT NULL
    `, [req.params.teamId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new match
router.post('/', async (req, res) => {
  try {
    const { team_id, opponent_name, location, match_date, home_or_away, team_score, opponent_score } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO matches (team_id, opponent_name, location, match_date, home_or_away, team_score, opponent_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [team_id || null, opponent_name || null, location || null, match_date || null, home_or_away || null, team_score || null, opponent_score || null]
    );
    res.status(201).json({ match_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update match by ID
router.put('/:id', async (req, res) => {
  try {
    const { team_id, opponent_name, location, match_date, home_or_away, team_score, opponent_score } = req.body;
    
    const [result] = await db.query(
      'UPDATE matches SET team_id = ?, opponent_name = ?, location = ?, match_date = ?, home_or_away = ?, team_score = ?, opponent_score = ? WHERE match_id = ?',
      [team_id || null, opponent_name || null, location || null, match_date || null, home_or_away || null, team_score || null, opponent_score || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Match not found' });
    res.json({ message: 'Match updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update match score
router.patch('/:id/score', async (req, res) => {
  try {
    const { team_score, opponent_score } = req.body;
    if (team_score === undefined || opponent_score === undefined) {
      return res.status(400).json({ error: 'Both team_score and opponent_score are required' });
    }
    
    const [result] = await db.query(
      'UPDATE matches SET team_score = ?, opponent_score = ? WHERE match_id = ?',
      [team_score, opponent_score, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Match not found' });
    res.json({ message: 'Match score updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH reschedule match
router.patch('/:id/reschedule', async (req, res) => {
  try {
    const { match_date, location } = req.body;
    if (!match_date) return res.status(400).json({ error: 'Match date is required' });
    
    const [result] = await db.query(
      'UPDATE matches SET match_date = ?, location = COALESCE(?, location) WHERE match_id = ?',
      [match_date, location, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Match not found' });
    res.json({ message: 'Match rescheduled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE match by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM matches WHERE match_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Match not found' });
    res.json({ message: 'Match deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;