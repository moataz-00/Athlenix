const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all injuries
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, 
             p.first_name, p.last_name, p.position,
             t.name as team_name,
             CASE 
               WHEN i.end_date IS NULL AND i.status = 'Ongoing' THEN DATEDIFF(CURDATE(), i.start_date)
               WHEN i.end_date IS NOT NULL THEN DATEDIFF(i.end_date, i.start_date)
               ELSE NULL
             END as injury_duration_days
      FROM injuries i
      LEFT JOIN players p ON i.player_id = p.player_id
      LEFT JOIN teams t ON p.team_id = t.team_id
      ORDER BY i.start_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one injury by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, 
             p.first_name, p.last_name, p.position,
             t.name as team_name,
             CASE 
               WHEN i.end_date IS NULL AND i.status = 'Ongoing' THEN DATEDIFF(CURDATE(), i.start_date)
               WHEN i.end_date IS NOT NULL THEN DATEDIFF(i.end_date, i.start_date)
               ELSE NULL
             END as injury_duration_days
      FROM injuries i
      LEFT JOIN players p ON i.player_id = p.player_id
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE i.injury_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Injury record not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET injuries by player
router.get('/player/:playerId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, 
             p.first_name, p.last_name, p.position,
             t.name as team_name,
             CASE 
               WHEN i.end_date IS NULL AND i.status = 'Ongoing' THEN DATEDIFF(CURDATE(), i.start_date)
               WHEN i.end_date IS NOT NULL THEN DATEDIFF(i.end_date, i.start_date)
               ELSE NULL
             END as injury_duration_days
      FROM injuries i
      LEFT JOIN players p ON i.player_id = p.player_id
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE i.player_id = ?
      ORDER BY i.start_date DESC
    `, [req.params.playerId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET injuries by status
router.get('/status/:status', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, 
             p.first_name, p.last_name, p.position,
             t.name as team_name,
             CASE 
               WHEN i.end_date IS NULL AND i.status = 'Ongoing' THEN DATEDIFF(CURDATE(), i.start_date)
               WHEN i.end_date IS NOT NULL THEN DATEDIFF(i.end_date, i.start_date)
               ELSE NULL
             END as injury_duration_days
      FROM injuries i
      LEFT JOIN players p ON i.player_id = p.player_id
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE i.status = ?
      ORDER BY i.start_date DESC
    `, [req.params.status]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET injuries by type
router.get('/type/:injuryType', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, 
             p.first_name, p.last_name, p.position,
             t.name as team_name,
             CASE 
               WHEN i.end_date IS NULL AND i.status = 'Ongoing' THEN DATEDIFF(CURDATE(), i.start_date)
               WHEN i.end_date IS NOT NULL THEN DATEDIFF(i.end_date, i.start_date)
               ELSE NULL
             END as injury_duration_days
      FROM injuries i
      LEFT JOIN players p ON i.player_id = p.player_id
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE i.injury_type LIKE ?
      ORDER BY i.start_date DESC
    `, [`%${req.params.injuryType}%`]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET injuries in date range
router.get('/date-range/:startDate/:endDate', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, 
             p.first_name, p.last_name, p.position,
             t.name as team_name,
             CASE 
               WHEN i.end_date IS NULL AND i.status = 'Ongoing' THEN DATEDIFF(CURDATE(), i.start_date)
               WHEN i.end_date IS NOT NULL THEN DATEDIFF(i.end_date, i.start_date)
               ELSE NULL
             END as injury_duration_days
      FROM injuries i
      LEFT JOIN players p ON i.player_id = p.player_id
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE i.start_date BETWEEN ? AND ?
      ORDER BY i.start_date DESC
    `, [req.params.startDate, req.params.endDate]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique injury types
router.get('/meta/types', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT injury_type FROM injuries WHERE injury_type IS NOT NULL ORDER BY injury_type');
    res.json(rows.map(row => row.injury_type));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET injury statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_injuries,
        COUNT(CASE WHEN status = 'Ongoing' THEN 1 END) as ongoing_injuries,
        COUNT(CASE WHEN status = 'Recovered' THEN 1 END) as recovered_injuries,
        COUNT(DISTINCT injury_type) as unique_injury_types,
        COUNT(DISTINCT player_id) as players_with_injuries,
        AVG(CASE 
          WHEN end_date IS NOT NULL THEN DATEDIFF(end_date, start_date)
          WHEN status = 'Ongoing' THEN DATEDIFF(CURDATE(), start_date)
          ELSE NULL
        END) as avg_injury_duration_days
      FROM injuries
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new injury record
router.post('/', async (req, res) => {
  try {
    const { player_id, injury_type, start_date, end_date, status } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO injuries (player_id, injury_type, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
      [player_id || null, injury_type || null, start_date || null, end_date || null, status || 'Ongoing']
    );
    res.status(201).json({ injury_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update injury record by ID
router.put('/:id', async (req, res) => {
  try {
    const { player_id, injury_type, start_date, end_date, status } = req.body;
    
    const [result] = await db.query(
      'UPDATE injuries SET player_id = ?, injury_type = ?, start_date = ?, end_date = ?, status = ? WHERE injury_id = ?',
      [player_id || null, injury_type || null, start_date || null, end_date || null, status || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Injury record not found' });
    res.json({ message: 'Injury record updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH mark injury as recovered
router.patch('/:id/recover', async (req, res) => {
  try {
    const { end_date } = req.body;
    const recoveryDate = end_date || new Date().toISOString().split('T')[0];
    
    const [result] = await db.query(
      'UPDATE injuries SET status = "Recovered", end_date = ? WHERE injury_id = ?',
      [recoveryDate, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Injury record not found' });
    res.json({ message: 'Injury marked as recovered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH reopen injury (mark as ongoing)
router.patch('/:id/reopen', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE injuries SET status = "Ongoing", end_date = NULL WHERE injury_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Injury record not found' });
    res.json({ message: 'Injury reopened successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE injury record by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM injuries WHERE injury_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Injury record not found' });
    res.json({ message: 'Injury record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;