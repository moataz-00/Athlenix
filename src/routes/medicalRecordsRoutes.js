const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all medical records
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT mr.*, 
             p.first_name as player_first_name,
             p.last_name as player_last_name,
             CONCAT(p.first_name, ' ', p.last_name) as player_full_name,
             s.first_name as doctor_first_name,
             s.last_name as doctor_last_name,
             CONCAT(s.first_name, ' ', s.last_name) as doctor_full_name,
             s.role as doctor_role,
             DATEDIFF(CURDATE(), mr.record_date) as days_since_record
      FROM medical_records mr
      LEFT JOIN players p ON mr.player_id = p.player_id
      LEFT JOIN staff s ON mr.doctor_id = s.staff_id
      ORDER BY mr.record_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one medical record by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT mr.*, 
             p.first_name as player_first_name,
             p.last_name as player_last_name,
             CONCAT(p.first_name, ' ', p.last_name) as player_full_name,
             p.position as player_position,
             s.first_name as doctor_first_name,
             s.last_name as doctor_last_name,
             CONCAT(s.first_name, ' ', s.last_name) as doctor_full_name,
             s.role as doctor_role,
             s.phone as doctor_phone,
             s.email as doctor_email,
             DATEDIFF(CURDATE(), mr.record_date) as days_since_record
      FROM medical_records mr
      LEFT JOIN players p ON mr.player_id = p.player_id
      LEFT JOIN staff s ON mr.doctor_id = s.staff_id
      WHERE mr.record_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Medical record not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET medical records by player
router.get('/player/:playerId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT mr.*, 
             p.first_name as player_first_name,
             p.last_name as player_last_name,
             CONCAT(p.first_name, ' ', p.last_name) as player_full_name,
             s.first_name as doctor_first_name,
             s.last_name as doctor_last_name,
             CONCAT(s.first_name, ' ', s.last_name) as doctor_full_name,
             s.role as doctor_role,
             DATEDIFF(CURDATE(), mr.record_date) as days_since_record
      FROM medical_records mr
      LEFT JOIN players p ON mr.player_id = p.player_id
      LEFT JOIN staff s ON mr.doctor_id = s.staff_id
      WHERE mr.player_id = ?
      ORDER BY mr.record_date DESC
    `, [req.params.playerId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET medical records by doctor
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT mr.*, 
             p.first_name as player_first_name,
             p.last_name as player_last_name,
             CONCAT(p.first_name, ' ', p.last_name) as player_full_name,
             p.position as player_position,
             s.first_name as doctor_first_name,
             s.last_name as doctor_last_name,
             CONCAT(s.first_name, ' ', s.last_name) as doctor_full_name,
             DATEDIFF(CURDATE(), mr.record_date) as days_since_record
      FROM medical_records mr
      LEFT JOIN players p ON mr.player_id = p.player_id
      LEFT JOIN staff s ON mr.doctor_id = s.staff_id
      WHERE mr.doctor_id = ?
      ORDER BY mr.record_date DESC
    `, [req.params.doctorId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET medical records in date range
router.get('/date-range/:startDate/:endDate', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT mr.*, 
             p.first_name as player_first_name,
             p.last_name as player_last_name,
             CONCAT(p.first_name, ' ', p.last_name) as player_full_name,
             s.first_name as doctor_first_name,
             s.last_name as doctor_last_name,
             CONCAT(s.first_name, ' ', s.last_name) as doctor_full_name,
             DATEDIFF(CURDATE(), mr.record_date) as days_since_record
      FROM medical_records mr
      LEFT JOIN players p ON mr.player_id = p.player_id
      LEFT JOIN staff s ON mr.doctor_id = s.staff_id
      WHERE mr.record_date BETWEEN ? AND ?
      ORDER BY mr.record_date DESC
    `, [req.params.startDate, req.params.endDate]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET recent medical records
router.get('/recent/all', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT mr.*, 
             p.first_name as player_first_name,
             p.last_name as player_last_name,
             CONCAT(p.first_name, ' ', p.last_name) as player_full_name,
             s.first_name as doctor_first_name,
             s.last_name as doctor_last_name,
             CONCAT(s.first_name, ' ', s.last_name) as doctor_full_name,
             DATEDIFF(CURDATE(), mr.record_date) as days_since_record
      FROM medical_records mr
      LEFT JOIN players p ON mr.player_id = p.player_id
      LEFT JOIN staff s ON mr.doctor_id = s.staff_id
      WHERE mr.record_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      ORDER BY mr.record_date DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET medical records by diagnosis keyword
router.get('/diagnosis/:keyword', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT mr.*, 
             p.first_name as player_first_name,
             p.last_name as player_last_name,
             CONCAT(p.first_name, ' ', p.last_name) as player_full_name,
             s.first_name as doctor_first_name,
             s.last_name as doctor_last_name,
             CONCAT(s.first_name, ' ', s.last_name) as doctor_full_name,
             DATEDIFF(CURDATE(), mr.record_date) as days_since_record
      FROM medical_records mr
      LEFT JOIN players p ON mr.player_id = p.player_id
      LEFT JOIN staff s ON mr.doctor_id = s.staff_id
      WHERE mr.diagnosis LIKE ?
      ORDER BY mr.record_date DESC
    `, [`%${req.params.keyword}%`]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET medical records statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT player_id) as unique_players,
        COUNT(DISTINCT doctor_id) as unique_doctors,
        COUNT(CASE WHEN record_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as records_last_30_days,
        COUNT(CASE WHEN record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as records_last_7_days,
        AVG(DATEDIFF(CURDATE(), record_date)) as avg_days_since_record
      FROM medical_records
      WHERE record_date IS NOT NULL
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET player medical history summary
router.get('/stats/player/:playerId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT doctor_id) as doctors_seen,
        MIN(record_date) as first_record_date,
        MAX(record_date) as latest_record_date,
        COUNT(CASE WHEN record_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as records_last_30_days,
        AVG(DATEDIFF(CURDATE(), record_date)) as avg_days_since_record
      FROM medical_records
      WHERE player_id = ? AND record_date IS NOT NULL
    `, [req.params.playerId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new medical record
router.post('/', async (req, res) => {
  try {
    const { player_id, diagnosis, treatment, doctor_id, record_date } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO medical_records (player_id, diagnosis, treatment, doctor_id, record_date) VALUES (?, ?, ?, ?, ?)',
      [player_id || null, diagnosis || null, treatment || null, doctor_id || null, record_date || null]
    );
    res.status(201).json({ record_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update medical record by ID
router.put('/:id', async (req, res) => {
  try {
    const { player_id, diagnosis, treatment, doctor_id, record_date } = req.body;
    
    const [result] = await db.query(
      'UPDATE medical_records SET player_id = ?, diagnosis = ?, treatment = ?, doctor_id = ?, record_date = ? WHERE record_id = ?',
      [player_id || null, diagnosis || null, treatment || null, doctor_id || null, record_date || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Medical record not found' });
    res.json({ message: 'Medical record updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update diagnosis and treatment
router.patch('/:id/medical-info', async (req, res) => {
  try {
    const { diagnosis, treatment } = req.body;
    if (!diagnosis && !treatment) {
      return res.status(400).json({ error: 'Either diagnosis or treatment is required' });
    }
    
    const updateFields = [];
    const values = [];
    
    if (diagnosis !== undefined) {
      updateFields.push('diagnosis = ?');
      values.push(diagnosis);
    }
    if (treatment !== undefined) {
      updateFields.push('treatment = ?');
      values.push(treatment);
    }
    
    values.push(req.params.id);
    
    const [result] = await db.query(
      `UPDATE medical_records SET ${updateFields.join(', ')} WHERE record_id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Medical record not found' });
    res.json({ message: 'Medical information updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update record date
router.patch('/:id/date', async (req, res) => {
  try {
    const { record_date } = req.body;
    if (!record_date) return res.status(400).json({ error: 'Record date is required' });
    
    const [result] = await db.query(
      'UPDATE medical_records SET record_date = ? WHERE record_id = ?',
      [record_date, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Medical record not found' });
    res.json({ message: 'Record date updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE medical record by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM medical_records WHERE record_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Medical record not found' });
    res.json({ message: 'Medical record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;