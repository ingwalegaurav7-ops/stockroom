import express from 'express';
import pool from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import {
  validateCategory,
  validateCategoryId,
  handleValidationErrors,
} from '../middleware/validation.js';

const router = express.Router();

router.use(authRequired);

// GET /api/categories - List all categories with product counts
router.get('/', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json({ categories });
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/categories/:id - Get single category
router.get('/:id', validateCategoryId, async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT * FROM categories WHERE id = ?',
      [req.params.id]
    );

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category: categories[0] });
  } catch (err) {
    console.error('Get category error:', err);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST /api/categories - Create new category
router.post('/', validateCategory, async (req, res) => {
  try {
    const { name, description } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || null]
    );

    const [newCategory] = await pool.execute('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json({ category: newCategory[0] });
  } catch (err) {
    console.error('Create category error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id - Update category (renaming preserves product links)
router.put('/:id', validateCategoryId, validateCategory, async (req, res) => {
  try {
    const { name, description } = req.body;

    await pool.execute(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || null, req.params.id]
    );

    const [category] = await pool.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);

    if (category.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category: category[0] });
  } catch (err) {
    console.error('Update category error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id - Delete category (only if no products)
router.delete('/:id', validateCategoryId, async (req, res) => {
  try {
    const [products] = await pool.execute('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [req.params.id]);
    if (products[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with associated products' });
    }

    await pool.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;