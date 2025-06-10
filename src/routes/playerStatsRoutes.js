const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all player stats
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ps.*, 
             p.first_name as player_first_name, 
             p.last_name as player_last_name,
             p.position,
             m.opponent, 
             m.match_date,
             m.home_team,
             m.away_team
      FROM player_stats ps
      LEFT JOIN players p ON ps.player_id = p.player_id
      LEFT JOIN matches m ON ps.match_id = m.match_id
      ORDER BY m.match_date DESC, p.last_name, p.first_name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one player stat record by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ps.*, 
             p.first_name as player_first_name, 
             p.last_name as player_last_name,
             p.position,
             m.opponent, 
             m.match_date,
             m.home_team,
             m.away_team
      FROM player_stats ps
      LEFT JOIN players p ON ps.player_id = p.player_id
      LEFT JOIN matches m ON ps.match_id = m.match_id
      WHERE ps.stat_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Player stats record not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all stats for a specific player
router.get('/player/:playerId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ps.*, 
             m.opponent, 
             m.match_date,
             m.home_team,
             m.away_team
      FROM player_stats ps
      LEFT JOIN matches m ON ps.match_id = m.match_id
      WHERE ps.player_id = ?
      ORDER BY m.match_date DESC
    `, [req.params.playerId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all stats for a specific match
router.get('/match/:matchId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ps.*, 
             p.first_name as player_first_name, 
             p.last_name as player_last_name,
             p.position
      FROM player_stats ps
      LEFT JOIN players p ON ps.player_id = p.player_id
      WHERE ps.match_id = ?
      ORDER BY ps.rating DESC, p.last_name, p.first_name
    `, [req.params.matchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET player season stats summary
router.get('/player/:playerId/season-summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.first_name,
        p.last_name,
        p.position,
        COUNT(ps.stat_id) as matches_played,
        COALESCE(SUM(ps.goals), 0) as total_goals,
        COALESCE(SUM(ps.assists), 0) as total_assists,
        COALESCE(SUM(ps.yellow_cards), 0) as total_yellow_cards,
        COALESCE(SUM(ps.red_cards), 0) as total_red_cards,
        COALESCE(AVG(ps.rating), 0) as average_rating,
        COALESCE(MAX(ps.rating), 0) as best_rating,
        COALESCE(MIN(ps.rating), 0) as worst_rating
      FROM players p
      LEFT JOIN player_stats ps ON p.player_id = ps.player_id
      WHERE p.player_id = ?
      GROUP BY p.player_id, p.first_name, p.last_name, p.position
    `, [req.params.playerId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Player not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET top scorers
router.get('/leaderboard/top-scorers/:limit?', async (req, res) => {
  try {
    const limit = req.params.limit || 10;
    const [rows] = await db.query(`
      SELECT 
        p.first_name,
        p.last_name,
        p.position,
        COALESCE(SUM(ps.goals), 0) as total_goals,
        COUNT(ps.stat_id) as matches_played,
        ROUND(COALESCE(SUM(ps.goals), 0) / COUNT(ps.stat_id), 2) as goals_per_match
      FROM players p
      LEFT JOIN player_stats ps ON p.player_id = ps.player_id
      GROUP BY p.player_id, p.first_name, p.last_name, p.position
      HAVING total_goals > 0
      ORDER BY total_goals DESC, goals_per_match DESC
      LIMIT ?
    `, [parseInt(limit)]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET top assist providers
router.get('/leaderboard/top-assists/:limit?', async (req, res) => {
  try {
    const limit = req.params.limit || 10;
    const [rows] = await db.query(`
      SELECT 
        p.first_name,
        p.last_name,
        p.position,
        COALESCE(SUM(ps.assists), 0) as total_assists,
        COUNT(ps.stat_id) as matches_played,
        ROUND(COALESCE(SUM(ps.assists), 0) / COUNT(ps.stat_id), 2) as assists_per_match
      FROM players p
      LEFT JOIN player_stats ps ON p.player_id = ps.player_id
      GROUP BY p.player_id, p.first_name, p.last_name, p.position
      HAVING total_assists > 0
      ORDER BY total_assists DESC, assists_per_match DESC
      LIMIT ?
    `, [parseInt(limit)]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET highest rated players
router.get('/leaderboard/top-rated/:limit?', async (req, res) => {
  try {
    const limit = req.params.limit || 10;
    const [rows] = await db.query(`
      SELECT 
        p.first_name,
        p.last_name,
        p.position,
        ROUND(AVG(ps.rating), 1) as average_rating,
        COUNT(ps.stat_id) as matches_played
      FROM players p
      INNER JOIN player_stats ps ON p.player_id = ps.player_id
      WHERE ps.rating IS NOT NULL
      GROUP BY p.player_id, p.first_name, p.last_name, p.position
      HAVING matches_played >= 3
      ORDER BY average_rating DESC
      LIMIT ?
    `, [parseInt(limit)]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET match statistics summary
router.get('/match/:matchId/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        m.opponent,
        m.match_date,
        m.home_team,
        m.away_team,
        COUNT(ps.stat_id) as players_with_stats,
        COALESCE(SUM(ps.goals), 0) as total_goals,
        COALESCE(SUM(ps.assists), 0) as total_assists,
        COALESCE(SUM(ps.yellow_cards), 0) as total_yellow_cards,
        COALESCE(SUM(ps.red_cards), 0) as total_red_cards,
        ROUND(AVG(ps.rating), 1) as average_team_rating,
        MAX(ps.rating) as highest_individual_rating
      FROM matches m
      LEFT JOIN player_stats ps ON m.match_id = ps.match_id
      WHERE m.match_id = ?
      GROUP BY m.match_id, m.opponent, m.match_date, m.home_team, m.away_team
    `, [req.params.matchId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET team season overview
router.get('/team/season-overview', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(DISTINCT ps.match_id) as total_matches,
        COUNT(DISTINCT ps.player_id) as players_used,
        COALESCE(SUM(ps.goals), 0) as total_goals,
        COALESCE(SUM(ps.assists), 0) as total_assists,
        COALESCE(SUM(ps.yellow_cards), 0) as total_yellow_cards,
        COALESCE(SUM(ps.red_cards), 0) as total_red_cards,
        ROUND(AVG(ps.rating), 1) as average_team_rating,
        ROUND(COALESCE(SUM(ps.goals), 0) / COUNT(DISTINCT ps.match_id), 2) as goals_per_match
      FROM player_stats ps
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new player stats record
router.post('/', async (req, res) => {
  try {
    const { player_id, match_id, goals = 0, assists = 0, yellow_cards = 0, red_cards = 0, rating } = req.body;
    const [result] = await db.query(
      'INSERT INTO player_stats (player_id, match_id, goals, assists, yellow_cards, red_cards, rating) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [player_id, match_id, goals, assists, yellow_cards, red_cards, rating]
    );
    res.status(201).json({ stat_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update player stats by ID
router.put('/:id', async (req, res) => {
  try {
    const { player_id, match_id, goals, assists, yellow_cards, red_cards, rating } = req.body;
    const [result] = await db.query(
      'UPDATE player_stats SET player_id = ?, match_id = ?, goals = ?, assists = ?, yellow_cards = ?, red_cards = ?, rating = ? WHERE stat_id = ?',
      [player_id, match_id, goals, assists, yellow_cards, red_cards, rating, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Player stats record not found' });
    res.json({ message: 'Player stats updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE player stats by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM player_stats WHERE stat_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Player stats record not found' });
    res.json({ message: 'Player stats deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;