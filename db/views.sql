USE stockroom_v2;

-- ============================================================
-- POWER BI REPORTING VIEWS
-- ============================================================
-- These views provide clean, denormalized data for Power BI imports
-- All KPI definitions match the Business Insights page calculations
-- ============================================================

-- 1. Daily Movements View
-- Aggregates stock movements by day, product, and type
-- Used for: Trends tab (Units Received vs Units Sold over time)
CREATE OR REPLACE VIEW v_daily_movements AS
SELECT
    DATE(m.created_at) AS movement_date,
    m.type AS movement_type,
    p.id AS product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    c.name AS category_name,
    SUM(m.quantity) AS total_quantity,
    COUNT(*) AS movement_count
FROM movements m
JOIN products p ON m.product_id = p.id
JOIN categories c ON p.category_id = c.id
WHERE m.type IN ('RECEIPT', 'SALE', 'RESTOCK')
GROUP BY DATE(m.created_at), m.type, p.id, p.name, p.sku, c.name;

-- 2. Daily Orders View
-- Completed orders aggregated by day
-- Used for: Overview (Completed Order Value), Trends
CREATE OR REPLACE VIEW v_daily_orders AS
SELECT
    DATE(o.completed_at) AS order_date,
    COUNT(DISTINCT o.id) AS completed_orders,
    SUM(o.total_amount) AS total_order_value,
    SUM(o.subtotal) AS total_subtotal,
    SUM(o.tax_amount) AS total_tax,
    SUM(ol.quantity) AS total_units_sold
FROM orders o
JOIN order_lines ol ON o.id = ol.order_id
WHERE o.status = 'COMPLETED'
  AND o.completed_at IS NOT NULL
GROUP BY DATE(o.completed_at);

-- 3. Current Stock Status View
-- Current stock levels with status classification
-- Used for: Stock Alerts tab, Dashboard KPIs
CREATE OR REPLACE VIEW v_current_stock AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    c.name AS category_name,
    p.unit_price,
    p.current_stock,
    p.reorder_level,
    CASE
        WHEN p.current_stock = 0 THEN 'OUT_OF_STOCK'
        WHEN p.current_stock <= p.reorder_level THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END AS stock_status,
    (p.current_stock * p.unit_price) AS stock_value,
    GREATEST(p.reorder_level - p.current_stock + 1, 0) AS suggested_reorder_qty
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.current_stock <= p.reorder_level OR p.current_stock = 0;

-- 4. Product Sales Summary View
-- Units sold per product (from completed orders only)
-- Used for: Top Products by Units Sold (Trends tab)
CREATE OR REPLACE VIEW v_product_sales AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    c.name AS category_name,
    p.unit_price AS current_price,
    COALESCE(SUM(ol.quantity), 0) AS units_sold,
    COALESCE(SUM(ol.line_total), 0) AS revenue,
    COUNT(DISTINCT o.id) AS order_count
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN order_lines ol ON p.id = ol.product_id
LEFT JOIN orders o ON ol.order_id = o.id AND o.status = 'COMPLETED'
GROUP BY p.id, p.name, p.sku, c.name, p.unit_price;

-- 5. Product Receipts Summary View
-- Units received per product (RECEIPT + RESTOCK movements)
-- Used for: Trends (Units Received)
CREATE OR REPLACE VIEW v_product_receipts AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    c.name AS category_name,
    COALESCE(SUM(CASE WHEN m.type = 'RECEIPT' THEN m.quantity ELSE 0 END), 0) AS units_received_purchase,
    COALESCE(SUM(CASE WHEN m.type = 'RESTOCK' THEN m.quantity ELSE 0 END), 0) AS units_received_restock,
    COALESCE(SUM(CASE WHEN m.type IN ('RECEIPT','RESTOCK') THEN m.quantity ELSE 0 END), 0) AS total_units_received
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN movements m ON p.id = m.product_id AND m.type IN ('RECEIPT', 'RESTOCK')
GROUP BY p.id, p.name, p.sku, c.name;

-- 6. Restock Request Status View
-- Current restock request pipeline
-- Used for: Restock Requests page, Dashboard restock panel
CREATE OR REPLACE VIEW v_restock_requests AS
SELECT
    rr.id AS request_id,
    p.id AS product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    c.name AS category_name,
    p.current_stock,
    p.reorder_level,
    rr.requested_qty,
    rr.status,
    rr.requested_by,
    u1.name AS requested_by_name,
    rr.approved_by,
    u2.name AS approved_by_name,
    rr.received_by,
    u3.name AS received_by_name,
    rr.requested_at,
    rr.approved_at,
    rr.received_at,
    CASE
        WHEN rr.status = 'REQUESTED' THEN 'Awaiting Approval'
        WHEN rr.status = 'APPROVED' THEN 'Awaiting Delivery'
        WHEN rr.status = 'AWAITING_DELIVERY' THEN 'Awaiting Delivery'
        WHEN rr.status = 'RECEIVED' THEN 'Received'
        WHEN rr.status = 'CANCELLED' THEN 'Cancelled'
    END AS status_label
FROM restock_requests rr
JOIN products p ON rr.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN users u1 ON rr.requested_by = u1.id
LEFT JOIN users u2 ON rr.approved_by = u2.id
LEFT JOIN users u3 ON rr.received_by = u3.id;

-- 7. Order Details View
-- Complete order information for reporting
-- Used for: Orders page, detailed reports
CREATE OR REPLACE VIEW v_order_details AS
SELECT
    o.id AS order_id,
    o.order_number,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.status,
    o.subtotal,
    o.tax_amount,
    o.total_amount,
    o.notes,
    o.created_by,
    u.name AS created_by_name,
    o.created_at,
    o.completed_at,
    o.cancelled_at,
    COUNT(ol.id) AS line_count,
    SUM(ol.quantity) AS total_quantity
FROM orders o
JOIN users u ON o.created_by = u.id
LEFT JOIN order_lines ol ON o.id = ol.order_id
GROUP BY o.id, o.order_number, o.customer_name, o.customer_email, o.customer_phone,
         o.status, o.subtotal, o.tax_amount, o.total_amount, o.notes,
         o.created_by, u.name, o.created_at, o.completed_at, o.cancelled_at;

-- 8. Monthly Summary View
-- Aggregated metrics by month for high-level trends
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
    YEAR(dm.movement_date) AS `year`,
    MONTH(dm.movement_date) AS `month`,
    DATE_FORMAT(dm.movement_date, '%Y-%m') AS `year_month`,
    SUM(CASE WHEN dm.movement_type = 'SALE' THEN dm.total_quantity ELSE 0 END) AS units_sold,
    SUM(CASE WHEN dm.movement_type IN ('RECEIPT','RESTOCK') THEN dm.total_quantity ELSE 0 END) AS units_received,
    COUNT(DISTINCT CASE WHEN dm.movement_type = 'SALE' THEN dm.product_id END) AS products_sold,
    COUNT(DISTINCT CASE WHEN dm.movement_type IN ('RECEIPT','RESTOCK') THEN dm.product_id END) AS products_received
FROM v_daily_movements dm
GROUP BY YEAR(dm.movement_date), MONTH(dm.movement_date), DATE_FORMAT(dm.movement_date, '%Y-%m')
ORDER BY YEAR(dm.movement_date), MONTH(dm.movement_date);

-- ============================================================
-- KPI DEFINITIONS (for documentation and Power BI measures)
-- ============================================================
/*
KPI: Total Products
Definition: Count of all active products
SQL: SELECT COUNT(*) FROM products;

KPI: Units on Hand
Definition: Sum of current_stock across all products
SQL: SELECT SUM(current_stock) FROM products;

KPI: Low Stock Count
Definition: Count of products where 0 < current_stock <= reorder_level
SQL: SELECT COUNT(*) FROM products WHERE current_stock > 0 AND current_stock <= reorder_level;

KPI: Out of Stock Count
Definition: Count of products where current_stock = 0
SQL: SELECT COUNT(*) FROM products WHERE current_stock = 0;

KPI: Units Sold (Period)
Definition: Sum of quantities from SALE movements in period
   OR sum of quantities from completed order lines in period
   Both should match if data is consistent
SQL (movements): SELECT SUM(quantity) FROM movements WHERE type = 'SALE' AND created_at BETWEEN ? AND ?
SQL (orders): SELECT SUM(ol.quantity) FROM order_lines ol JOIN orders o ON ol.order_id = o.id WHERE o.status = 'COMPLETED' AND o.completed_at BETWEEN ? AND ?

KPI: Units Received (Period)
Definition: Sum of quantities from RECEIPT and RESTOCK movements in period
SQL: SELECT SUM(quantity) FROM movements WHERE type IN ('RECEIPT','RESTOCK') AND created_at BETWEEN ? AND ?

KPI: Completed Order Value (Period)
Definition: Sum of total_amount from completed orders in period
SQL: SELECT SUM(total_amount) FROM orders WHERE status = 'COMPLETED' AND completed_at BETWEEN ? AND ?

KPI: Current Low-Stock Products
Definition: Products where 0 < current_stock <= reorder_level (current snapshot)
SQL: SELECT * FROM products WHERE current_stock > 0 AND current_stock <= reorder_level;

KPI: Current Out-of-Stock Products
Definition: Products where current_stock = 0 (current snapshot)
SQL: SELECT * FROM products WHERE current_stock = 0;
*/

-- ============================================================
-- DAX MEASURES FOR POWER BI
-- ============================================================
/*
-- Paste these into Power BI Desktop after importing the views above

-- Units Sold (uses v_daily_movements)
Units Sold =
CALCULATE(
    SUM(v_daily_movements[total_quantity]),
    v_daily_movements[movement_type] = "SALE"
)

-- Units Received (uses v_daily_movements)
Units Received =
CALCULATE(
    SUM(v_daily_movements[total_quantity]),
    v_daily_movements[movement_type] IN {"RECEIPT", "RESTOCK"}
)

-- Completed Order Value (uses v_daily_orders)
Completed Order Value =
SUM(v_daily_orders[total_order_value])

-- Current Low Stock Products (uses v_current_stock)
Current Low Stock Count =
CALCULATE(
    COUNTROWS(v_current_stock),
    v_current_stock[stock_status] = "LOW_STOCK"
)

Current Out of Stock Count =
CALCULATE(
    COUNTROWS(v_current_stock),
    v_current_stock[stock_status] = "OUT_OF_STOCK"
)

-- Top Products by Units Sold (uses v_product_sales)
Top Products Units Sold =
SUMX(
    TOPN(10, v_product_sales, v_product_sales[units_sold], DESC),
    v_product_sales[units_sold]
)

-- Net Stock Change (Period)
Net Stock Change = [Units Received] - [Units Sold]

-- Stock Turnover Ratio (simplified)
Stock Turnover =
DIVIDE(
    [Units Sold],
    AVERAGEX(VALUES(v_current_stock[product_id]), v_current_stock[current_stock])
)

-- Days of Stock Remaining (for low-stock items)
Days of Stock Remaining =
DIVIDE(
    v_current_stock[current_stock],
    DIVIDE(v_product_sales[units_sold], 30)  -- avg daily sales over 30 days
)

-- Restock Pipeline Counts
Awaiting Approval Count =
CALCULATE(COUNTROWS(v_restock_requests), v_restock_requests[status] = "REQUESTED")

Awaiting Delivery Count =
CALCULATE(COUNTROWS(v_restock_requests), v_restock_requests[status] IN {"APPROVED", "AWAITING_DELIVERY"})

Received Count =
CALCULATE(COUNTROWS(v_restock_requests), v_restock_requests[status] = "RECEIVED")
*/