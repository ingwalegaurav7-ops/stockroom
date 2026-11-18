# Stockroom v2 - Power BI KPI Definitions

This document defines all KPIs used in the Business Insights page and their corresponding SQL queries for verification.

---

## 1. Total Products
**Definition**: Count of all products in the system  
**Business Insights Tab**: Overview  
**SQL**:
```sql
SELECT COUNT(*) AS total_products FROM products;
```

**DAX**:
```dax
Total Products = COUNTROWS(products)
```

---

## 2. Units on Hand
**Definition**: Sum of current_stock across all products  
**Business Insights Tab**: Overview  
**SQL**:
```sql
SELECT SUM(current_stock) AS units_on_hand FROM products;
```

**DAX**:
```dax
Units on Hand = SUM(products[current_stock])
```

---

## 3. Low Stock Count
**Definition**: Count of products where 0 < current_stock ≤ reorder_level  
**Business Insights Tab**: Overview, Stock Alerts  
**SQL**:
```sql
SELECT COUNT(*) AS low_stock_count
FROM products
WHERE current_stock > 0 AND current_stock <= reorder_level;
```

**DAX**:
```dax
Low Stock Count =
CALCULATE(
    COUNTROWS(products),
    products[current_stock] > 0,
    products[current_stock] <= products[reorder_level]
)
```

---

## 4. Out of Stock Count
**Definition**: Count of products where current_stock = 0  
**Business Insights Tab**: Overview, Stock Alerts  
**SQL**:
```sql
SELECT COUNT(*) AS out_of_stock_count
FROM products
WHERE current_stock = 0;
```

**DAX**:
```dax
Out of Stock Count =
CALCULATE(
    COUNTROWS(products),
    products[current_stock] = 0
)
```

---

## 5. Units Sold (Period)
**Definition**: Total units sold in a given date range from completed orders  
**Business Insights Tab**: Overview, Trends  
**SQL** (using order lines - source of truth):
```sql
SELECT SUM(ol.quantity) AS units_sold
FROM order_lines ol
JOIN orders o ON ol.order_id = o.id
WHERE o.status = 'COMPLETED'
  AND o.completed_at BETWEEN '2024-11-01' AND '2024-11-30';
```

**SQL** (using movements - should match):
```sql
SELECT SUM(quantity) AS units_sold
FROM movements
WHERE type = 'SALE'
  AND created_at BETWEEN '2024-11-01' AND '2024-11-30';
```

**DAX**:
```dax
Units Sold =
CALCULATE(
    SUM(v_daily_movements[total_quantity]),
    v_daily_movements[movement_type] = "SALE"
)
```

---

## 6. Units Received (Period)
**Definition**: Total units received via RECEIPT and RESTOCK movements in a given date range  
**Business Insights Tab**: Overview, Trends  
**SQL**:
```sql
SELECT SUM(quantity) AS units_received
FROM movements
WHERE type IN ('RECEIPT', 'RESTOCK')
  AND created_at BETWEEN '2024-11-01' AND '2024-11-30';
```

**DAX**:
```dax
Units Received =
CALCULATE(
    SUM(v_daily_movements[total_quantity]),
    v_daily_movements[movement_type] IN {"RECEIPT", "RESTOCK"}
)
```

---

## 7. Completed Order Value (Period)
**Definition**: Sum of total_amount from completed orders in a given date range  
**Business Insights Tab**: Overview, Trends  
**SQL**:
```sql
SELECT SUM(total_amount) AS completed_order_value
FROM orders
WHERE status = 'COMPLETED'
  AND completed_at BETWEEN '2024-11-01' AND '2024-11-30';
```

**DAX**:
```dax
Completed Order Value = SUM(v_daily_orders[total_order_value])
```

---

## 8. Current Low-Stock Products (Snapshot)
**Definition**: Products where 0 < current_stock ≤ reorder_level (current state, not historical)  
**Business Insights Tab**: Stock Alerts  
**SQL**:
```sql
SELECT p.id, p.name, p.sku, c.name AS category,
       p.current_stock, p.reorder_level, p.unit_price
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.current_stock > 0 AND p.current_stock <= p.reorder_level
ORDER BY p.current_stock ASC, p.name;
```

**DAX** (using v_current_stock view):
```dax
Current Low Stock Products =
CALCULATETABLE(
    v_current_stock,
    v_current_stock[stock_status] = "LOW_STOCK"
)
```

---

## 9. Current Out-of-Stock Products (Snapshot)
**Definition**: Products where current_stock = 0 (current state, not historical)  
**Business Insights Tab**: Stock Alerts  
**SQL**:
```sql
SELECT p.id, p.name, p.sku, c.name AS category,
       p.current_stock, p.reorder_level, p.unit_price
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.current_stock = 0
ORDER BY p.name;
```

**DAX**:
```dax
Current Out of Stock Products =
CALCULATETABLE(
    v_current_stock,
    v_current_stock[stock_status] = "OUT_OF_STOCK"
)
```

---

## 10. Top Products by Units Sold (Period)
**Definition**: Products ranked by units sold in a given period  
**Business Insights Tab**: Trends  
**SQL**:
```sql
SELECT p.id, p.name, p.sku, c.name AS category,
       SUM(ol.quantity) AS units_sold,
       SUM(ol.line_total) AS revenue
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN order_lines ol ON p.id = ol.product_id
JOIN orders o ON ol.order_id = o.id
WHERE o.status = 'COMPLETED'
  AND o.completed_at BETWEEN '2024-11-01' AND '2024-11-30'
GROUP BY p.id, p.name, p.sku, c.name
ORDER BY units_sold DESC
LIMIT 10;
```

**DAX** (using v_product_sales view):
```dax
Top 10 Products by Units Sold =
TOPN(
    10,
    v_product_sales,
    v_product_sales[units_sold],
    DESC
)
```

---

## Cross-Verification Query

Run this to verify that movement-based and order-based units sold match for the same period:

```sql
WITH movement_sales AS (
    SELECT SUM(quantity) AS units_sold
    FROM movements
    WHERE type = 'SALE'
      AND created_at BETWEEN '2024-11-01' AND '2024-11-30'
),
order_sales AS (
    SELECT SUM(ol.quantity) AS units_sold
    FROM order_lines ol
    JOIN orders o ON ol.order_id = o.id
    WHERE o.status = 'COMPLETED'
      AND o.completed_at BETWEEN '2024-11-01' AND '2024-11-30'
)
SELECT
    m.units_sold AS movement_units_sold,
    o.units_sold AS order_units_sold,
    CASE WHEN m.units_sold = o.units_sold THEN 'MATCH' ELSE 'MISMATCH' END AS verification
FROM movement_sales m, order_sales o;
```

**Expected Result**: `MATCH` - both methods should return identical numbers.

---

## Power BI Desktop Import Steps

1. **Open Power BI Desktop**
2. **Get Data** → **MySQL Database**
3. **Server**: `localhost` (or your MySQL host)
4. **Database**: `stockroom_v2`
5. **Authentication**: Database credentials
6. **Navigator**: Select these views:
   - `v_daily_movements`
   - `v_daily_orders`
   - `v_current_stock`
   - `v_product_sales`
   - `v_product_receipts`
   - `v_restock_requests`
   - `v_order_details`
   - `v_monthly_summary`
7. **Load** (or Transform if needed)

### Refresh Configuration
- **Scheduled Refresh**: Configure in Power BI Service after publishing
- **Gateway**: Required for on-premises MySQL (use On-premises data gateway)
- **Incremental Refresh**: Not needed for this dataset size; full refresh is fast

### Report Pages to Create
1. **Overview**: KPI cards (Total Products, Units on Hand, Low Stock, Out of Stock, Units Sold, Units Received, Completed Order Value)
2. **Trends**: Line chart (Units Received vs Units Sold over time), Bar chart (Top 10 Products by Units Sold)
3. **Stock Alerts**: Table with conditional formatting (red for Out of Stock, amber for Low Stock)
4. **Restock Pipeline**: Stacked bar by status (Awaiting Approval, Awaiting Delivery, Received)

---

## Data Model Relationships

```
v_daily_movements (1) ──────< (M) v_product_sales
       │                              │
       │                              │
       ▼                              ▼
  (Date Table)                   products
                                      │
                                      ▼
                                 categories
```

Create a **Date Table** in Power BI for proper time intelligence:
```dax
Date Table = CALENDARAUTO()
```

Mark as Date Table and create relationships to `v_daily_movements[movement_date]` and `v_daily_orders[order_date]`.