import express from 'express';
import { query, getClient } from '../db/connection.js';
import { sendWhatsAppAlert, sendBulkWhatsAppAlerts, formatPhoneNumber } from '../utils/whatsapp.js';

const router = express.Router();

// ==================== CUSTOMERS ====================

// Get all customers
router.get('/customers', async (req, res) => {
  try {
    const { search } = req.query;

    let sql = `
      SELECT c.*,
        COUNT(v.id) as transaction_count,
        COALESCE(SUM(v.amount), 0) as total_credit_given
      FROM customers c
      LEFT JOIN verisiye_transactions v ON c.id = v.customer_id
    `;

    const params = [];

    if (search) {
      sql += ' WHERE c.name ILIKE $1 OR c.house_no ILIKE $1';
      params.push(`%${search}%`);
    }

    sql += ' GROUP BY c.id ORDER BY c.name ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get single customer by ID
router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT c.*,
        COUNT(v.id) as transaction_count,
        COALESCE(SUM(v.amount), 0) as total_credit_given
      FROM customers c
      LEFT JOIN verisiye_transactions v ON c.id = v.customer_id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create new customer
router.post('/customers', async (req, res) => {
  try {
    const { name, house_no, phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const sql = `
      INSERT INTO customers (name, house_no, phone)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await query(sql, [name, house_no || null, phone || null]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, house_no, phone } = req.body;

    const sql = `
      UPDATE customers
      SET name = $1, house_no = $2, phone = $3
      WHERE id = $4
      RETURNING *
    `;

    const result = await query(sql, [name, house_no || null, phone || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// ==================== VERISIYE TRANSACTIONS ====================

// Get all verisiye transactions with filters
router.get('/transactions', async (req, res) => {
  try {
    const { customer_id, house_no, name, start_date, end_date, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT v.*, c.name as customer_name, c.house_no, c.phone
      FROM verisiye_transactions v
      JOIN customers c ON v.customer_id = c.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (customer_id) {
      sql += ` AND v.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }

    if (house_no) {
      sql += ` AND c.house_no ILIKE $${paramCount}`;
      params.push(`%${house_no}%`);
      paramCount++;
    }

    if (name) {
      sql += ` AND c.name ILIKE $${paramCount}`;
      params.push(`%${name}%`);
      paramCount++;
    }

    if (start_date && end_date) {
      sql += ` AND v.transaction_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(start_date, end_date);
      paramCount += 2;
    }

    sql += ` ORDER BY v.transaction_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching verisiye transactions:', error);
    res.status(500).json({ error: 'Failed to fetch verisiye transactions' });
  }
});

// Get single verisiye transaction
router.get('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT v.*, c.name as customer_name, c.house_no, c.phone
      FROM verisiye_transactions v
      JOIN customers c ON v.customer_id = c.id
      WHERE v.id = $1
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Verisiye transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching verisiye transaction:', error);
    res.status(500).json({ error: 'Failed to fetch verisiye transaction' });
  }
});

// Create new verisiye transaction
router.post('/transactions', async (req, res) => {
  const client = await getClient();

  try {
    const { customer_id, amount, description, created_by } = req.body;

    if (!customer_id || !amount) {
      return res.status(400).json({ error: 'customer_id and amount are required' });
    }

    await client.query('BEGIN');

    // Insert verisiye transaction
    const transactionSql = `
      INSERT INTO verisiye_transactions (customer_id, amount, description, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const transactionResult = await client.query(transactionSql, [
      customer_id,
      amount,
      description || null,
      created_by || null
    ]);

    // Update customer total_credit
    await client.query(
      'UPDATE customers SET total_credit = total_credit + $1 WHERE id = $2',
      [amount, customer_id]
    );

    await client.query('COMMIT');

    // Fetch complete transaction with customer info
    const completeSql = `
      SELECT v.*, c.name as customer_name, c.house_no, c.phone
      FROM verisiye_transactions v
      JOIN customers c ON v.customer_id = c.id
      WHERE v.id = $1
    `;

    const completeResult = await client.query(completeSql, [transactionResult.rows[0].id]);
    res.status(201).json(completeResult.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating verisiye transaction:', error);
    res.status(500).json({ error: 'Failed to create verisiye transaction' });
  } finally {
    client.release();
  }
});

// Delete verisiye transaction
router.delete('/transactions/:id', async (req, res) => {
  const client = await getClient();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get transaction to get customer_id and amount
    const getResult = await client.query('SELECT * FROM verisiye_transactions WHERE id = $1', [id]);

    if (getResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Verisiye transaction not found' });
    }

    const transaction = getResult.rows[0];

    // Update customer total_credit
    await client.query(
      'UPDATE customers SET total_credit = total_credit - $1 WHERE id = $2',
      [transaction.amount, transaction.customer_id]
    );

    // Delete transaction
    await client.query('DELETE FROM verisiye_transactions WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Verisiye transaction deleted successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting verisiye transaction:', error);
    res.status(500).json({ error: 'Failed to delete verisiye transaction' });
  } finally {
    client.release();
  }
});

// ==================== REPORTS ====================

// Get daily verisiye summary
router.get('/reports/daily', async (req, res) => {
  try {
    const { date } = req.query;

    const targetDate = date || new Date().toISOString().split('T')[0];

    const sql = `
      SELECT
        DATE(transaction_date) as date,
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as total_verisiye
      FROM verisiye_transactions
      WHERE DATE(transaction_date) = $1
      GROUP BY DATE(transaction_date)
    `;

    const result = await query(sql, [targetDate]);

    if (result.rows.length === 0) {
      return res.json({
        date: targetDate,
        transaction_count: 0,
        total_verisiye: 0
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching daily verisiye report:', error);
    res.status(500).json({ error: 'Failed to fetch daily verisiye report' });
  }
});

// Get verisiye summary by customer (with filters)
router.get('/reports/by-customer', async (req, res) => {
  try {
    const { house_no, name, start_date, end_date } = req.query;

    let sql = `
      SELECT
        c.id,
        c.name,
        c.house_no,
        c.phone,
        c.total_credit,
        COUNT(v.id) as transaction_count,
        COALESCE(SUM(v.amount), 0) as total_verisiye
      FROM customers c
      LEFT JOIN verisiye_transactions v ON c.id = v.customer_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (house_no) {
      sql += ` AND c.house_no ILIKE $${paramCount}`;
      params.push(`%${house_no}%`);
      paramCount++;
    }

    if (name) {
      sql += ` AND c.name ILIKE $${paramCount}`;
      params.push(`%${name}%`);
      paramCount++;
    }

    if (start_date && end_date) {
      sql += ` AND v.transaction_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(start_date, end_date);
      paramCount += 2;
    }

    sql += ` GROUP BY c.id ORDER BY total_verisiye DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customer verisiye report:', error);
    res.status(500).json({ error: 'Failed to fetch customer verisiye report' });
  }
});

// ==================== WHATSAPP ALERTS ====================

// Send WhatsApp alert to single customer
router.post('/whatsapp/send/:customer_id', async (req, res) => {
  try {
    const { customer_id } = req.params;

    // Get customer info
    const customerSql = `
      SELECT c.*, COALESCE(SUM(v.amount), 0) as total_credit
      FROM customers c
      LEFT JOIN verisiye_transactions v ON c.id = v.customer_id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const customerResult = await query(customerSql, [customer_id]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    if (!customer.phone) {
      return res.status(400).json({ error: 'Customer has no phone number' });
    }

    const formattedPhone = formatPhoneNumber(customer.phone);
    const result = await sendWhatsAppAlert(formattedPhone, customer.name, customer.total_credit);

    res.json({
      success: result.success,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: formattedPhone,
        amount: customer.total_credit
      },
      ...result
    });
  } catch (error) {
    console.error('Error sending WhatsApp alert:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp alert' });
  }
});

// Send bulk WhatsApp alerts to customers with credit
router.post('/whatsapp/send-bulk', async (req, res) => {
  try {
    const { customer_ids, min_credit_amount } = req.body;

    let sql = `
      SELECT c.*, COALESCE(SUM(v.amount), 0) as total_credit
      FROM customers c
      LEFT JOIN verisiye_transactions v ON c.id = v.customer_id
      WHERE c.phone IS NOT NULL
    `;

    const params = [];
    let paramCount = 1;

    if (customer_ids && customer_ids.length > 0) {
      sql += ` AND c.id = ANY($${paramCount})`;
      params.push(customer_ids);
      paramCount++;
    }

    sql += ' GROUP BY c.id';

    if (min_credit_amount) {
      sql += ` HAVING COALESCE(SUM(v.amount), 0) >= $${paramCount}`;
      params.push(min_credit_amount);
    }

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.json({
        message: 'No customers found matching criteria',
        sent: 0,
        results: []
      });
    }

    const results = await sendBulkWhatsAppAlerts(result.rows);

    const successCount = results.filter(r => r.success).length;

    res.json({
      message: `Sent ${successCount} out of ${results.length} WhatsApp alerts`,
      sent: successCount,
      total: results.length,
      results
    });
  } catch (error) {
    console.error('Error sending bulk WhatsApp alerts:', error);
    res.status(500).json({ error: 'Failed to send bulk WhatsApp alerts' });
  }
});

export default router;
