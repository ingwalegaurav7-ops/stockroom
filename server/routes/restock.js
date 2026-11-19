import express from 'express';
import pool from '../db/pool.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import {
  validateRestockRequest,
  validateRestockId,
  validateRestockQuery,
  handleValidationErrors,
} from '../middleware/validation.js';

const router = express.Router();

router.use(authRequired);

// GET /api/restock - List restock requests with filters, pagination
router.get('/', validateRestockQuery, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
    } = req.query;

    const pageSize = parseInt(limit);
    const offset = (parseInt(page) - 1) * pageSize;
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || !Number.isSafeInteger(offset) || offset < 0) {
      return res.status(400).json({ error: 'Invalid pagination' });
    }

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (status) {
      whereClause += ' AND rr.status = ?';
      params.push(status);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM restock_requests rr
       JOIN products p ON rr.product_id = p.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get restock requests with product and user info
    const [requests] = await pool.execute(
      `SELECT rr.*, p.name as product_name, p.sku as product_sku, p.current_stock, p.reorder_level, c.name as category_name,
              u1.name as requested_by_name, u2.name as approved_by_name, u3.name as received_by_name
       FROM restock_requests rr
       JOIN products p ON rr.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       JOIN users u1 ON rr.requested_by = u1.id
       LEFT JOIN users u2 ON rr.approved_by = u2.id
       LEFT JOIN users u3 ON rr.received_by = u3.id
       ${whereClause}
       ORDER BY rr.requested_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('List restock requests error:', err);
    res.status(500).json({ error: 'Failed to fetch restock requests' });
  }
});

// GET /api/restock/summary - Get counts by status for dashboard
router.get('/summary', async (req, res) => {
  try {
    const [counts] = await pool.execute(
      `SELECT status, COUNT(*) as count FROM restock_requests GROUP BY status`
    );

    const summary = {
      AWAITING_APPROVAL: 0,
      AWAITING_DELIVERY: 0,
      RECEIVED: 0,
    };

    for (const row of counts) {
      if (row.status === 'REQUESTED') summary.AWAITING_APPROVAL += row.count;
      else if (row.status === 'APPROVED' || row.status === 'AWAITING_DELIVERY') summary.AWAITING_DELIVERY += row.count;
      else if (row.status === 'RECEIVED') summary.RECEIVED += row.count;
    }

    res.json({ summary });
  } catch (err) {
    console.error('Restock summary error:', err);
    res.status(500).json({ error: 'Failed to fetch restock summary' });
  }
});

// GET /api/restock/:id - Get single restock request
router.get('/:id', validateRestockId, async (req, res) => {
  try {
    const [requests] = await pool.execute(
      `SELECT rr.*, p.name as product_name, p.sku as product_sku, p.current_stock, p.reorder_level, c.name as category_name,
              u1.name as requested_by_name, u2.name as approved_by_name, u3.name as received_by_name
       FROM restock_requests rr
       JOIN products p ON rr.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       JOIN users u1 ON rr.requested_by = u1.id
       LEFT JOIN users u2 ON rr.approved_by = u2.id
       LEFT JOIN users u3 ON rr.received_by = u3.id
       WHERE rr.id = ?`,
      [req.params.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Restock request not found' });
    }

    res.json({ request: requests[0] });
  } catch (err) {
    console.error('Get restock request error:', err);
    res.status(500).json({ error: 'Failed to fetch restock request' });
  }
});

// POST /api/restock - Create new restock request
router.post('/', validateRestockRequest, async (req, res) => {
  try {
    const { product_id, requested_qty, notes } = req.body;

    // Verify product exists
    const [products] = await pool.execute('SELECT id FROM products WHERE id = ?', [product_id]);
    if (products.length === 0) {
      return res.status(400).json({ error: 'Product not found' });
    }

    const [result] = await pool.execute(
      `INSERT INTO restock_requests (product_id, requested_qty, requested_by, notes)
       VALUES (?, ?, ?, ?)`,
      [product_id, requested_qty, req.user.id, notes || null]
    );

    const [newRequest] = await pool.execute(
      `SELECT rr.*, p.name as product_name, p.sku as product_sku, u1.name as requested_by_name
       FROM restock_requests rr
       JOIN products p ON rr.product_id = p.id
       JOIN users u1 ON rr.requested_by = u1.id
       WHERE rr.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ request: newRequest[0] });
  } catch (err) {
    console.error('Create restock request error:', err);
    res.status(500).json({ error: 'Failed to create restock request' });
  }
});

// POST /api/restock/:id/approve - Approve a restock request (manager+)
router.post('/:id/approve', validateRestockId, requireRole('manager', 'admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the request row
    const [requests] = await conn.execute(
      `SELECT * FROM restock_requests WHERE id = ? AND status = 'REQUESTED' FOR UPDATE`,
      [req.params.id]
    );

    if (requests.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found or not in REQUESTED status' });
    }

    await conn.execute(
      `UPDATE restock_requests SET status = 'APPROVED', approved_by = ?, approved_at = NOW() WHERE id = ?`,
      [req.user.id, req.params.id]
    );

    await conn.commit();

    const [updated] = await conn.execute(
      `SELECT rr.*, p.name as product_name, p.sku as product_sku, u1.name as requested_by_name, u2.name as approved_by_name
       FROM restock_requests rr
       JOIN products p ON rr.product_id = p.id
       JOIN users u1 ON rr.requested_by = u1.id
       LEFT JOIN users u2 ON rr.approved_by = u2.id
       WHERE rr.id = ?`,
      [req.params.id]
    );

    res.json({ request: updated[0], message: 'Restock request approved' });
  } catch (err) {
    await conn.rollback();
    console.error('Approve restock error:', err);
    res.status(500).json({ error: 'Failed to approve restock request' });
  } finally {
    conn.release();
  }
});

// POST /api/restock/:id/mark-delivery - Mark as awaiting delivery (manager+)
router.post('/:id/mark-delivery', validateRestockId, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const [requests] = await pool.execute(
      `SELECT * FROM restock_requests WHERE id = ? AND status = 'APPROVED'`,
      [req.params.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Request not found or not in APPROVED status' });
    }

    await pool.execute(
      `UPDATE restock_requests SET status = 'AWAITING_DELIVERY' WHERE id = ?`,
      [req.params.id]
    );

    const [updated] = await pool.execute(
      `SELECT rr.*, p.name as product_name, p.sku as product_sku FROM restock_requests rr JOIN products p ON rr.product_id = p.id WHERE rr.id = ?`,
      [req.params.id]
    );

    res.json({ request: updated[0], message: 'Restock request marked as awaiting delivery' });
  } catch (err) {
    console.error('Mark delivery error:', err);
    res.status(500).json({ error: 'Failed to update restock request' });
  }
});

// POST /api/restock/:id/receive - Receive stock for approved request
router.post('/:id/receive', validateRestockId, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the request and product rows
    const [requests] = await conn.execute(
      `SELECT rr.*, p.current_stock FROM restock_requests rr
       JOIN products p ON rr.product_id = p.id
       WHERE rr.id = ? AND rr.status IN ('APPROVED', 'AWAITING_DELIVERY') FOR UPDATE`,
      [req.params.id]
    );

    if (requests.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found or not in receivable status' });
    }

    const request = requests[0];

    // Check if already received (idempotent)
    if (request.status === 'RECEIVED') {
      await conn.rollback();
      return res.status(400).json({ error: 'Request already received' });
    }

    const newStock = request.current_stock + request.requested_qty;

    // Update product stock
    await conn.execute(
      'UPDATE products SET current_stock = ? WHERE id = ?',
      [newStock, request.product_id]
    );

    // Record RESTOCK movement
    await conn.execute(
      `INSERT INTO movements (product_id, type, quantity, reference_type, reference_id, reference_number, notes, created_by)
       VALUES (?, 'RESTOCK', ?, 'RESTOCK_REQUEST', ?, ?, 'Restock request received', ?)`,
      [request.product_id, request.requested_qty, request.id, `RR-${request.id}`, req.user.id]
    );

    // Update request status
    await conn.execute(
      `UPDATE restock_requests SET status = 'RECEIVED', received_by = ?, received_at = NOW() WHERE id = ?`,
      [req.user.id, req.params.id]
    );

    await conn.commit();

    res.json({
      message: 'Stock received successfully',
      request: { ...request, status: 'RECEIVED', current_stock: newStock },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Receive restock error:', err);
    res.status(500).json({ error: 'Failed to receive restock' });
  } finally {
    conn.release();
  }
});

// POST /api/restock/:id/cancel - Cancel a restock request
router.post('/:id/cancel', validateRestockId, async (req, res) => {
  try {
    const [requests] = await pool.execute(
      `SELECT * FROM restock_requests WHERE id = ? AND status IN ('REQUESTED', 'APPROVED', 'AWAITING_DELIVERY')`,
      [req.params.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Request not found or not cancellable' });
    }

    await pool.execute(
      `UPDATE restock_requests SET status = 'CANCELLED', cancelled_by = ?, cancelled_at = NOW() WHERE id = ?`,
      [req.user.id, req.params.id]
    );

    const [updated] = await pool.execute(
      `SELECT rr.*, p.name as product_name, p.sku as product_sku FROM restock_requests rr JOIN products p ON rr.product_id = p.id WHERE rr.id = ?`,
      [req.params.id]
    );

    res.json({ request: updated[0], message: 'Restock request cancelled' });
  } catch (err) {
    console.error('Cancel restock error:', err);
    res.status(500).json({ error: 'Failed to cancel restock request' });
  }
});

export default router;