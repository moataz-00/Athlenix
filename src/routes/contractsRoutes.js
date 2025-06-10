const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all contracts
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             s.position as staff_position,
             u.first_name as staff_first_name, u.last_name as staff_last_name,
             DATEDIFF(c.end_date, c.start_date) as contract_duration_days,
             DATEDIFF(c.end_date, CURDATE()) as days_until_expiry,
             CASE 
               WHEN c.end_date < CURDATE() THEN 'Expired'
               WHEN c.start_date > CURDATE() THEN 'Future'
               ELSE 'Active'
             END as contract_status
      FROM contracts c
      LEFT JOIN players p ON c.player_id = p.player_id
      LEFT JOIN staff s ON c.staff_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      ORDER BY c.start_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one contract by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             s.position as staff_position,
             u.first_name as staff_first_name, u.last_name as staff_last_name,
             DATEDIFF(c.end_date, c.start_date) as contract_duration_days,
             DATEDIFF(c.end_date, CURDATE()) as days_until_expiry,
             CASE 
               WHEN c.end_date < CURDATE() THEN 'Expired'
               WHEN c.start_date > CURDATE() THEN 'Future'
               ELSE 'Active'
             END as contract_status
      FROM contracts c
      LEFT JOIN players p ON c.player_id = p.player_id
      LEFT JOIN staff s ON c.staff_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE c.contract_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET contracts by player ID
router.get('/player/:playerId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             DATEDIFF(c.end_date, c.start_date) as contract_duration_days,
             DATEDIFF(c.end_date, CURDATE()) as days_until_expiry,
             CASE 
               WHEN c.end_date < CURDATE() THEN 'Expired'
               WHEN c.start_date > CURDATE() THEN 'Future'
               ELSE 'Active'
             END as contract_status
      FROM contracts c
      LEFT JOIN players p ON c.player_id = p.player_id
      WHERE c.player_id = ?
      ORDER BY c.start_date DESC
    `, [req.params.playerId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET contracts by staff ID
router.get('/staff/:staffId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, 
             s.position as staff_position,
             u.first_name as staff_first_name, u.last_name as staff_last_name,
             DATEDIFF(c.end_date, c.start_date) as contract_duration_days,
             DATEDIFF(c.end_date, CURDATE()) as days_until_expiry,
             CASE 
               WHEN c.end_date < CURDATE() THEN 'Expired'
               WHEN c.start_date > CURDATE() THEN 'Future'
               ELSE 'Active'
             END as contract_status
      FROM contracts c
      LEFT JOIN staff s ON c.staff_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE c.staff_id = ?
      ORDER BY c.start_date DESC
    `, [req.params.staffId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET contracts by status
router.get('/status/:status', async (req, res) => {
  try {
    let whereClause = '';
    const status = req.params.status.toLowerCase();
    
    if (status === 'active') {
      whereClause = 'WHERE c.start_date <= CURDATE() AND c.end_date >= CURDATE()';
    } else if (status === 'expired') {
      whereClause = 'WHERE c.end_date < CURDATE()';
    } else if (status === 'future') {
      whereClause = 'WHERE c.start_date > CURDATE()';
    } else {
      return res.status(400).json({ error: 'Invalid status. Use: active, expired, or future' });
    }

    const [rows] = await db.query(`
      SELECT c.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             s.position as staff_position,
             u.first_name as staff_first_name, u.last_name as staff_last_name,
             DATEDIFF(c.end_date, c.start_date) as contract_duration_days,
             DATEDIFF(c.end_date, CURDATE()) as days_until_expiry,
             CASE 
               WHEN c.end_date < CURDATE() THEN 'Expired'
               WHEN c.start_date > CURDATE() THEN 'Future'
               ELSE 'Active'
             END as contract_status
      FROM contracts c
      LEFT JOIN players p ON c.player_id = p.player_id
      LEFT JOIN staff s ON c.staff_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      ${whereClause}
      ORDER BY c.start_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET contracts expiring soon
router.get('/expiring/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days);
    if (isNaN(days) || days < 0) {
      return res.status(400).json({ error: 'Days must be a positive number' });
    }

    const [rows] = await db.query(`
      SELECT c.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             s.position as staff_position,
             u.first_name as staff_first_name, u.last_name as staff_last_name,
             DATEDIFF(c.end_date, c.start_date) as contract_duration_days,
             DATEDIFF(c.end_date, CURDATE()) as days_until_expiry
      FROM contracts c
      LEFT JOIN players p ON c.player_id = p.player_id
      LEFT JOIN staff s ON c.staff_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE c.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY c.end_date ASC
    `, [days]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET contracts by salary range
router.get('/salary/:minSalary/:maxSalary', async (req, res) => {
  try {
    const minSalary = parseFloat(req.params.minSalary);
    const maxSalary = parseFloat(req.params.maxSalary);
    
    if (isNaN(minSalary) || isNaN(maxSalary)) {
      return res.status(400).json({ error: 'Salary values must be numbers' });
    }

    const [rows] = await db.query(`
      SELECT c.*, 
             p.first_name as player_first_name, p.last_name as player_last_name,
             s.position as staff_position,
             u.first_name as staff_first_name, u.last_name as staff_last_name,
             DATEDIFF(c.end_date, c.start_date) as contract_duration_days,
             DATEDIFF(c.end_date, CURDATE()) as days_until_expiry,
             CASE 
               WHEN c.end_date < CURDATE() THEN 'Expired'
               WHEN c.start_date > CURDATE() THEN 'Future'
               ELSE 'Active'
             END as contract_status
      FROM contracts c
      LEFT JOIN players p ON c.player_id = p.player_id
      LEFT JOIN staff s ON c.staff_id = s.staff_id
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE c.salary BETWEEN ? AND ?
      ORDER BY c.salary DESC
    `, [minSalary, maxSalary]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET contract statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_contracts,
        COUNT(CASE WHEN start_date <= CURDATE() AND end_date >= CURDATE() THEN 1 END) as active_contracts,
        COUNT(CASE WHEN end_date < CURDATE() THEN 1 END) as expired_contracts,
        COUNT(CASE WHEN start_date > CURDATE() THEN 1 END) as future_contracts,
        COUNT(CASE WHEN player_id IS NOT NULL THEN 1 END) as player_contracts,
        COUNT(CASE WHEN staff_id IS NOT NULL THEN 1 END) as staff_contracts,
        AVG(salary) as avg_salary,
        MAX(salary) as max_salary,
        MIN(salary) as min_salary,
        SUM(salary) as total_salary_cost,
        AVG(DATEDIFF(end_date, start_date)) as avg_contract_duration_days
      FROM contracts
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new contract
router.post('/', async (req, res) => {
  try {
    const { player_id, staff_id, start_date, end_date, salary, bonus } = req.body;
    
    // Validate that either player_id or staff_id is provided, but not both
    if ((!player_id && !staff_id) || (player_id && staff_id)) {
      return res.status(400).json({ error: 'Contract must be for either a player or staff member, not both' });
    }
    
    // Validate dates
    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }
    
    // Check if player/staff exists
    if (player_id) {
      const [playerCheck] = await db.query('SELECT player_id FROM players WHERE player_id = ?', [player_id]);
      if (playerCheck.length === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }
    }
    
    if (staff_id) {
      const [staffCheck] = await db.query('SELECT staff_id FROM staff WHERE staff_id = ?', [staff_id]);
      if (staffCheck.length === 0) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
    }
    
    const [result] = await db.query(
      'INSERT INTO contracts (player_id, staff_id, start_date, end_date, salary, bonus) VALUES (?, ?, ?, ?, ?, ?)',
      [player_id || null, staff_id || null, start_date || null, end_date || null, salary || null, bonus || null]
    );
    res.status(201).json({ contract_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update contract by ID
router.put('/:id', async (req, res) => {
  try {
    const { player_id, staff_id, start_date, end_date, salary, bonus } = req.body;
    
    // Validate that either player_id or staff_id is provided, but not both
    if ((!player_id && !staff_id) || (player_id && staff_id)) {
      return res.status(400).json({ error: 'Contract must be for either a player or staff member, not both' });
    }
    
    // Validate dates
    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }
    
    // Check if player/staff exists
    if (player_id) {
      const [playerCheck] = await db.query('SELECT player_id FROM players WHERE player_id = ?', [player_id]);
      if (playerCheck.length === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }
    }
    
    if (staff_id) {
      const [staffCheck] = await db.query('SELECT staff_id FROM staff WHERE staff_id = ?', [staff_id]);
      if (staffCheck.length === 0) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
    }
    
    const [result] = await db.query(
      'UPDATE contracts SET player_id = ?, staff_id = ?, start_date = ?, end_date = ?, salary = ?, bonus = ? WHERE contract_id = ?',
      [player_id || null, staff_id || null, start_date || null, end_date || null, salary || null, bonus || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Contract not found' });
    res.json({ message: 'Contract updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH extend contract
router.patch('/:id/extend', async (req, res) => {
  try {
    const { new_end_date, salary_adjustment, bonus_adjustment } = req.body;
    if (!new_end_date) return res.status(400).json({ error: 'New end date is required' });
    
    // Get current contract
    const [current] = await db.query('SELECT * FROM contracts WHERE contract_id = ?', [req.params.id]);
    if (current.length === 0) return res.status(404).json({ error: 'Contract not found' });
    
    // Validate new end date is after current end date
    if (new Date(new_end_date) <= new Date(current[0].end_date)) {
      return res.status(400).json({ error: 'New end date must be after current end date' });
    }
    
    const newSalary = salary_adjustment ? current[0].salary + salary_adjustment : current[0].salary;
    const newBonus = bonus_adjustment ? (current[0].bonus || 0) + bonus_adjustment : current[0].bonus;
    
    const [result] = await db.query(
      'UPDATE contracts SET end_date = ?, salary = ?, bonus = ? WHERE contract_id = ?',
      [new_end_date, newSalary, newBonus, req.params.id]
    );
    res.json({ message: 'Contract extended successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update salary
router.patch('/:id/salary', async (req, res) => {
  try {
    const { salary, bonus } = req.body;
    if (salary === undefined && bonus === undefined) {
      return res.status(400).json({ error: 'Salary or bonus is required' });
    }
    
    let query = 'UPDATE contracts SET ';
    let params = [];
    let updates = [];
    
    if (salary !== undefined) {
      updates.push('salary = ?');
      params.push(salary);
    }
    
    if (bonus !== undefined) {
      updates.push('bonus = ?');
      params.push(bonus);
    }
    
    query += updates.join(', ') + ' WHERE contract_id = ?';
    params.push(req.params.id);
    
    const [result] = await db.query(query, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Contract not found' });
    res.json({ message: 'Contract salary updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE contract by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM contracts WHERE contract_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Contract not found' });
    res.json({ message: 'Contract deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;