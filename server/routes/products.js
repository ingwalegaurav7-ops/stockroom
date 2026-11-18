import express from 'express';
import pool from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import {
  validateProduct,
  validateProductId,
  validateProductQuery,
  handleValidationErrors,
} from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authRequired);

// GET /api/products - List products with search, filters, pagination
router.get('/', validateProductQuery, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category_id,
      status,
      sort = 'name',
      order = 'asc',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSortFields = ['name', 'sku', 'current_stock', 'unit_price', 'category', 'reorder_level'];
    const sortField = validSortFields.includes(sort) ? sort : 'name';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (status) {
      if (status === 'OUT_OF_STOCK') {
        whereClause += ' AND p.current_stock = 0';
      } else if (status === 'LOW_STOCK') {
        whereClause += ' AND p.current_stock > 0 AND p.current_stock <= p.reorder_level';
      } else if (status === 'IN_STOCK') {
        whereClause += ' AND p.current_stock > p.reorder_level';
      }
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM products p ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get products with category name
    let sortColumn = 'p.name';
    if (sortField === 'category') sortColumn = 'c.name';
    else if (sortField !== 'name') sortColumn = `p.${sortField}`;

    const [products] = await pool.execute(
      `SELECT p.*, c.name as category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Add computed stock_status to each product
    const productsWithStatus = products.map(p => ({
      ...p,
      stock_status:
        p.current_stock === 0
          ? 'OUT_OF_STOCK'
          : p.current_stock <= p.reorder_level
          ? 'LOW_STOCK'
          : 'IN_STOCK',
    }));

    res.json({
      products: productsWithStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/export - Export all products matching filters as CSV
router.get('/export', validateProductQuery, async (req, res) => {
  try {
    const { search = '', category_id, status } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (status) {
      if (status === 'OUT_OF_STOCK') {
        whereClause += ' AND p.current_stock = 0';
      } else if (status === 'LOW_STOCK') {
        whereClause += ' AND p.current_stock > 0 AND p.current_stock <= p.reorder_level';
      } else if (status === 'IN_STOCK') {
        whereClause += ' AND p.current_stock > p.reorder_level';
      }
    }

    const [products] = await pool.execute(
      `SELECT p.*, c.name as category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY p.name ASC`,
      params
    );

    // Generate CSV
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Unit Price (INR)', 'Current Stock', 'Reorder Level', 'Stock Status', 'Description'];
    const rows = products.map(p => {
      const stockStatus =
        p.current_stock === 0
          ? 'OUT_OF_STOCK'
          : p.current_stock <= p.reorder_level
          ? 'LOW_STOCK'
          : 'IN_STOCK';
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.sku.replace(/"/g, '""')}"`,
        `"${p.category_name.replace(/"/g, '""')}"`,
        p.unit_price.toFixed(2),
        p.current_stock,
        p.reorder_level,
        stockStatus,
        `"${(p.description || '').replace(/"/g, '""')}"`,
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products-export.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Export products error:', err);
    res.status(500).json({ error: 'Failed to export products' });
  }
});

// GET /api/products/low-stock - Get low stock products for dropdown
router.get('/low-stock', async (req, res) => {
  try {
    const [products] = await pool.execute(
      `SELECT p.id, p.name, p.sku, p.current_stock, p.reorder_level, c.name as category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.current_stock > 0 AND p.current_stock <= p.reorder_level
       ORDER BY p.current_stock ASC, p.name`
    );
    res.json({ products });
  } catch (err) {
    console.error('Low stock products error:', err);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', validateProductId, async (req, res) => {
  try {
    const [products] = await pool.execute(
      `SELECT p.*, c.name as category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];
    product.stock_status =
      product.current_stock === 0
        ? 'OUT_OF_STOCK'
        : product.current_stock <= product.reorder_level
        ? 'LOW_STOCK'
        : 'IN_STOCK';

    res.json({ product });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products - Create new product
router.post('/', validateProduct, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { name, sku, category_id, unit_price, reorder_level, current_stock = 0, description } = req.body;

    // Check SKU uniqueness
    const [existing] = await conn.execute('SELECT id FROM products WHERE sku = ?', [sku]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'SKU already exists' });
    }

    // Verify category exists
    const [categories] = await conn.execute('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (categories.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Invalid category' });
    }

    const [result] = await conn.execute(
      `INSERT INTO products (name, sku, category_id, unit_price, reorder_level, current_stock, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, category_id, unit_price, reorder_level, current_stock, description || null]
    );

    const productId = result.insertId;

    // If initial stock > 0, create a RECEIPT movement
    if (current_stock > 0) {
      await conn.execute(
        `INSERT INTO movements (product_id, type, quantity, reference_type, reference_number, notes, created_by)
         VALUES (?, 'RECEIPT', ?, 'RECEIPT', ?, 'Initial stock', ?)`,
        [productId, current_stock, `INIT-${productId}`, req.user.id]
      );
    }

    await conn.commit();

    const [newProduct] = await conn.execute(
      `SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
      [productId]
    );

    res.status(201).json({ product: newProduct[0] });
  } catch (err) {
    await conn.rollback();
    console.error('Create product error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  } finally {
    conn.release();
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', validateProductId, validateProduct, async (req, res) => {
  try {
    const { name, sku, category_id, unit_price, reorder_level, description } = req.body;

    // Check SKU uniqueness (excluding current product)
    const [existing] = await pool.execute('SELECT id FROM products WHERE sku = ? AND id != ?', [sku, req.params.id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'SKU already exists' });
    }

    // Verify category exists
    const [categories] = await pool.execute('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (categories.length === 0) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    await pool.execute(
      `UPDATE products SET name = ?, sku = ?, category_id = ?, unit_price = ?, reorder_level = ?, description = ?
       WHERE id = ?`,
      [name, sku, category_id, unit_price, reorder_level, description || null, req.params.id]
    );

    const [product] = await pool.execute(
      `SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
      [req.params.id]
    );

    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product: product[0] });
  } catch (err) {
    console.error('Update product error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Delete product (only if stock is zero)
router.delete('/:id', validateProductId, async (req, res) => {
  try {
    const [products] = await pool.execute('SELECT current_stock FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (products[0].current_stock > 0) {
      return res.status(400).json({ error: 'Cannot delete product with non-zero stock' });
    }

    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;