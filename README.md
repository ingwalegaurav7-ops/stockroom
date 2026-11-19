# Stockroom

**Portfolio project** for Data Analyst, Operations Analyst, and Full Stack Developer roles. A single-location inventory, order, and restock management application with **Inventory Analytics & Operations**.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite (plain JavaScript) |
| Backend | Node.js 18+, Express |
| Database | MySQL 8 (InnoDB, transactions) |
| Reporting | Power BI Desktop |
| Charts | Chart.js + react-chartjs-2 |
| Icons | Lucide React |
| Auth | JWT in httpOnly cookies |
| Validation | express-validator |

## Features

### Authentication
- Secure JWT-based authentication with httpOnly cookies
- Role-based access (staff, manager, admin)
- Protected routes and API endpoints
- Demo staff account included

### Dashboard
- 4 KPI cards: Total Products, Units on Hand, Low Stock, Out of Stock
- Restock Priorities panel
- 7-day Units Received vs Units Sold chart
- Top Products by Units Sold bar chart
- Recent Completed Orders table

### Products
- Full CRUD with search, category filter, stock status filter
- Unique SKU enforcement, valid category, non-negative price & reorder level
- Receive Stock modal (updates inventory + records RECEIPT movement in transaction)
- Export filtered products to CSV (all pages)
- Stock status: Out of Stock (0), Low Stock (≤ reorder), In Stock (> reorder)

### Categories
- Full CRUD with product counts
- Renaming preserves product links
- Used in product forms and filters

### Orders
- Draft → Completed → Cancelled workflow
- Draft orders don't deduct stock
- Completing validates all quantities, deducts stock, records SALE movements atomically
- Unit price stored on each line (preserves historical totals)
- Concurrent completion protection via row locks
- Order details modal with line items

### Movement History
- Chronological view with product, type, quantity, reference
- Filters by product, date range, movement type
- Click product to view detailed history modal
- RECEIPT (green ↑), SALE (red ↓), RESTOCK (amber ↑), ADJUSTMENT

### Restock Requests
- Pipeline: Awaiting Approval → Approved → Awaiting Delivery → Received
- Status counts in dashboard-style cards
- Server-enforced transitions
- Receiving adds stock + logs RESTOCK movement atomically (idempotent)

### Business Insights
- **Overview**: 7 KPI cards, stock status doughnut, daily order value chart, period summary
- **Trends**: Units Received vs Sold line chart, Top 10 Products bar chart + table
- **Stock Alerts**: Current out-of-stock + low-stock products with Request Restock action

### Power BI Reporting
- 8 MySQL views for clean data import
- Documented KPI definitions with SQL verification queries
- Runnable DAX measures for all metrics
- Cross-verification query (movement vs order-based units sold)

## Quick Start (Windows)

### 1. Prerequisites
- **Node.js** v18+: https://nodejs.org
- **MySQL 8 Community Server**: https://dev.mysql.com/downloads/mysql/

### 2. Setup Database

```cmd
cd C:\Users\ingwa\OneDrive\Desktop\ClaudeProjects\stockroom-v2

:: Run schema
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < db\schema.sql

:: Run seed data (25 products, 15 historical orders, movements, restock requests)
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < db\seed.sql

:: Run views (for Power BI)
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < db\views.sql
```

### 3. Configure Environment

```cmd
copy server\.env.example server\.env
:: Edit server\.env and set your MySQL password
```

### 4. Install Dependencies & Run

```cmd
npm run install:all

:: Terminal 1 - Server
npm run dev:server

:: Terminal 2 - Client (or run both at once)
npm run dev:client
```

Or run both together:
```cmd
npm run dev
```

- **Frontend (dev)**: http://localhost:5173
- **API (dev)**: http://localhost:3001/api/health

### 5. Demo Login
- **Email**: demo@stockroom.local
- **Password**: demo123

## Project Structure

```
stockroom-v2/
├── db/                          # Database scripts
│   ├── schema.sql              # Tables: users, categories, products, orders, order_lines, movements, restock_requests
│   ├── seed.sql                # 25 products, 15 orders, movements, restock requests
│   └── views.sql               # 8 Power BI reporting views + KPI definitions + DAX
├── server/                      # Node.js/Express API
│   ├── index.js                # Entry point
│   ├── .env.example            # Environment template
│   ├── db/pool.js              # MySQL connection pool
│   ├── middleware/
│   │   ├── auth.js             # JWT auth + role guards
│   │   └── validation.js       # express-validator rules
│   └── routes/
│       ├── auth.js             # Login, logout, me
│       ├── products.js         # CRUD + search/filter + CSV export
│       ├── categories.js       # CRUD with product counts
│       ├── orders.js           # Draft/Complete/Cancel workflow
│       ├── movements.js        # Receive stock + history
│       ├── restock.js          # Request/Approve/Receive workflow
│       └── insights.js         # Overview, Trends, Stock Alerts
├── client/                      # React Frontend
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx             # Routing + protected routes + layout
│       ├── hooks/
│       │   ├── useApi.js       # API client + feature hooks
│       │   └── useAuthStore.js # Zustand auth store
│       ├── utils/format.js     # Currency, date, status formatting
│       ├── styles/index.css    # Design system (CSS custom properties)
│       ├── components/
│       │   └── Sidebar.jsx     # Grouped navigation sidebar
│       └── pages/
│           ├── SignIn.jsx      # Split desktop sign-in
│           ├── Dashboard.jsx   # KPIs, charts, recent orders
│           ├── Products.jsx    # Table + modals + CSV export
│           ├── Categories.jsx  # Table + modals
│           ├── Orders.jsx      # Table + create modal + detail modal
│           ├── Movements.jsx   # Table + product detail modal
│           ├── Restock.jsx     # Pipeline + modals
│           └── Insights.jsx    # 3 tabs with charts
├── powerbi/                     # Power BI documentation
│   └── kpi-definitions.md      # KPI definitions, SQL, DAX, import steps
├── .env.example                 # Root env template
├── package.json                 # Root scripts
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Sign in |
| `/api/auth/logout` | POST | Sign out |
| `/api/auth/me` | GET | Get current user |
| `/api/products` | GET | List products (search, filter, paginate) |
| `/api/products/export` | GET | Export filtered products as CSV |
| `/api/products/low-stock` | GET | Low stock products for dropdown |
| `/api/products/:id` | GET | Get single product |
| `/api/products` | POST | Create product |
| `/api/products/:id` | PUT | Update product |
| `/api/products/:id` | DELETE | Delete product (stock must be 0) |
| `/api/categories` | GET | List categories with product counts |
| `/api/categories/:id` | GET | Get single category |
| `/api/categories` | POST | Create category |
| `/api/categories/:id` | PUT | Update category |
| `/api/categories/:id` | DELETE | Delete category (no products) |
| `/api/orders` | GET | List orders (search, filter, paginate) |
| `/api/orders/:id` | GET | Get order with lines |
| `/api/orders` | POST | Create draft order |
| `/api/orders/:id/complete` | POST | Complete order (deduct stock) |
| `/api/orders/:id/cancel` | POST | Cancel draft order |
| `/api/orders/:id` | DELETE | Delete draft order |
| `/api/movements` | GET | List movements (filter, paginate) |
| `/api/movements/:id/history` | GET | Movement history for product |
| `/api/movements/receive/:id` | POST | Receive stock (RECEIPT) |
| `/api/movements/adjust/:id` | POST | Manual adjustment (admin) |
| `/api/restock` | GET | List restock requests (filter, paginate) |
| `/api/restock/summary` | GET | Status counts for dashboard |
| `/api/restock/:id` | GET | Get single request |
| `/api/restock` | POST | Create request |
| `/api/restock/:id/approve` | POST | Approve request (manager+) |
| `/api/restock/:id/mark-delivery` | POST | Mark awaiting delivery (manager+) |
| `/api/restock/:id/receive` | POST | Receive stock (idempotent) |
| `/api/restock/:id/cancel` | POST | Cancel request |
| `/api/insights/overview` | GET | KPI cards data |
| `/api/insights/trends` | GET | Charts data (daily movements, top products) |
| `/api/insights/stock-alerts` | GET | Current stock alerts |
| `/api/insights/stock-alerts/:id/request-restock` | POST | Quick restock from alerts |
| `/api/health` | GET | Health check |

## Demo Checklist

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open http://localhost:5173 | Sign-in page loads |
| 2 | Sign in with demo@stockroom.local / demo123 | Dashboard loads with KPIs |
| 3 | Navigate to Products | Table with 25 products, search works |
| 4 | Add category "Test Category" | Category appears in list |
| 5 | Add product "Test Product" SKU "TEST-001" in new category | Product appears at 0 stock |
| 6 | Receive 10 units for TEST-001 | Stock = 10, RECEIPT movement logged |
| 7 | Create order for TEST-001 qty 3 | Draft order created |
| 8 | Complete the order | Stock = 7, SALE movement logged |
| 9 | Check Movement History | RECEIPT + SALE visible |
| 10 | Check Business Insights → Overview | KPIs reflect changes |
| 11 | Export filtered products | CSV downloads with filtered rows |
| 12 | Try duplicate SKU | Error: "SKU already exists" |
| 13 | Try order exceeding stock | Error: "Insufficient stock" |
| 14 | Complete same order twice | Second attempt fails |
| 15 | Receive same restock twice | Second attempt fails (idempotent) |
| 16 | Sign out, access /dashboard | Redirected to sign-in |

## Power BI Setup

1. Open Power BI Desktop
2. **Get Data** → **MySQL Database**
3. Server: `localhost`, Database: `stockroom_v2`
4. Select these views:
   - `v_daily_movements`
   - `v_daily_orders`
   - `v_current_stock`
   - `v_product_sales`
   - `v_product_receipts`
   - `v_restock_requests`
   - `v_order_details`
   - `v_monthly_summary`
5. Create **Date Table**: `Date Table = CALENDARAUTO()` → Mark as Date Table
6. Create relationships to date columns
7. Add DAX measures from `powerbi/kpi-definitions.md`
8. Build report pages: Overview, Trends, Stock Alerts, Restock Pipeline

## Interview Highlights

### Technical
- **Atomic transactions**: Stock updates + movement logging in single DB transaction
- **Row-level locking**: `SELECT ... FOR UPDATE` prevents overselling under concurrency
- **Idempotent operations**: Restock receive checks status before processing
- **Historical pricing**: Order lines store unit_price at time of order
- **State machine**: Restock requests enforce valid transitions server-side
- **Reporting views**: Decoupled from app schema for stable BI imports

### Architecture
- **Separation of concerns**: Routes, middleware, database layer
- **React hooks**: Reusable data fetching (`useProducts`, `useOrders`, etc.)
- **Zustand store**: Lightweight auth state with persistence
- **Design system**: CSS custom properties, consistent spacing/typography
- **Responsive**: Mobile-first sidebar, scrollable tables, collapsible filters

---

## Live Demo

**URL**: [https://stockroom-dyv0.onrender.com](https://stockroom-dyv0.onrender.com)

**Demo Login**:
- **Email**: `demo@stockroom.local`
- **Password**: `demo123`

**Deployed Stack**:
- **Frontend + API**: Render Free (single HTTPS origin)
- **Database**: TiDB Cloud Starter (MySQL-compatible, seeded with demo data)
- **Auth**: JWT in httpOnly cookies

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)