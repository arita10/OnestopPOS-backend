import express from 'express';
import { query } from '../db/connection.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    let sql = 'SELECT * FROM products';
    let params = [];

    if (search) {
      sql += ' WHERE name ILIKE $1 OR barcode LIKE $2';
      params = [`%${search}%`, `${search}%`];
    }

    sql += ' ORDER BY id DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get product by barcode
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const result = await query('SELECT * FROM products WHERE barcode = $1', [barcode]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product
router.post('/', async (req, res) => {
  try {
    const {
      barcode,
      name,
      priceBuy,
      priceSell,
      stock,
      category,
      expireDate,
      isByWeight,
      pricePerKg,
      unit
    } = req.body;

    // Validation
    if (!barcode || !name) {
      return res.status(400).json({ error: 'Barcode and name are required' });
    }

    const sql = `
      INSERT INTO products (
        barcode, name, price_buy, price_sell, stock, category,
        expire_date, is_by_weight, price_per_kg, unit
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      barcode,
      name,
      priceBuy || 0,
      priceSell || 0,
      stock || 0,
      category || null,
      expireDate || null,
      isByWeight || false,
      pricePerKg || null,
      unit || 'piece'
    ];

    const result = await query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Product with this barcode already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      barcode,
      name,
      priceBuy,
      priceSell,
      stock,
      category,
      expireDate,
      isByWeight,
      pricePerKg,
      unit
    } = req.body;

    const sql = `
      UPDATE products
      SET barcode = $1, name = $2, price_buy = $3, price_sell = $4,
          stock = $5, category = $6, expire_date = $7, is_by_weight = $8,
          price_per_kg = $9, unit = $10
      WHERE id = $11
      RETURNING *
    `;

    const values = [
      barcode,
      name,
      priceBuy,
      priceSell,
      stock,
      category,
      expireDate,
      isByWeight,
      pricePerKg,
      unit,
      id
    ];

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Product with this barcode already exists' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Update stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    const sql = `
      UPDATE products
      SET stock = stock + $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await query(sql, [quantity, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

export default router;
