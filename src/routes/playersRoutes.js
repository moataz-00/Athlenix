const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all players
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, t.name as team_name, t.level as team_level, t.season_year as team_season
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      ORDER BY p.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one player by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, t.name as team_name, t.level as team_level, t.season_year as team_season
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.player_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Player not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET players by team ID
router.get('/team/:teamId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, t.name as team_name, t.level as team_level, t.season_year as team_season
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.team_id = ?
      ORDER BY p.jersey_number, p.name
    `, [req.params.teamId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET players by position
router.get('/position/:position', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, t.name as team_name, t.level as team_level, t.season_year as team_season
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.position = ?
      ORDER BY p.name
    `, [req.params.position]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET players by jersey number
router.get('/jersey/:number', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, t.name as team_name, t.level as team_level, t.season_year as team_season
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.jersey_number = ?
      ORDER BY p.name
    `, [req.params.number]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET players by age range
router.get('/age/:minAge/:maxAge', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, 
             t.name as team_name, 
             t.level as team_level, 
             t.season_year as team_season,
             FLOOR(DATEDIFF(CURDATE(), p.dob) / 365.25) as age
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.dob IS NOT NULL
      HAVING age BETWEEN ? AND ?
      ORDER BY age, p.name
    `, [req.params.minAge, req.params.maxAge]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET players without team (free agents)
router.get('/free-agents/list', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, 
             FLOOR(DATEDIFF(CURDATE(), p.dob) / 365.25) as age
      FROM players p
      WHERE p.team_id IS NULL
      ORDER BY p.position, p.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique positions
router.get('/meta/positions', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT position FROM players WHERE position IS NOT NULL ORDER BY position');
    res.json(rows.map(row => row.position));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET player statistics/summary
router.get('/stats/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_players,
        COUNT(CASE WHEN team_id IS NOT NULL THEN 1 END) as players_with_team,
        COUNT(CASE WHEN team_id IS NULL THEN 1 END) as free_agents,
        AVG(CASE WHEN height_cm IS NOT NULL THEN height_cm END) as avg_height_cm,
        AVG(CASE WHEN weight_kg IS NOT NULL THEN weight_kg END) as avg_weight_kg,
        AVG(CASE WHEN dob IS NOT NULL THEN FLOOR(DATEDIFF(CURDATE(), dob) / 365.25) END) as avg_age
      FROM players
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET players by height range
router.get('/height/:minHeight/:maxHeight', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, t.name as team_name, t.level as team_level, t.season_year as team_season
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.height_cm BETWEEN ? AND ?
      ORDER BY p.height_cm DESC, p.name
    `, [req.params.minHeight, req.params.maxHeight]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new player
router.post('/', async (req, res) => {
  try {
    const { team_id, name, dob, position, jersey_number, height_cm, weight_kg } = req.body;
    
    // Check if jersey number is already taken in the team (if team_id is provided)
    if (team_id && jersey_number) {
      const [existing] = await db.query(
        'SELECT player_id FROM players WHERE team_id = ? AND jersey_number = ?',
        [team_id, jersey_number]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Jersey number already taken in this team' });
      }
    }
    
    const [result] = await db.query(
      'INSERT INTO players (team_id, name, dob, position, jersey_number, height_cm, weight_kg) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [team_id || null, name, dob || null, position || null, jersey_number || null, height_cm || null, weight_kg || null]
    );
    res.status(201).json({ player_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update player by ID
router.put('/:id', async (req, res) => {
  try {
    const { team_id, name, dob, position, jersey_number, height_cm, weight_kg } = req.body;
    
    // Check if jersey number is already taken in the team (if team_id is provided)
    if (team_id && jersey_number) {
      const [existing] = await db.query(
        'SELECT player_id FROM players WHERE team_id = ? AND jersey_number = ? AND player_id != ?',
        [team_id, jersey_number, req.params.id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Jersey number already taken in this team' });
      }
    }
    
    const [result] = await db.query(
      'UPDATE players SET team_id = ?, name = ?, dob = ?, position = ?, jersey_number = ?, height_cm = ?, weight_kg = ? WHERE player_id = ?',
      [team_id || null, name, dob || null, position || null, jersey_number || null, height_cm || null, weight_kg || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Player not found' });
    res.json({ message: 'Player updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH assign player to team
router.patch('/:id/assign-team', async (req, res) => {
  try {
    const { team_id, jersey_number } = req.body;
    
    // Check if jersey number is already taken in the team
    if (jersey_number) {
      const [existing] = await db.query(
        'SELECT player_id FROM players WHERE team_id = ? AND jersey_number = ?',
        [team_id, jersey_number]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Jersey number already taken in this team' });
      }
    }
    
    const [result] = await db.query(
      'UPDATE players SET team_id = ?, jersey_number = ? WHERE player_id = ?',
      [team_id, jersey_number || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Player not found' });
    res.json({ message: 'Player assigned to team successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH remove player from team (make free agent)
router.patch('/:id/remove-team', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE players SET team_id = NULL, jersey_number = NULL WHERE player_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Player not found' });
    res.json({ message: 'Player removed from team successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE player by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM players WHERE player_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Player not found' });
    res.json({ message: 'Player deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;