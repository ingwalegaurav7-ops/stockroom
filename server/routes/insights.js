import express from 'express';
import pool from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { validateInsightsQuery, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

router.use(authRequired);

// Helper: get date range from period
function getDateRange(period, date_from, date_to) {
  const now = new Date();
  let startDate, endDate;

  if (period === 'custom' && date_from && date_to) {
    startDate = new Date(date_from);
    endDate = new Date(date_to);
    endDate.setHours(23, 59, 59, 999);
  } else {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

// GET /api/insights/overview - KPI cards data
router.get('/overview', validateInsightsQuery, async (req, res) => {
  try {
    const { period = '30d', date_from, date_to } = req.query;
    const { startDate, endDate } = getDateRange(period, date_from, date_to);

    // Total Products
    const [totalProducts] = await pool.execute('SELECT COUNT(*) as count FROM products');

    // Units on Hand
    const [unitsOnHand] = await pool.execute('SELECT SUM(current_stock) as total FROM products');

    // Low Stock Count
    const [lowStock] = await pool.execute(
      `SELECT COUNT(*) as count FROM products WHERE current_stock > 0 AND current_stock <= reorder_level`
    );

    // Out of Stock Count
    const [outOfStock] = await pool.execute(
      `SELECT COUNT(*) as count FROM products WHERE current_stock = 0`
    );

    // Units Sold (period)
    const [unitsSold] = await pool.execute(
      `SELECT COALESCE(SUM(ol.quantity), 0) as total
       FROM order_lines ol
       JOIN orders o ON ol.order_id = o.id
       WHERE o.status = 'COMPLETED'
         AND o.completed_at >= ? AND o.completed_at <= ?`,
      [startDate, endDate]
    );

    // Units Received (period)
    const [unitsReceived] = await pool.execute(
      `SELECT COALESCE(SUM(quantity), 0) as total
       FROM movements
       WHERE type IN ('RECEIPT', 'RESTOCK')
         AND created_at >= ? AND created_at <= ?`,
      [startDate, endDate]
    );

    // Completed Order Value (period)
    const [orderValue] = await pool.execute(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM orders
       WHERE status = 'COMPLETED'
         AND completed_at >= ? AND completed_at <= ?`,
      [startDate, endDate]
    );

    res.json({
      period,
      date_range: { from: startDate.toISOString().split('T')[0], to: endDate.toISOString().split('T')[0] },
      kpis: {
        total_products: totalProducts[0].count,
        units_on_hand: unitsOnHand[0].total || 0,
        low_stock_count: lowStock[0].count,
        out_of_stock_count: outOfStock[0].count,
        units_sold: unitsSold[0].total,
        units_received: unitsReceived[0].total,
        completed_order_value: parseFloat(orderValue[0].total || 0),
      },
    });
  } catch (err) {
    console.error('Insights overview error:', err);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// GET /api/insights/trends - Time series data for charts
router.get('/trends', validateInsightsQuery, async (req, res) => {
  try {
    const { period = '30d', date_from, date_to } = req.query;
    const { startDate, endDate } = getDateRange(period, date_from, date_to);

    // Daily Units Received vs Units Sold
    const [dailyData] = await pool.execute(
      `SELECT
         DATE(m.created_at) as date,
         SUM(CASE WHEN m.type = 'SALE' THEN m.quantity ELSE 0 END) as units_sold,
         SUM(CASE WHEN m.type IN ('RECEIPT', 'RESTOCK') THEN m.quantity ELSE 0 END) as units_received
       FROM movements m
       WHERE m.created_at >= ? AND m.created_at <= ?
         AND m.type IN ('SALE', 'RECEIPT', 'RESTOCK')
       GROUP BY DATE(m.created_at)
       ORDER BY DATE(m.created_at)`,
      [startDate, endDate]
    );

    // Top Products by Units Sold
    const [topProducts] = await pool.execute(
      `SELECT p.id, p.name, p.sku, c.name as category,
              COALESCE(SUM(ol.quantity), 0) as units_sold,
              COALESCE(SUM(ol.line_total), 0) as revenue
       FROM products p
       JOIN categories c ON p.category_id = c.id
       LEFT JOIN order_lines ol ON p.id = ol.product_id
       LEFT JOIN orders o ON ol.order_id = o.id AND o.status = 'COMPLETED'
         AND o.completed_at >= ? AND o.completed_at <= ?
       GROUP BY p.id, p.name, p.sku, c.name
       ORDER BY units_sold DESC
       LIMIT 10`,
      [startDate, endDate]
    );

    // Daily Completed Order Value
    const [dailyOrderValue] = await pool.execute(
      `SELECT DATE(completed_at) as date, SUM(total_amount) as order_value
       FROM orders
       WHERE status = 'COMPLETED'
         AND completed_at >= ? AND completed_at <= ?
       GROUP BY DATE(completed_at)
       ORDER BY DATE(completed_at)`,
      [startDate, endDate]
    );

    res.json({
      period,
      date_range: { from: startDate.toISOString().split('T')[0], to: endDate.toISOString().split('T')[0] },
      daily_movements: dailyData,
      top_products: topProducts,
      daily_order_value: dailyOrderValue,
    });
  } catch (err) {
    console.error('Insights trends error:', err);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// GET /api/insights/stock-alerts - Current stock alerts (snapshot, not historical)
router.get('/stock-alerts', async (req, res) => {
  try {
    // Out of stock products
    const [outOfStock] = await pool.execute(
      `SELECT p.id, p.name, p.sku, c.name as category, p.current_stock, p.reorder_level, p.unit_price
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.current_stock = 0
       ORDER BY p.name`
    );

    // Low stock products
    const [lowStock] = await pool.execute(
      `SELECT p.id, p.name, p.sku, c.name as category, p.current_stock, p.reorder_level, p.unit_price
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.current_stock > 0 AND p.current_stock <= p.reorder_level
       ORDER BY p.current_stock ASC, p.name`
    );

    res.json({
      out_of_stock: outOfStock,
      low_stock: lowStock,
      summary: {
        out_of_stock_count: outOfStock.length,
        low_stock_count: lowStock.length,
      },
    });
  } catch (err) {
    console.error('Stock alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch stock alerts' });
  }
});

// POST /api/insights/stock-alerts/:id/request-restock - Quick restock request from alerts
router.post('/stock-alerts/:id/request-restock', authRequired, async (req, res) => {
  try {
    const { requested_qty, notes } = req.body;
    const productId = req.params.id;

    const [products] = await pool.execute('SELECT id, current_stock, reorder_level FROM products WHERE id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];
    const qty = parseInt(requested_qty) || Math.max(product.reorder_level - product.current_stock + 10, 10);

    const [result] = await pool.execute(
      `INSERT INTO restock_requests (product_id, requested_qty, requested_by, notes)
       VALUES (?, ?, ?, ?)`,
      [productId, qty, req.user.id, notes || 'Requested from Stock Alerts']
    );

    const [newRequest] = await pool.execute(
      `SELECT rr.*, p.name as product_name, p.sku as product_sku FROM restock_requests rr JOIN products p ON rr.product_id = p.id WHERE rr.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ request: newRequest[0] });
  } catch (err) {
    console.error('Quick restock request error:', err);
    res.status(500).json({ error: 'Failed to create restock request' });
  }
});

export default router;