const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all player progress records
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pp.*, 
             p.first_name as player_first_name, 
             p.last_name as player_last_name,
             p.position
      FROM player_progress pp
      LEFT JOIN players p ON pp.player_id = p.player_id
      ORDER BY pp.date_recorded DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one player progress record by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pp.*, 
             p.first_name as player_first_name, 
             p.last_name as player_last_name,
             p.position
      FROM player_progress pp
      LEFT JOIN players p ON pp.player_id = p.player_id
      WHERE pp.progress_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Player progress record not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all progress records for a specific player
router.get('/player/:playerId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pp.*, 
             p.first_name as player_first_name, 
             p.last_name as player_last_name
      FROM player_progress pp
      LEFT JOIN players p ON pp.player_id = p.player_id
      WHERE pp.player_id = ?
      ORDER BY pp.date_recorded DESC
    `, [req.params.playerId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET progress records by date range
router.get('/date-range/:startDate/:endDate', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pp.*, 
             p.first_name as player_first_name, 
             p.last_name as player_last_name,
             p.position
      FROM player_progress pp
      LEFT JOIN players p ON pp.player_id = p.player_id
      WHERE pp.date_recorded BETWEEN ? AND ?
      ORDER BY pp.date_recorded DESC
    `, [req.params.startDate, req.params.endDate]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET progress records for a specific date
router.get('/date/:date', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pp.*, 
             p.first_name as player_first_name, 
             p.last_name as player_last_name,
             p.position
      FROM player_progress pp
      LEFT JOIN players p ON pp.player_id = p.player_id
      WHERE pp.date_recorded = ?
      ORDER BY p.last_name, p.first_name
    `, [req.params.date]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET latest progress record for each player
router.get('/latest/all-players', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pp.*, 
             p.first_name as player_first_name, 
             p.last_name as player_last_name,
             p.position
      FROM player_progress pp
      LEFT JOIN players p ON pp.player_id = p.player_id
      WHERE pp.date_recorded = (
        SELECT MAX(date_recorded)
        FROM player_progress pp2
        WHERE pp2.player_id = pp.player_id
      )
      ORDER BY p.last_name, p.first_name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET latest progress record for a specific player
router.get('/player/:playerId/latest', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pp.*, 
             p.first_name as player_first_name, 
             p.last_name as player_last_name,
             p.position
      FROM player_progress pp
      LEFT JOIN players p ON pp.player_id = p.player_id
      WHERE pp.player_id = ?
      ORDER BY pp.date_recorded DESC
      LIMIT 1
    `, [req.params.playerId]);
    if (rows.length === 0) return res.status(404).json({ error: 'No progress records found for this player' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET progress summary for a player
router.get('/player/:playerId/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_records,
        MIN(date_recorded) as first_record_date,
        MAX(date_recorded) as latest_record_date,
        DATEDIFF(MAX(date_recorded), MIN(date_recorded)) as tracking_period_days
      FROM player_progress
      WHERE player_id = ?
    `, [req.params.playerId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET progress records for current month
router.get('/current-month', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pp.*, 
             p.first_name as player_first_name, 
             p.last_name as player_last_name,
             p.position
      FROM player_progress pp
      LEFT JOIN players p ON pp.player_id = p.player_id
      WHERE MONTH(pp.date_recorded) = MONTH(CURDATE()) 
      AND YEAR(pp.date_recorded) = YEAR(CURDATE())
      ORDER BY pp.date_recorded DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new progress record
router.post('/', async (req, res) => {
  try {
    const { player_id, progress_note, date_recorded } = req.body;
    const [result] = await db.query(
      'INSERT INTO player_progress (player_id, progress_note, date_recorded) VALUES (?, ?, ?)',
      [player_id, progress_note, date_recorded || new Date().toISOString().split('T')[0]]
    );
    res.status(201).json({ progress_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update progress record by ID
router.put('/:id', async (req, res) => {
  try {
    const { player_id, progress_note, date_recorded } = req.body;
    const [result] = await db.query(
      'UPDATE player_progress SET player_id = ?, progress_note = ?, date_recorded = ? WHERE progress_id = ?',
      [player_id, progress_note, date_recorded, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Player progress record not found' });
    res.json({ message: 'Player progress record updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE progress record by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM player_progress WHERE progress_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Player progress record not found' });
    res.json({ message: 'Player progress record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;