const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all permission levels
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pl.*,
             COUNT(u.user_id) as users_count
      FROM permission_levels pl
      LEFT JOIN users u ON pl.level_id = u.permission_level_id
      GROUP BY pl.level_id
      ORDER BY pl.name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one permission level by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pl.*,
             COUNT(u.user_id) as users_count
      FROM permission_levels pl
      LEFT JOIN users u ON pl.level_id = u.permission_level_id
      WHERE pl.level_id = ?
      GROUP BY pl.level_id
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Permission level not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET permission level by name
router.get('/name/:name', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pl.*,
             COUNT(u.user_id) as users_count
      FROM permission_levels pl
      LEFT JOIN users u ON pl.level_id = u.permission_level_id
      WHERE pl.name = ?
      GROUP BY pl.level_id
    `, [req.params.name]);
    if (rows.length === 0) return res.status(404).json({ error: 'Permission level not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET users with specific permission level
router.get('/:id/users', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, 
             u.created_at, u.last_login,
             pl.name as permission_level_name
      FROM users u
      INNER JOIN permission_levels pl ON u.permission_level_id = pl.level_id
      WHERE pl.level_id = ?
      ORDER BY u.last_name, u.first_name
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET permission level statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_permission_levels,
        COUNT(CASE WHEN u.user_id IS NOT NULL THEN 1 END) as levels_with_users,
        COUNT(CASE WHEN u.user_id IS NULL THEN 1 END) as levels_without_users
      FROM permission_levels pl
      LEFT JOIN users u ON pl.level_id = u.permission_level_id
    `);
    
    const [userStats] = await db.query(`
      SELECT 
        pl.name as permission_level_name,
        COUNT(u.user_id) as user_count
      FROM permission_levels pl
      LEFT JOIN users u ON pl.level_id = u.permission_level_id
      GROUP BY pl.level_id, pl.name
      ORDER BY user_count DESC
    `);
    
    res.json({
      summary: rows[0],
      distribution: userStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unused permission levels (no users assigned)
router.get('/unused/list', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pl.*
      FROM permission_levels pl
      LEFT JOIN users u ON pl.level_id = u.permission_level_id
      WHERE u.user_id IS NULL
      ORDER BY pl.name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new permission level
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Permission level name is required' });
    
    // Check if name already exists (case-insensitive)
    const [existing] = await db.query('SELECT level_id FROM permission_levels WHERE LOWER(name) = LOWER(?)', [name]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Permission level name already exists' });
    }
    
    const [result] = await db.query('INSERT INTO permission_levels (name) VALUES (?)', [name]);
    res.status(201).json({ level_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update permission level by ID
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Permission level name is required' });
    
    // Check if name already exists (excluding current record)
    const [existing] = await db.query('SELECT level_id FROM permission_levels WHERE LOWER(name) = LOWER(?) AND level_id != ?', [name, req.params.id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Permission level name already exists' });
    }
    
    const [result] = await db.query('UPDATE permission_levels SET name = ? WHERE level_id = ?', [name, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Permission level not found' });
    res.json({ message: 'Permission level updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH bulk assign users to permission level
router.patch('/:id/assign-users', async (req, res) => {
  try {
    const { user_ids } = req.body;
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'Array of user IDs is required' });
    }
    
    // Check if permission level exists
    const [levelCheck] = await db.query('SELECT level_id FROM permission_levels WHERE level_id = ?', [req.params.id]);
    if (levelCheck.length === 0) {
      return res.status(404).json({ error: 'Permission level not found' });
    }
    
    // Validate all user IDs exist
    const placeholders = user_ids.map(() => '?').join(',');
    const [userCheck] = await db.query(`SELECT user_id FROM users WHERE user_id IN (${placeholders})`, user_ids);
    if (userCheck.length !== user_ids.length) {
      return res.status(400).json({ error: 'One or more user IDs not found' });
    }
    
    // Update all users
    const [result] = await db.query(
      `UPDATE users SET permission_level_id = ? WHERE user_id IN (${placeholders})`,
      [req.params.id, ...user_ids]
    );
    
    res.json({ 
      message: 'Users assigned to permission level successfully',
      affected_users: result.affectedRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE permission level by ID
router.delete('/:id', async (req, res) => {
  try {
    // Check if permission level has users assigned
    const [userCheck] = await db.query('SELECT COUNT(*) as count FROM users WHERE permission_level_id = ?', [req.params.id]);
    if (userCheck[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete permission level with assigned users',
        assigned_users: userCheck[0].count
      });
    }
    
    const [result] = await db.query('DELETE FROM permission_levels WHERE level_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Permission level not found' });
    res.json({ message: 'Permission level deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE force delete permission level (reassign users to default level)
router.delete('/:id/force', async (req, res) => {
  try {
    const { default_level_id } = req.body;
    
    // Check if permission level exists
    const [levelCheck] = await db.query('SELECT level_id FROM permission_levels WHERE level_id = ?', [req.params.id]);
    if (levelCheck.length === 0) {
      return res.status(404).json({ error: 'Permission level not found' });
    }
    
    // If default_level_id provided, validate it exists
    if (default_level_id) {
      const [defaultCheck] = await db.query('SELECT level_id FROM permission_levels WHERE level_id = ?', [default_level_id]);
      if (defaultCheck.length === 0) {
        return res.status(400).json({ error: 'Default permission level not found' });
      }
      
      // Reassign users to default level
      await db.query('UPDATE users SET permission_level_id = ? WHERE permission_level_id = ?', [default_level_id, req.params.id]);
    } else {
      // Set users' permission level to NULL
      await db.query('UPDATE users SET permission_level_id = NULL WHERE permission_level_id = ?', [req.params.id]);
    }
    
    // Delete the permission level
    const [result] = await db.query('DELETE FROM permission_levels WHERE level_id = ?', [req.params.id]);
    res.json({ 
      message: 'Permission level deleted successfully',
      users_reassigned: default_level_id ? 'to default level' : 'to NULL'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;