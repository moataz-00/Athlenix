const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all scouting reports
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sr.*, s.first_name, s.last_name 
      FROM scouting_reports sr 
      LEFT JOIN staff s ON sr.scout_id = s.staff_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one scouting report by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sr.*, s.first_name, s.last_name 
      FROM scouting_reports sr 
      LEFT JOIN staff s ON sr.scout_id = s.staff_id 
      WHERE sr.report_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Scouting report not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET scouting reports by scout
router.get('/scout/:scout_id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sr.*, s.first_name, s.last_name 
      FROM scouting_reports sr 
      LEFT JOIN staff s ON sr.scout_id = s.staff_id 
      WHERE sr.scout_id = ?
    `, [req.params.scout_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET scouting reports by position
router.get('/position/:position', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sr.*, s.first_name, s.last_name 
      FROM scouting_reports sr 
      LEFT JOIN staff s ON sr.scout_id = s.staff_id 
      WHERE sr.position = ?
    `, [req.params.position]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET scouting reports by player name
router.get('/player/:name', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sr.*, s.first_name, s.last_name 
      FROM scouting_reports sr 
      LEFT JOIN staff s ON sr.scout_id = s.staff_id 
      WHERE sr.player_name LIKE ?
    `, [`%${req.params.name}%`]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique positions
router.get('/meta/positions', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT position FROM scouting_reports WHERE position IS NOT NULL ORDER BY position');
    res.json(rows.map(row => row.position));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unique scouts
router.get('/meta/scouts', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT sr.scout_id, s.first_name, s.last_name 
      FROM scouting_reports sr 
      LEFT JOIN staff s ON sr.scout_id = s.staff_id 
      WHERE sr.scout_id IS NOT NULL 
      ORDER BY s.first_name, s.last_name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new scouting report
router.post('/', async (req, res) => {
  try {
    const { scout_id, player_name, age, position, evaluation, report_date } = req.body;
    const [result] = await db.query(
      'INSERT INTO scouting_reports (scout_id, player_name, age, position, evaluation, report_date) VALUES (?, ?, ?, ?, ?, ?)',
      [scout_id, player_name, age, position, evaluation, report_date]
    );
    res.status(201).json({ report_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update scouting report by ID
router.put('/:id', async (req, res) => {
  try {
    const { scout_id, player_name, age, position, evaluation, report_date } = req.body;
    const [result] = await db.query(
      'UPDATE scouting_reports SET scout_id = ?, player_name = ?, age = ?, position = ?, evaluation = ?, report_date = ? WHERE report_id = ?',
      [scout_id, player_name, age, position, evaluation, report_date, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Scouting report not found' });
    res.json({ message: 'Scouting report updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE scouting report by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM scouting_reports WHERE report_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Scouting report not found' });
    res.json({ message: 'Scouting report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
