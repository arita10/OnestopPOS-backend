import express from 'express';
import { query, getClient } from '../db/connection.js';

const router = express.Router();

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const sql = `
      SELECT t.*,
        json_agg(
          json_build_object(
            'id', ti.id,
            'productId', ti.product_id,
            'name', ti.name,
            'quantity', ti.quantity,
            'priceAtSale', ti.price_at_sale,
            'costAtSale', ti.cost_at_sale,
            'weight', ti.weight,
            'isByWeight', ti.is_by_weight
          )
        ) as items
      FROM transactions t
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      GROUP BY t.id
      ORDER BY t.date DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await query(sql, [limit, offset]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT t.*,
        json_agg(
          json_build_object(
            'id', ti.id,
            'productId', ti.product_id,
            'name', ti.name,
            'quantity', ti.quantity,
            'priceAtSale', ti.price_at_sale,
            'costAtSale', ti.cost_at_sale,
            'weight', ti.weight,
            'isByWeight', ti.is_by_weight
          )
        ) as items
      FROM transactions t
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      WHERE t.id = $1
      GROUP BY t.id
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create new transaction (checkout)
router.post('/', async (req, res) => {
  const client = await getClient();

  try {
    const { date, totalAmount, totalProfit, items } = req.body;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Transaction must have at least one item' });
    }

    await client.query('BEGIN');

    // Insert transaction
    const transactionSql = `
      INSERT INTO transactions (date, total_amount, total_profit)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const transactionResult = await client.query(transactionSql, [
      date || new Date(),
      totalAmount,
      totalProfit
    ]);

    const transaction = transactionResult.rows[0];

    // Insert transaction items
    for (const item of items) {
      const itemSql = `
        INSERT INTO transaction_items (
          transaction_id, product_id, name, quantity,
          price_at_sale, cost_at_sale, weight, is_by_weight
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      await client.query(itemSql, [
        transaction.id,
        item.productId,
        item.name,
        item.quantity,
        item.priceAtSale,
        item.costAtSale,
        item.weight || null,
        item.isByWeight || false
      ]);

      // Update product stock (only for non-weight items)
      if (!item.isByWeight) {
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.productId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch complete transaction with items
    const completeSql = `
      SELECT t.*,
        json_agg(
          json_build_object(
            'id', ti.id,
            'productId', ti.product_id,
            'name', ti.name,
            'quantity', ti.quantity,
            'priceAtSale', ti.price_at_sale,
            'costAtSale', ti.cost_at_sale,
            'weight', ti.weight,
            'isByWeight', ti.is_by_weight
          )
        ) as items
      FROM transactions t
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      WHERE t.id = $1
      GROUP BY t.id
    `;

    const completeResult = await client.query(completeSql, [transaction.id]);
    res.status(201).json(completeResult.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  } finally {
    client.release();
  }
});

// Delete transaction (void/refund)
router.delete('/:id', async (req, res) => {
  const client = await getClient();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get transaction items to restore stock
    const itemsResult = await client.query(
      'SELECT * FROM transaction_items WHERE transaction_id = $1',
      [id]
    );

    // Restore stock for non-weight items
    for (const item of itemsResult.rows) {
      if (!item.is_by_weight) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    // Delete transaction (cascade will delete items)
    const result = await client.query(
      'DELETE FROM transactions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Transaction voided successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error voiding transaction:', error);
    res.status(500).json({ error: 'Failed to void transaction' });
  } finally {
    client.release();
  }
});

// Get transaction summary/stats
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let sql = `
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(total_profit), 0) as total_profit,
        COALESCE(AVG(total_amount), 0) as avg_transaction_value
      FROM transactions
    `;

    const params = [];

    if (startDate && endDate) {
      sql += ' WHERE date BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    const result = await query(sql, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({ error: 'Failed to fetch transaction stats' });
  }
});

export default router;
