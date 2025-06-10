const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all nutrition plans
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT np.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             p.position as player_position,
             s.position as nutritionist_position,
             u.first_name as nutritionist_first_name, u.last_name as nutritionist_last_name,
             u.email as nutritionist_email,
             DATEDIFF(CURDATE(), np.created_at) as days_since_created,
             CHAR_LENGTH(np.plan_details) as plan_details_length
      FROM nutrition_plans np
      LEFT JOIN players p ON np.player_id = p.player_id
      LEFT JOIN staff s ON np.nutritionist_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      ORDER BY np.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one nutrition plan by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT np.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             p.position as player_position, p.date_of_birth as player_dob,
             s.position as nutritionist_position,
             u.first_name as nutritionist_first_name, u.last_name as nutritionist_last_name,
             u.email as nutritionist_email, u.username as nutritionist_username,
             DATEDIFF(CURDATE(), np.created_at) as days_since_created,
             CHAR_LENGTH(np.plan_details) as plan_details_length
      FROM nutrition_plans np
      LEFT JOIN players p ON np.player_id = p.player_id
      LEFT JOIN staff s ON np.nutritionist_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE np.plan_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Nutrition plan not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET nutrition plans by player ID
router.get('/player/:playerId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT np.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             s.position as nutritionist_position,
             u.first_name as nutritionist_first_name, u.last_name as nutritionist_last_name,
             u.email as nutritionist_email,
             DATEDIFF(CURDATE(), np.created_at) as days_since_created,
             CHAR_LENGTH(np.plan_details) as plan_details_length
      FROM nutrition_plans np
      LEFT JOIN players p ON np.player_id = p.player_id
      LEFT JOIN staff s ON np.nutritionist_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE np.player_id = ?
      ORDER BY np.created_at DESC
    `, [req.params.playerId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET nutrition plans by nutritionist ID
router.get('/nutritionist/:nutritionistId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT np.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             p.position as player_position,
             s.position as nutritionist_position,
             u.first_name as nutritionist_first_name, u.last_name as nutritionist_last_name,
             DATEDIFF(CURDATE(), np.created_at) as days_since_created,
             CHAR_LENGTH(np.plan_details) as plan_details_length
      FROM nutrition_plans np
      LEFT JOIN players p ON np.player_id = p.player_id
      LEFT JOIN staff s ON np.nutritionist_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE np.nutritionist_id = ?
      ORDER BY np.created_at DESC
    `, [req.params.nutritionistId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET recent nutrition plans (within specified days)
router.get('/recent/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days);
    if (isNaN(days) || days < 0) {
      return res.status(400).json({ error: 'Days must be a positive number' });
    }

    const [rows] = await db.query(`
      SELECT np.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             p.position as player_position,
             s.position as nutritionist_position,
             u.first_name as nutritionist_first_name, u.last_name as nutritionist_last_name,
             DATEDIFF(CURDATE(), np.created_at) as days_since_created,
             CHAR_LENGTH(np.plan_details) as plan_details_length
      FROM nutrition_plans np
      LEFT JOIN players p ON np.player_id = p.player_id
      LEFT JOIN staff s ON np.nutritionist_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE np.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY np.created_at DESC
    `, [days]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET nutrition plans created in date range
router.get('/created/:startDate/:endDate', async (req, res) => {
  try {
    const startDate = req.params.startDate;
    const endDate = req.params.endDate;
    
    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    const [rows] = await db.query(`
      SELECT np.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             p.position as player_position,
             s.position as nutritionist_position,
             u.first_name as nutritionist_first_name, u.last_name as nutritionist_last_name,
             DATEDIFF(CURDATE(), np.created_at) as days_since_created,
             CHAR_LENGTH(np.plan_details) as plan_details_length
      FROM nutrition_plans np
      LEFT JOIN players p ON np.player_id = p.player_id
      LEFT JOIN staff s ON np.nutritionist_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE DATE(np.created_at) BETWEEN ? AND ?
      ORDER BY np.created_at DESC
    `, [startDate, endDate]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET players without nutrition plans
router.get('/players/without-plans', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.player_id, p.first_name, p.last_name, p.position, p.date_of_birth
      FROM players p
      LEFT JOIN nutrition_plans np ON p.player_id = np.player_id
      WHERE np.player_id IS NULL
      ORDER BY p.last_name, p.first_name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET nutrition plan statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_nutrition_plans,
        COUNT(DISTINCT np.player_id) as players_with_plans,
        COUNT(DISTINCT np.nutritionist_id) as active_nutritionists,
        AVG(CHAR_LENGTH(np.plan_details)) as avg_plan_length,
        MAX(CHAR_LENGTH(np.plan_details)) as max_plan_length,
        MIN(CHAR_LENGTH(np.plan_details)) as min_plan_length,
        AVG(DATEDIFF(CURDATE(), np.created_at)) as avg_days_since_created,
        COUNT(CASE WHEN np.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as plans_last_30_days,
        COUNT(CASE WHEN np.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as plans_last_7_days
      FROM nutrition_plans np
    `);
    
    const [nutritionistStats] = await db.query(`
      SELECT 
        s.staff_id,
        u.first_name as nutritionist_first_name,
        u.last_name as nutritionist_last_name,
        COUNT(np.plan_id) as plans_created
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN nutrition_plans np ON s.staff_id = np.nutritionist_id
      WHERE s.position LIKE '%nutritionist%' OR np.nutritionist_id IS NOT NULL
      GROUP BY s.staff_id, u.first_name, u.last_name
      ORDER BY plans_created DESC
    `);
    
    res.json({
      summary: rows[0],
      nutritionist_performance: nutritionistStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET nutrition plans by nutritionist workload
router.get('/nutritionist/workload', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.staff_id,
        u.first_name as nutritionist_first_name,
        u.last_name as nutritionist_last_name,
        u.email as nutritionist_email,
        COUNT(np.plan_id) as total_plans,
        COUNT(CASE WHEN np.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as plans_last_30_days,
        COUNT(CASE WHEN np.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as plans_last_7_days,
        AVG(CHAR_LENGTH(np.plan_details)) as avg_plan_length
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN nutrition_plans np ON s.staff_id = np.nutritionist_id
      WHERE s.position LIKE '%nutritionist%' OR np.nutritionist_id IS NOT NULL
      GROUP BY s.staff_id, u.first_name, u.last_name, u.email
      ORDER BY total_plans DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new nutrition plan
router.post('/', async (req, res) => {
  try {
    const { player_id, nutritionist_id, plan_details } = req.body;
    
    // Validate required fields
    if (!player_id) return res.status(400).json({ error: 'Player ID is required' });
    if (!nutritionist_id) return res.status(400).json({ error: 'Nutritionist ID is required' });
    if (!plan_details || plan_details.trim() === '') {
      return res.status(400).json({ error: 'Plan details are required' });
    }
    
    // Check if player exists
    const [playerCheck] = await db.query('SELECT player_id FROM players WHERE player_id = ?', [player_id]);
    if (playerCheck.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Check if nutritionist exists
    const [nutritionistCheck] = await db.query('SELECT staff_id FROM staff WHERE staff_id = ?', [nutritionist_id]);
    if (nutritionistCheck.length === 0) {
      return res.status(404).json({ error: 'Nutritionist not found' });
    }
    
    const [result] = await db.query(
      'INSERT INTO nutrition_plans (player_id, nutritionist_id, plan_details) VALUES (?, ?, ?)',
      [player_id, nutritionist_id, plan_details]
    );
    res.status(201).json({ plan_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update nutrition plan by ID
router.put('/:id', async (req, res) => {
  try {
    const { player_id, nutritionist_id, plan_details } = req.body;
    
    // Validate required fields
    if (!player_id) return res.status(400).json({ error: 'Player ID is required' });
    if (!nutritionist_id) return res.status(400).json({ error: 'Nutritionist ID is required' });
    if (!plan_details || plan_details.trim() === '') {
      return res.status(400).json({ error: 'Plan details are required' });
    }
    
    // Check if player exists
    const [playerCheck] = await db.query('SELECT player_id FROM players WHERE player_id = ?', [player_id]);
    if (playerCheck.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Check if nutritionist exists
    const [nutritionistCheck] = await db.query('SELECT staff_id FROM staff WHERE staff_id = ?', [nutritionist_id]);
    if (nutritionistCheck.length === 0) {
      return res.status(404).json({ error: 'Nutritionist not found' });
    }
    
    const [result] = await db.query(
      'UPDATE nutrition_plans SET player_id = ?, nutritionist_id = ?, plan_details = ? WHERE plan_id = ?',
      [player_id, nutritionist_id, plan_details, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Nutrition plan not found' });
    res.json({ message: 'Nutrition plan updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update plan details only
router.patch('/:id/details', async (req, res) => {
  try {
    const { plan_details } = req.body;
    if (!plan_details || plan_details.trim() === '') {
      return res.status(400).json({ error: 'Plan details are required' });
    }
    
    const [result] = await db.query('UPDATE nutrition_plans SET plan_details = ? WHERE plan_id = ?', [plan_details, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Nutrition plan not found' });
    res.json({ message: 'Plan details updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH assign new nutritionist
router.patch('/:id/assign-nutritionist', async (req, res) => {
  try {
    const { nutritionist_id } = req.body;
    if (!nutritionist_id) return res.status(400).json({ error: 'Nutritionist ID is required' });
    
    // Check if nutritionist exists
    const [nutritionistCheck] = await db.query('SELECT staff_id FROM staff WHERE staff_id = ?', [nutritionist_id]);
    if (nutritionistCheck.length === 0) {
      return res.status(404).json({ error: 'Nutritionist not found' });
    }
    
    const [result] = await db.query('UPDATE nutrition_plans SET nutritionist_id = ? WHERE plan_id = ?', [nutritionist_id, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Nutrition plan not found' });
    res.json({ message: 'Nutritionist assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH bulk assign nutritionist to multiple plans
router.patch('/bulk/assign-nutritionist', async (req, res) => {
  try {
    const { plan_ids, nutritionist_id } = req.body;
    if (!plan_ids || !Array.isArray(plan_ids) || plan_ids.length === 0) {
      return res.status(400).json({ error: 'Array of plan IDs is required' });
    }
    if (!nutritionist_id) return res.status(400).json({ error: 'Nutritionist ID is required' });
    
    // Check if nutritionist exists
    const [nutritionistCheck] = await db.query('SELECT staff_id FROM staff WHERE staff_id = ?', [nutritionist_id]);
    if (nutritionistCheck.length === 0) {
      return res.status(404).json({ error: 'Nutritionist not found' });
    }
    
    const placeholders = plan_ids.map(() => '?').join(',');
    const [result] = await db.query(
      `UPDATE nutrition_plans SET nutritionist_id = ? WHERE plan_id IN (${placeholders})`,
      [nutritionist_id, ...plan_ids]
    );
    
    res.json({ 
      message: 'Nutritionist assigned to plans successfully',
      affected_plans: result.affectedRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE nutrition plan by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM nutrition_plans WHERE plan_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Nutrition plan not found' });
    res.json({ message: 'Nutrition plan deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE bulk delete nutrition plans
router.delete('/bulk/delete', async (req, res) => {
  try {
    const { plan_ids } = req.body;
    if (!plan_ids || !Array.isArray(plan_ids) || plan_ids.length === 0) {
      return res.status(400).json({ error: 'Array of plan IDs is required' });
    }
    
    const placeholders = plan_ids.map(() => '?').join(',');
    const [result] = await db.query(`DELETE FROM nutrition_plans WHERE plan_id IN (${placeholders})`, plan_ids);
    
    res.json({ 
      message: 'Nutrition plans deleted successfully',
      deleted_plans: result.affectedRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;