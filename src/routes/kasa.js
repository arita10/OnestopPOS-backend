import express from 'express';
import { query, getClient } from '../db/connection.js';

const router = express.Router();

// ==================== EXPENSE PRODUCTS ====================

// Get all expense products 
router.get('/expense-products', async (req, res) => {
  try {
    const { category } = req.query;

    let sql = 'SELECT * FROM expense_products WHERE is_active = true';
    const params = [];

    if (category) {
      sql += ' AND category = $1';
      params.push(category);
    }

    sql += ' ORDER BY category, name ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expense products:', error);
    res.status(500).json({ error: 'Failed to fetch expense products' });
  }
});

// Create expense product
router.post('/expense-products', async (req, res) => {
  try {
    const { name, category } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'name and category are required' });
    }

    if (!['kasa', 'kart', 'devir'].includes(category)) {
      return res.status(400).json({ error: 'category must be kasa, kart, or devir' });
    }

    const sql = `
      INSERT INTO expense_products (name, category)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await query(sql, [name, category]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating expense product:', error);
    res.status(500).json({ error: 'Failed to create expense product' });
  }
});

// Update expense product
router.put('/expense-products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, is_active } = req.body;

    const sql = `
      UPDATE expense_products
      SET name = COALESCE($1, name),
          category = COALESCE($2, category),
          is_active = COALESCE($3, is_active)
      WHERE id = $4
      RETURNING *
    `;

    const result = await query(sql, [name, category, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating expense product:', error);
    res.status(500).json({ error: 'Failed to update expense product' });
  }
});

// Delete expense product (soft delete)
router.delete('/expense-products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE expense_products SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense product not found' });
    }

    res.json({ message: 'Expense product deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense product:', error);
    res.status(500).json({ error: 'Failed to delete expense product' });
  }
});

// ==================== DAILY BALANCE SHEETS ====================

// Get all balance sheets
router.get('/balance-sheets', async (req, res) => {
  try {
    const { start_date, end_date, limit = 30, offset = 0 } = req.query;

    let sql = 'SELECT * FROM daily_balance_sheets WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (start_date && end_date) {
      sql += ` AND sheet_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(start_date, end_date);
      paramCount += 2;
    }

    sql += ` ORDER BY sheet_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching balance sheets:', error);
    res.status(500).json({ error: 'Failed to fetch balance sheets' });
  }
});

// Get single balance sheet with details
router.get('/balance-sheets/:date', async (req, res) => {
  try {
    const { date } = req.params;

    // Get balance sheet
    const sheetSql = 'SELECT * FROM daily_balance_sheets WHERE sheet_date = $1';
    const sheetResult = await query(sheetSql, [date]);

    if (sheetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Balance sheet not found' });
    }

    const sheet = sheetResult.rows[0];

    // Get expenses
    const expensesSql = `
      SELECT e.*, ep.name as product_name, ep.category
      FROM balance_sheet_expenses e
      JOIN expense_products ep ON e.expense_product_id = ep.id
      WHERE e.balance_sheet_id = $1
      ORDER BY e.expense_type, ep.name
    `;
    const expensesResult = await query(expensesSql, [sheet.id]);

    // Get shop purchases
    const purchasesSql = `
      SELECT sp.*, ep.name as product_name
      FROM shop_purchases sp
      JOIN expense_products ep ON sp.expense_product_id = ep.id
      WHERE sp.balance_sheet_id = $1
      ORDER BY ep.name
    `;
    const purchasesResult = await query(purchasesSql, [sheet.id]);

    res.json({
      ...sheet,
      expenses: expensesResult.rows,
      shop_purchases: purchasesResult.rows
    });
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    res.status(500).json({ error: 'Failed to fetch balance sheet' });
  }
});

// Create or update balance sheet
router.post('/balance-sheets', async (req, res) => {
  const client = await getClient();

  try {
    const {
      sheet_date,
      verisiye_total,
      kasa_nakit,
      k_kart,
      notes,
      created_by,
      expenses = [],
      shop_purchases = []
    } = req.body;

    if (!sheet_date) {
      return res.status(400).json({ error: 'sheet_date is required' });
    }

    await client.query('BEGIN');

    // Get total sales from transactions for the day (Kasa Sistem)
    const salesSql = `
      SELECT COALESCE(SUM(total_amount), 0) as total_sales
      FROM transactions
      WHERE DATE(date) = $1
    `;
    const salesResult = await client.query(salesSql, [sheet_date]);
    const kasa_sistem = parseFloat(salesResult.rows[0].total_sales);

    // Calculate total expenses
    const kasa_gider = expenses
      .filter(e => e.expense_type === 'kasa_gider')
      .reduce((sum, e) => sum + parseFloat(e.total_price), 0);

    const kart_gider = expenses
      .filter(e => e.expense_type === 'kart_gider')
      .reduce((sum, e) => sum + parseFloat(e.total_price), 0);

    const devir_gider = expenses
      .filter(e => e.expense_type === 'devir_gider')
      .reduce((sum, e) => sum + parseFloat(e.total_price), 0);

    // Calculate Toplam = Kasa Nakit + K.Kart + Kasa Gider
    const toplam = parseFloat(kasa_nakit || 0) + parseFloat(k_kart || 0) + kasa_gider;

    // Calculate Fark = Kasa Sistem - Toplam
    const fark = kasa_sistem - toplam;

    // Get yesterday's Devir Toplam
    const yesterdaySql = `
      SELECT devir_toplam FROM daily_balance_sheets
      WHERE sheet_date = $1::date - INTERVAL '1 day'
    `;
    const yesterdayResult = await client.query(yesterdaySql, [sheet_date]);
    const yesterday_devir = yesterdayResult.rows.length > 0
      ? parseFloat(yesterdayResult.rows[0].devir_toplam)
      : 0;

    // Calculate Devir Toplam = Yesterday Devir - Devir Gider + Kasa Nakit
    const devir_toplam = yesterday_devir - devir_gider + parseFloat(kasa_nakit || 0);

    // Insert or update balance sheet
    const sheetSql = `
      INSERT INTO daily_balance_sheets (
        sheet_date, kasa_sistem, verisiye_total, kasa_nakit, k_kart,
        toplam, fark, devir_toplam, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (sheet_date)
      DO UPDATE SET
        kasa_sistem = EXCLUDED.kasa_sistem,
        verisiye_total = EXCLUDED.verisiye_total,
        kasa_nakit = EXCLUDED.kasa_nakit,
        k_kart = EXCLUDED.k_kart,
        toplam = EXCLUDED.toplam,
        fark = EXCLUDED.fark,
        devir_toplam = EXCLUDED.devir_toplam,
        notes = EXCLUDED.notes,
        created_by = EXCLUDED.created_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const sheetResult = await client.query(sheetSql, [
      sheet_date,
      kasa_sistem,
      verisiye_total || 0,
      kasa_nakit || 0,
      k_kart || 0,
      toplam,
      fark,
      devir_toplam,
      notes || null,
      created_by || null
    ]);

    const sheet = sheetResult.rows[0];

    // Delete existing expenses and purchases
    await client.query('DELETE FROM balance_sheet_expenses WHERE balance_sheet_id = $1', [sheet.id]);
    await client.query('DELETE FROM shop_purchases WHERE balance_sheet_id = $1', [sheet.id]);

    // Insert expenses
    for (const expense of expenses) {
      const expenseSql = `
        INSERT INTO balance_sheet_expenses (
          balance_sheet_id, expense_product_id, expense_type,
          quantity, unit_price, total_price, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await client.query(expenseSql, [
        sheet.id,
        expense.expense_product_id,
        expense.expense_type,
        expense.quantity || 1,
        expense.unit_price,
        expense.total_price,
        expense.notes || null
      ]);
    }

    // Insert shop purchases
    for (const purchase of shop_purchases) {
      const purchaseSql = `
        INSERT INTO shop_purchases (
          balance_sheet_id, expense_product_id, quantity,
          unit_cost, total_cost, supplier, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await client.query(purchaseSql, [
        sheet.id,
        purchase.expense_product_id,
        purchase.quantity,
        purchase.unit_cost,
        purchase.total_cost,
        purchase.supplier || null,
        purchase.notes || null
      ]);
    }

    await client.query('COMMIT');

    // Fetch complete balance sheet
    const completeSql = `
      SELECT * FROM daily_balance_sheets WHERE id = $1
    `;
    const completeResult = await client.query(completeSql, [sheet.id]);

    res.status(201).json(completeResult.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating/updating balance sheet:', error);
    res.status(500).json({ error: 'Failed to create/update balance sheet' });
  } finally {
    client.release();
  }
});

// Delete balance sheet
router.delete('/balance-sheets/:date', async (req, res) => {
  try {
    const { date } = req.params;

    const result = await query(
      'DELETE FROM daily_balance_sheets WHERE sheet_date = $1 RETURNING *',
      [date]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Balance sheet not found' });
    }

    res.json({ message: 'Balance sheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting balance sheet:', error);
    res.status(500).json({ error: 'Failed to delete balance sheet' });
  }
});

// ==================== REPORTS ====================

// Get daily profit report
router.get('/reports/daily-profit', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT
        DATE(t.date) as sale_date,
        ti.product_id,
        ti.name as product_name,
        p.barcode,
        SUM(ti.quantity) as total_quantity,
        AVG(ti.price_at_sale) as avg_price_sell,
        AVG(ti.cost_at_sale) as avg_price_buy,
        SUM(ti.quantity * ti.price_at_sale) as total_revenue,
        SUM(ti.quantity * ti.cost_at_sale) as total_cost,
        SUM(ti.quantity * (ti.price_at_sale - ti.cost_at_sale)) as total_profit
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      LEFT JOIN products p ON ti.product_id = p.id
      WHERE 1=1
    `;

    const params = [];

    if (start_date && end_date) {
      sql += ' AND DATE(t.date) BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    } else {
      // Default to today
      sql += ' AND DATE(t.date) = CURRENT_DATE';
    }

    sql += `
      GROUP BY DATE(t.date), ti.product_id, ti.name, p.barcode
      ORDER BY sale_date DESC, total_profit DESC
    `;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily profit report:', error);
    res.status(500).json({ error: 'Failed to fetch daily profit report' });
  }
});

// Get summary statistics
router.get('/reports/summary', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get balance sheet
    const sheetSql = 'SELECT * FROM daily_balance_sheets WHERE sheet_date = $1';
    const sheetResult = await query(sheetSql, [targetDate]);

    // Get total expenses by type
    const expensesSql = `
      SELECT
        e.expense_type,
        COALESCE(SUM(e.total_price), 0) as total
      FROM balance_sheet_expenses e
      JOIN daily_balance_sheets bs ON e.balance_sheet_id = bs.id
      WHERE bs.sheet_date = $1
      GROUP BY e.expense_type
    `;
    const expensesResult = await query(expensesSql, [targetDate]);

    // Get total shop purchases
    const purchasesSql = `
      SELECT COALESCE(SUM(sp.total_cost), 0) as total_purchases
      FROM shop_purchases sp
      JOIN daily_balance_sheets bs ON sp.balance_sheet_id = bs.id
      WHERE bs.sheet_date = $1
    `;
    const purchasesResult = await query(purchasesSql, [targetDate]);

    res.json({
      balance_sheet: sheetResult.rows[0] || null,
      expenses_by_type: expensesResult.rows,
      total_shop_purchases: purchasesResult.rows[0]?.total_purchases || 0
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
