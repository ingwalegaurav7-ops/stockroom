import express from 'express';
import pool from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import {
  validateOrder,
  validateOrderId,
  validateOrderQuery,
  handleValidationErrors,
} from '../middleware/validation.js';

const router = express.Router();

router.use(authRequired);

// Generate order number
function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${dateStr}-${random}`;
}

// GET /api/orders - List orders with search, filters, pagination
router.get('/', validateOrderQuery, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      date_from,
      date_to,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    if (date_from) {
      whereClause += ' AND DATE(o.created_at) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND DATE(o.created_at) <= ?';
      params.push(date_to);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get orders with creator name
    const [orders] = await pool.execute(
      `SELECT o.*, u.name as created_by_name
       FROM orders o
       JOIN users u ON o.created_by = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Get line counts for each order
    const orderIds = orders.map(o => o.id);
    let lineCounts = {};
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      const [lines] = await pool.execute(
        `SELECT order_id, COUNT(*) as line_count, SUM(quantity) as total_quantity
         FROM order_lines WHERE order_id IN (${placeholders})
         GROUP BY order_id`,
        orderIds
      );
      lineCounts = Object.fromEntries(lines.map(l => [l.order_id, l]));
    }

    const ordersWithLines = orders.map(o => ({
      ...o,
      line_count: lineCounts[o.id]?.line_count || 0,
      total_quantity: lineCounts[o.id]?.total_quantity || 0,
    }));

    res.json({
      orders: ordersWithLines,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('List orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Get order with lines
router.get('/:id', validateOrderId, async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.*, u.name as created_by_name
       FROM orders o
       JOIN users u ON o.created_by = u.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    const [lines] = await pool.execute(
      `SELECT ol.*, p.name as product_name, p.sku as product_sku
       FROM order_lines ol
       JOIN products p ON ol.product_id = p.id
       WHERE ol.order_id = ?
       ORDER BY ol.id`,
      [req.params.id]
    );

    res.json({ order: { ...order, lines } });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders - Create new draft order
router.post('/', validateOrder, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { customer_name, customer_email, customer_phone, lines, notes } = req.body;

    // Validate all products exist and get their current prices
    const productIds = lines.map(l => l.product_id);
    const placeholders = productIds.map(() => '?').join(',');
    const [products] = await conn.execute(
      `SELECT id, name, sku, unit_price, current_stock FROM products WHERE id IN (${placeholders})`,
      productIds
    );

    if (products.length !== productIds.length) {
      await conn.rollback();
      return res.status(400).json({ error: 'One or more products not found' });
    }

    // Create product map for quick lookup
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    // Calculate totals using current product prices
    let subtotal = 0;
    const orderLines = lines.map(line => {
      const product = productMap[line.product_id];
      const unitPrice = product.unit_price;
      const lineTotal = unitPrice * line.quantity;
      subtotal += lineTotal;
      return {
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
      };
    });

    const taxAmount = subtotal * 0.18; // 18% GST
    const totalAmount = subtotal + taxAmount;

    const orderNumber = generateOrderNumber();

    const [orderResult] = await conn.execute(
      `INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, status, subtotal, tax_amount, total_amount, notes, created_by)
       VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?)`,
      [orderNumber, customer_name, customer_email || null, customer_phone || null, subtotal, taxAmount, totalAmount, notes || null, req.user.id]
    );

    const orderId = orderResult.insertId;

    // Insert order lines
    for (const line of orderLines) {
      await conn.execute(
        `INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, line.product_id, line.quantity, line.unit_price, line.line_total]
      );
    }

    await conn.commit();

    const [newOrder] = await conn.execute(
      `SELECT o.*, u.name as created_by_name FROM orders o JOIN users u ON o.created_by = u.id WHERE o.id = ?`,
      [orderId]
    );

    const [newLines] = await conn.execute(
      `SELECT ol.*, p.name as product_name, p.sku as product_sku FROM order_lines ol JOIN products p ON ol.product_id = p.id WHERE ol.order_id = ?`,
      [orderId]
    );

    res.status(201).json({ order: { ...newOrder[0], lines: newLines } });
  } catch (err) {
    await conn.rollback();
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    conn.release();
  }
});

// POST /api/orders/:id/complete - Complete an order (deduct stock, record sales)
router.post('/:id/complete', validateOrderId, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Get order with lines and lock products
    const [orders] = await conn.execute(
      `SELECT * FROM orders WHERE id = ? AND status = 'DRAFT' FOR UPDATE`,
      [req.params.id]
    );

    if (orders.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Draft order not found' });
    }

    const order = orders[0];

    const [lines] = await conn.execute(
      `SELECT ol.*, p.current_stock, p.name, p.sku
       FROM order_lines ol
       JOIN products p ON ol.product_id = p.id
       WHERE ol.order_id = ?
       FOR UPDATE`,
      [req.params.id]
    );

    // Check stock availability for all lines
    for (const line of lines) {
      if (line.current_stock < line.quantity) {
        await conn.rollback();
        return res.status(400).json({
          error: `Insufficient stock for ${line.name} (${line.sku}). Available: ${line.current_stock}, Required: ${line.quantity}`,
        });
      }
    }

    // All stock available - deduct stock and record SALE movements
    for (const line of lines) {
      const newStock = line.current_stock - line.quantity;

      await conn.execute(
        'UPDATE products SET current_stock = ? WHERE id = ?',
        [newStock, line.product_id]
      );

      await conn.execute(
        `INSERT INTO movements (product_id, type, quantity, reference_type, reference_id, reference_number, notes, created_by)
         VALUES (?, 'SALE', ?, 'ORDER', ?, ?, 'Sale via order completion', ?)`,
        [line.product_id, line.quantity, order.id, order.order_number, req.user.id]
      );
    }

    // Update order status
    await conn.execute(
      `UPDATE orders SET status = 'COMPLETED', completed_at = NOW() WHERE id = ?`,
      [req.params.id]
    );

    await conn.commit();

    res.json({ message: 'Order completed successfully', order: { ...order, status: 'COMPLETED' } });
  } catch (err) {
    await conn.rollback();
    console.error('Complete order error:', err);
    res.status(500).json({ error: 'Failed to complete order' });
  } finally {
    conn.release();
  }
});

// POST /api/orders/:id/cancel - Cancel a draft order
router.post('/:id/cancel', validateOrderId, async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT * FROM orders WHERE id = ? AND status = 'DRAFT'`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Draft order not found' });
    }

    await pool.execute(
      `UPDATE orders SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = ?`,
      [req.params.id]
    );

    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// DELETE /api/orders/:id - Delete a draft order
router.delete('/:id', validateOrderId, async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT * FROM orders WHERE id = ? AND status = 'DRAFT'`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Draft order not found' });
    }

    await pool.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router;