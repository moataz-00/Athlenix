const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all audit logs
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0, user_id, start_date, end_date } = req.query;
    
    let query = `
      SELECT al.*, u.name as user_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];
    
    // Add filters
    if (user_id) {
      query += ' AND al.user_id = ?';
      params.push(user_id);
    }
    
    if (start_date) {
      query += ' AND al.log_time >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND al.log_time <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY al.log_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one audit log by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT al.*, u.name as user_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      WHERE al.log_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Audit log not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET audit logs by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const [rows] = await db.query(`
      SELECT al.*, u.name as user_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      WHERE al.user_id = ?
      ORDER BY al.log_time DESC
      LIMIT ? OFFSET ?
    `, [req.params.userId, parseInt(limit), parseInt(offset)]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET audit logs count
router.get('/meta/count', async (req, res) => {
  try {
    const { user_id, start_date, end_date } = req.query;
    
    let query = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }
    
    if (start_date) {
      query += ' AND log_time >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND log_time <= ?';
      params.push(end_date);
    }
    
    const [rows] = await db.query(query, params);
    res.json({ total: rows[0].total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET recent audit logs (last 24 hours)
router.get('/recent/today', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT al.*, u.name as user_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      WHERE al.log_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY al.log_time DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new audit log
router.post('/', async (req, res) => {
  try {
    const { user_id, action } = req.body;
    const [result] = await db.query(
      'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
      [user_id, action]
    );
    res.status(201).json({ log_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Invalid user_id' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE audit log by ID (usually not recommended for audit logs)
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM audit_logs WHERE log_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Audit log not found' });
    res.json({ message: 'Audit log deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE old audit logs (cleanup)
router.delete('/cleanup/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days);
    const [result] = await db.query(
      'DELETE FROM audit_logs WHERE log_time < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    res.json({ 
      message: `Cleanup completed successfully`,
      deleted_count: result.affectedRows 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;