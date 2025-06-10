const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all documents
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, 
             CONCAT(p.first_name, ' ', p.last_name) as player_name,
             CONCAT(s.first_name, ' ', s.last_name) as staff_name
      FROM documents d
      LEFT JOIN players p ON d.player_id = p.player_id
      LEFT JOIN staff s ON d.staff_id = s.staff_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one document by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, 
             CONCAT(p.first_name, ' ', p.last_name) as player_name,
             CONCAT(s.first_name, ' ', s.last_name) as staff_name
      FROM documents d
      LEFT JOIN players p ON d.player_id = p.player_id
      LEFT JOIN staff s ON d.staff_id = s.staff_id
      WHERE d.document_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET documents by player ID
router.get('/player/:playerId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, 
             CONCAT(p.first_name, ' ', p.last_name) as player_name,
             CONCAT(s.first_name, ' ', s.last_name) as staff_name
      FROM documents d
      LEFT JOIN players p ON d.player_id = p.player_id
      LEFT JOIN staff s ON d.staff_id = s.staff_id
      WHERE d.player_id = ?
    `, [req.params.playerId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET documents by staff ID
router.get('/staff/:staffId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, 
             CONCAT(p.first_name, ' ', p.last_name) as player_name,
             CONCAT(s.first_name, ' ', s.last_name) as staff_name
      FROM documents d
      LEFT JOIN players p ON d.player_id = p.player_id
      LEFT JOIN staff s ON d.staff_id = s.staff_id
      WHERE d.staff_id = ?
    `, [req.params.staffId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new document
router.post('/', async (req, res) => {
  try {
    const { player_id, staff_id, file_type, file_path } = req.body;
    const [result] = await db.query(
      'INSERT INTO documents (player_id, staff_id, file_type, file_path) VALUES (?, ?, ?, ?)',
      [player_id, staff_id, file_type, file_path]
    );
    res.status(201).json({ document_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Invalid player_id or staff_id' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update document by ID
router.put('/:id', async (req, res) => {
  try {
    const { player_id, staff_id, file_type, file_path } = req.body;
    const [result] = await db.query(
      'UPDATE documents SET player_id = ?, staff_id = ?, file_type = ?, file_path = ? WHERE document_id = ?',
      [player_id, staff_id, file_type, file_path, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Document updated successfully' });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Invalid player_id or staff_id' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE document by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM documents WHERE document_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;