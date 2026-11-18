import { body, param, query, validationResult } from 'express-validator';

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// Auth validation
export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required'),
  handleValidationErrors,
];

// Product validation
export const validateProduct = [
  body('name').trim().isLength({ min: 1, max: 120 }).withMessage('Name required (max 120 chars)'),
  body('sku').trim().isLength({ min: 1, max: 40 }).withMessage('SKU required (max 40 chars)'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category required'),
  body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
  body('reorder_level').isInt({ min: 0 }).withMessage('Reorder level must be non-negative integer'),
  body('current_stock').optional().isInt({ min: 0 }).withMessage('Current stock must be non-negative integer'),
  handleValidationErrors,
];

export const validateProductId = [
  param('id').isInt({ min: 1 }).withMessage('Valid product ID required'),
  handleValidationErrors,
];

// Category validation
export const validateCategory = [
  body('name').trim().isLength({ min: 1, max: 80 }).withMessage('Name required (max 80 chars)'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description max 500 chars'),
  handleValidationErrors,
];

export const validateCategoryId = [
  param('id').isInt({ min: 1 }).withMessage('Valid category ID required'),
  handleValidationErrors,
];

// Order validation
export const validateOrder = [
  body('customer_name').trim().isLength({ min: 1, max: 120 }).withMessage('Customer name required (max 120 chars)'),
  body('customer_email').optional().isEmail().normalizeEmail().withMessage('Valid email if provided'),
  body('customer_phone').optional().trim().isLength({ max: 30 }).withMessage('Phone max 30 chars'),
  body('lines').isArray({ min: 1 }).withMessage('At least one order line required'),
  body('lines.*.product_id').isInt({ min: 1 }).withMessage('Valid product ID required for each line'),
  body('lines.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive integer for each line'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes max 500 chars'),
  handleValidationErrors,
];

export const validateOrderId = [
  param('id').isInt({ min: 1 }).withMessage('Valid order ID required'),
  handleValidationErrors,
];

// Movement validation
export const validateReceiveStock = [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive integer'),
  body('reference_number').optional().trim().isLength({ max: 80 }).withMessage('Reference max 80 chars'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes max 500 chars'),
  handleValidationErrors,
];

// Restock request validation
export const validateRestockRequest = [
  body('product_id').isInt({ min: 1 }).withMessage('Valid product ID required'),
  body('requested_qty').isInt({ min: 1 }).withMessage('Requested quantity must be positive integer'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes max 500 chars'),
  handleValidationErrors,
];

export const validateRestockId = [
  param('id').isInt({ min: 1 }).withMessage('Valid restock request ID required'),
  handleValidationErrors,
];

// Query validation for listing/filtering
export const validateProductQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit 1-1000'),
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search max 120 chars'),
  query('category_id').optional().if(value => value && value !== '').isInt({ min: 1 }).withMessage('Valid category ID'),
  query('status').optional().if(value => value && value !== '').isIn(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).withMessage('Invalid status'),
  query('sort').optional().if(value => value && value !== '').isIn(['name', 'sku', 'current_stock', 'unit_price', 'category', 'reorder_level']).withMessage('Invalid sort field'),
  query('order').optional().if(value => value && value !== '').isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors,
];

export const validateOrderQuery = [
  query('page').optional().if(value => value && value !== '').isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().if(value => value && value !== '').isInt({ min: 1, max: 100 }).withMessage('Limit 1-100'),
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search max 120 chars'),
  query('status').optional().if(value => value && value !== '').isIn(['DRAFT', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
  query('date_from').optional().if(value => value && value !== '').isISO8601().withMessage('date_from must be ISO8601 date'),
  query('date_to').optional().if(value => value && value !== '').isISO8601().withMessage('date_to must be ISO8601 date'),
  handleValidationErrors,
];

export const validateMovementQuery = [
  query('page').optional().if(value => value && value !== '').isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().if(value => value && value !== '').isInt({ min: 1, max: 100 }).withMessage('Limit 1-100'),
  query('product_id').optional().if(value => value && value !== '').isInt({ min: 1 }).withMessage('Valid product ID'),
  query('type').optional().if(value => value && value !== '').isIn(['RECEIPT', 'SALE', 'RESTOCK', 'ADJUSTMENT']).withMessage('Invalid type'),
  query('date_from').optional().if(value => value && value !== '').isISO8601().withMessage('date_from must be ISO8601 date'),
  query('date_to').optional().if(value => value && value !== '').isISO8601().withMessage('date_to must be ISO8601 date'),
  handleValidationErrors,
];

export const validateRestockQuery = [
  query('page').optional().if(value => value && value !== '').isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().if(value => value && value !== '').isInt({ min: 1, max: 100 }).withMessage('Limit 1-100'),
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search max 120 chars'),
  query('status').optional().if(value => value && value !== '').isIn(['REQUESTED', 'APPROVED', 'AWAITING_DELIVERY', 'RECEIVED', 'CANCELLED']).withMessage('Invalid status'),
  handleValidationErrors,
];

export const validateInsightsQuery = [
  query('period').optional().isIn(['7d', '30d', '90d', 'custom']).withMessage('Invalid period'),
  query('date_from').optional().isISO8601().withMessage('date_from must be ISO8601 date'),
  query('date_to').optional().isISO8601().withMessage('date_to must be ISO8601 date'),
  handleValidationErrors,
];