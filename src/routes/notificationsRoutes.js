const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all notifications
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one notification by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notifications WHERE notification_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET notifications by user
router.get('/user/:userId', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [req.params.userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unread notifications by user
router.get('/user/:userId/unread', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC', [req.params.userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new notification
router.post('/', async (req, res) => {
  try {
    const { user_id, message, is_read = 0 } = req.body;
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, ?)',
      [user_id, message, is_read]
    );
    res.status(201).json({ notification_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update notification by ID
router.put('/:id', async (req, res) => {
  try {
    const { user_id, message, is_read } = req.body;
    const [result] = await db.query(
      'UPDATE notifications SET user_id = ?, message = ?, is_read = ? WHERE notification_id = ?',
      [user_id, message, is_read, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE notifications SET is_read = 1 WHERE notification_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT mark all notifications as read for a user
router.put('/user/:userId/read-all', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.params.userId]
    );
    res.json({ message: `${result.affectedRows} notifications marked as read` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE notification by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM notifications WHERE notification_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;