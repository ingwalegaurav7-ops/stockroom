import express from 'express';
import pool from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import {
  validateReceiveStock,
  validateProductId,
  validateMovementQuery,
  handleValidationErrors,
} from '../middleware/validation.js';

const router = express.Router();

router.use(authRequired);

// GET /api/movements - List movements with filters, pagination
router.get('/', validateMovementQuery, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      product_id,
      type,
      date_from,
      date_to,
    } = req.query;

    const pageSize = parseInt(limit);
    const offset = (parseInt(page) - 1) * pageSize;
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || !Number.isSafeInteger(offset) || offset < 0) {
      return res.status(400).json({ error: 'Invalid pagination' });
    }

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (product_id) {
      whereClause += ' AND m.product_id = ?';
      params.push(product_id);
    }

    if (type) {
      whereClause += ' AND m.type = ?';
      params.push(type);
    }

    if (date_from) {
      whereClause += ' AND DATE(m.created_at) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND DATE(m.created_at) <= ?';
      params.push(date_to);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM movements m ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get movements with product and user info
    const [movements] = await pool.execute(
      `SELECT m.*, p.name as product_name, p.sku as product_sku, u.name as created_by_name
       FROM movements m
       JOIN products p ON m.product_id = p.id
       LEFT JOIN users u ON m.created_by = u.id
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    res.json({
      movements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('List movements error:', err);
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
});

// GET /api/movements/:id/history - Movement history for a product
router.get('/:id/history', validateProductId, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageSize = parseInt(limit);
    const offset = (parseInt(page) - 1) * pageSize;
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || !Number.isSafeInteger(offset) || offset < 0) {
      return res.status(400).json({ error: 'Invalid pagination' });
    }

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM movements WHERE product_id = ?',
      [req.params.id]
    );
    const total = countResult[0].total;

    const [movements] = await pool.execute(
      `SELECT m.*, u.name as created_by_name
       FROM movements m
       LEFT JOIN users u ON m.created_by = u.id
       WHERE m.product_id = ?
       ORDER BY m.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      [req.params.id]
    );

    res.json({
      movements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Movement history error:', err);
    res.status(500).json({ error: 'Failed to fetch movement history' });
  }
});

// POST /api/movements/receive/:id - Receive stock for a product (RECEIPT)
router.post('/receive/:id', validateProductId, validateReceiveStock, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { quantity, reference_number, notes } = req.body;

    // Lock product row
    const [products] = await conn.execute(
      'SELECT * FROM products WHERE id = ? FOR UPDATE',
      [req.params.id]
    );

    if (products.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];
    const newStock = product.current_stock + quantity;

    // Update stock
    await conn.execute(
      'UPDATE products SET current_stock = ? WHERE id = ?',
      [newStock, req.params.id]
    );

    // Record movement
    const refNumber = reference_number || `REC-${Date.now()}`;
    await conn.execute(
      `INSERT INTO movements (product_id, type, quantity, reference_type, reference_number, notes, created_by)
       VALUES (?, 'RECEIPT', ?, 'RECEIPT', ?, ?, ?)`,
      [req.params.id, quantity, refNumber, notes || null, req.user.id]
    );

    await conn.commit();

    res.json({
      message: 'Stock received successfully',
      product: { ...product, current_stock: newStock },
      movement: { type: 'RECEIPT', quantity, reference_number: refNumber },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Receive stock error:', err);
    res.status(500).json({ error: 'Failed to receive stock' });
  } finally {
    conn.release();
  }
});

// POST /api/movements/adjust/:id - Manual stock adjustment (admin only)
router.post('/adjust/:id', validateProductId, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { quantity, notes } = req.body;
    const qty = parseInt(quantity);

    if (!qty || qty === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Non-zero quantity required' });
    }

    // Lock product row
    const [products] = await conn.execute(
      'SELECT * FROM products WHERE id = ? FOR UPDATE',
      [req.params.id]
    );

    if (products.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];
    const newStock = product.current_stock + qty;

    if (newStock < 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Adjustment would result in negative stock' });
    }

    // Update stock
    await conn.execute(
      'UPDATE products SET current_stock = ? WHERE id = ?',
      [newStock, req.params.id]
    );

    // Record movement
    await conn.execute(
      `INSERT INTO movements (product_id, type, quantity, reference_type, reference_number, notes, created_by)
       VALUES (?, 'ADJUSTMENT', ?, 'MANUAL', ?, ?, ?)`,
      [req.params.id, qty, `ADJ-${Date.now()}`, notes || 'Manual adjustment', req.user.id]
    );

    await conn.commit();

    res.json({
      message: 'Stock adjusted successfully',
      product: { ...product, current_stock: newStock },
      movement: { type: 'ADJUSTMENT', quantity: qty },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Adjust stock error:', err);
    res.status(500).json({ error: 'Failed to adjust stock' });
  } finally {
    conn.release();
  }
});

export default router;