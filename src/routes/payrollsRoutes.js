const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all payrolls
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, c.player_id, c.staff_id 
      FROM payrolls p
      LEFT JOIN contracts c ON p.contract_id = c.contract_id
      ORDER BY p.payment_month DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one payroll by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, c.player_id, c.staff_id 
      FROM payrolls p
      LEFT JOIN contracts c ON p.contract_id = c.contract_id
      WHERE p.payroll_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Payroll not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET payrolls by contract
router.get('/contract/:contractId', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM payrolls WHERE contract_id = ? ORDER BY payment_month DESC', [req.params.contractId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET payrolls by month
router.get('/month/:month', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, c.player_id, c.staff_id 
      FROM payrolls p
      LEFT JOIN contracts c ON p.contract_id = c.contract_id
      WHERE DATE_FORMAT(p.payment_month, '%Y-%m') = ?
    `, [req.params.month]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unpaid payrolls
router.get('/status/unpaid', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, c.player_id, c.staff_id 
      FROM payrolls p
      LEFT JOIN contracts c ON p.contract_id = c.contract_id
      WHERE p.paid = 0
      ORDER BY p.payment_month
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET paid payrolls
router.get('/status/paid', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, c.player_id, c.staff_id 
      FROM payrolls p
      LEFT JOIN contracts c ON p.contract_id = c.contract_id
      WHERE p.paid = 1
      ORDER BY p.payment_month DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET payroll summary by month
router.get('/summary/:month', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_payrolls,
        SUM(base_salary) as total_base_salary,
        SUM(bonus_paid) as total_bonus,
        SUM(base_salary + bonus_paid) as total_amount,
        SUM(CASE WHEN paid = 1 THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN paid = 0 THEN 1 ELSE 0 END) as unpaid_count
      FROM payrolls 
      WHERE DATE_FORMAT(payment_month, '%Y-%m') = ?
    `, [req.params.month]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new payroll
router.post('/', async (req, res) => {
  try {
    const { contract_id, payment_month, base_salary, bonus_paid = 0, paid = 0 } = req.body;
    const [result] = await db.query(
      'INSERT INTO payrolls (contract_id, payment_month, base_salary, bonus_paid, paid) VALUES (?, ?, ?, ?, ?)',
      [contract_id, payment_month, base_salary, bonus_paid, paid]
    );
    res.status(201).json({ payroll_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update payroll by ID
router.put('/:id', async (req, res) => {
  try {
    const { contract_id, payment_month, base_salary, bonus_paid, paid } = req.body;
    const [result] = await db.query(
      'UPDATE payrolls SET contract_id = ?, payment_month = ?, base_salary = ?, bonus_paid = ?, paid = ? WHERE payroll_id = ?',
      [contract_id, payment_month, base_salary, bonus_paid, paid, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Payroll not found' });
    res.json({ message: 'Payroll updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT mark payroll as paid
router.put('/:id/pay', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE payrolls SET paid = 1 WHERE payroll_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Payroll not found' });
    res.json({ message: 'Payroll marked as paid' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE payroll by ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM payrolls WHERE payroll_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Payroll not found' });
    res.json({ message: 'Payroll deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;