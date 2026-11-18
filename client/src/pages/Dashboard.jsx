import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Box,
  AlertTriangle,
  XCircle,
  ShoppingCart,
  Truck,
  ExternalLink,
  X,
  PackageCheck,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useInsights, useOrders, useProducts, useMovements } from '../hooks/useApi';
import { formatCurrency, formatNumber, formatDateShort } from '../utils/format';
import {
  COLORS,
  PERIODS,
  lineOptions,
  barOptions,
  barValueLabels,
  fillDailySeries,
} from '../utils/chartTheme';
import { PageHeader, StatCard, Panel, Skeleton, EmptyState, toast } from '../components/ui';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const truncate = (text, max = 22) => (text.length > max ? `${text.slice(0, max)}…` : text);

export function Dashboard() {
  const { getOverview, getTrends, getStockAlerts, requestRestock } = useInsights();
  const { list: listOrders } = useOrders();
  const { list: listProducts } = useProducts();
  const { receive } = useMovements();

  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [period, setPeriod] = useState('7d');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [receivingProduct, setReceivingProduct] = useState(null);
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveRef, setReceiveRef] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestingId, setRequestingId] = useState(null);

  const periodMeta = PERIODS.find((p) => p.value === period) || PERIODS[0];

  // Products for the Receive Stock dropdown
  useEffect(() => {
    let cancelled = false;
    listProducts({ limit: 1000 })
      .then((res) => {
        if (!cancelled) setProducts(res.products);
      })
      .catch((err) => {
        if (!cancelled) setProductsError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [listProducts]);

  const fetchAll = useCallback(async () => {
    const [overviewRes, trendsRes, ordersRes, alertsRes] = await Promise.all([
      getOverview({ period }),
      getTrends({ period }),
      listOrders({ limit: 5, status: 'COMPLETED' }),
      getStockAlerts().catch(() => null),
    ]);
    setOverview(overviewRes.kpis);
    setTrends(trendsRes);
    setRecentOrders(ordersRes.orders || []);
    setAlerts(alertsRes);
  }, [period, getOverview, getTrends, listOrders, getStockAlerts]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetchAll()
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Could not load dashboard data');
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchAll, reloadKey]);

  const refreshAll = () => {
    fetchAll().catch(() => {});
    listProducts({ limit: 1000 })
      .then((res) => setProducts(res.products))
      .catch(() => {});
  };

  // ---------- Derived chart data ----------
  const series = useMemo(
    () => fillDailySeries(trends?.daily_movements || [], periodMeta.days),
    [trends, periodMeta.days]
  );

  const lineChartData = useMemo(
    () => ({
      labels: series.map((d) => d.label),
      datasets: [
        {
          label: 'Units Received',
          data: series.map((d) => d.units_received),
          borderColor: COLORS.received,
          backgroundColor: COLORS.receivedFill,
          fill: true,
          tension: 0.35,
          pointBorderColor: COLORS.received,
        },
        {
          label: 'Units Sold',
          data: series.map((d) => d.units_sold),
          borderColor: COLORS.sold,
          backgroundColor: COLORS.soldFill,
          fill: true,
          tension: 0.35,
          pointBorderColor: COLORS.sold,
        },
      ],
    }),
    [series]
  );

  const topProducts = useMemo(
    () =>
      [...(trends?.top_products || [])]
        .sort((a, b) => (b.units_sold || 0) - (a.units_sold || 0))
        .slice(0, 6),
    [trends]
  );

  const barChartData = useMemo(
    () => ({
      labels: topProducts.map((p) => truncate(p.name)),
      datasets: [
        {
          label: 'Units Sold',
          data: topProducts.map((p) => p.units_sold || 0),
          backgroundColor: COLORS.received,
          borderRadius: 6,
          barThickness: 16,
        },
      ],
    }),
    [topProducts]
  );

  const priorities = useMemo(
    () => [...(alerts?.out_of_stock || []), ...(alerts?.low_stock || [])].slice(0, 5),
    [alerts]
  );

  const hasMovements = series.some((d) => d.units_sold > 0 || d.units_received > 0);

  // ---------- Actions ----------
  const openReceiveModal = () => {
    setReceivingProduct(null);
    setReceiveQty('');
    setReceiveRef('');
    setReceiveNotes('');
    setShowReceiveModal(true);
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(receiveQty, 10);
    if (!qty || qty < 1 || !receivingProduct) return;

    setSubmitting(true);
    try {
      await receive(receivingProduct.id, {
        quantity: qty,
        reference_number: receiveRef.trim() || null,
        notes: receiveNotes.trim() || null,
      });
      toast(`Received ${qty} units of ${receivingProduct.name}`);
      setShowReceiveModal(false);
      refreshAll();
    } catch (err) {
      toast(err.message || 'Could not receive stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRestock = async (product) => {
    setRequestingId(product.id);
    try {
      const suggestedQty = Math.max(product.reorder_level - product.current_stock + 10, 10);
      await requestRestock(product.id, {
        requested_qty: suggestedQty,
        notes: 'Requested from Dashboard',
      });
      toast(`Restock requested for ${product.name}`);
      getStockAlerts()
        .then(setAlerts)
        .catch(() => {});
    } catch (err) {
      toast(err.message || 'Could not request restock', 'error');
    } finally {
      setRequestingId(null);
    }
  };

  // ---------- Render ----------
  const loading = !loaded && !overview;

  const kpis = [
    {
      title: 'Total Products',
      value: formatNumber(overview?.total_products ?? 0),
      icon: Package,
      tone: 'primary',
      to: '/products',
      hint: 'View catalogue',
    },
    {
      title: 'Units on Hand',
      value: formatNumber(overview?.units_on_hand ?? 0),
      icon: Box,
      tone: 'success',
      to: '/products',
      hint: 'Across all products',
    },
    {
      title: 'Low Stock',
      value: formatNumber(overview?.low_stock_count ?? 0),
      icon: AlertTriangle,
      tone: 'warning',
      to: '/insights',
      hint: (overview?.low_stock_count ?? 0) > 0 ? 'Needs attention' : 'All good',
      hintTone: (overview?.low_stock_count ?? 0) > 0 ? 'warning' : 'success',
    },
    {
      title: 'Out of Stock',
      value: formatNumber(overview?.out_of_stock_count ?? 0),
      icon: XCircle,
      tone: 'danger',
      to: '/insights',
      hint: (overview?.out_of_stock_count ?? 0) > 0 ? 'Restock now' : 'All good',
      hintTone: (overview?.out_of_stock_count ?? 0) > 0 ? 'danger' : 'success',
    },
  ];

  if (loadError && !overview) {
    return (
      <div className="dashboard-page">
        <PageHeader title="Dashboard" subtitle="Overview of your store performance" />
        <Panel title="Dashboard unavailable">
          <EmptyState
            icon={AlertTriangle}
            title="We couldn't load your dashboard"
            text={loadError}
            action={
              <button className="btn btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
                <RefreshCw size={16} /> Try again
              </button>
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your store performance"
        actions={
          <>
            <div className="segmented" role="group" aria-label="Time period">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  aria-pressed={period === p.value}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button className="btn btn-receive" onClick={openReceiveModal}>
              <Truck size={18} /> Receive Stock
            </button>
            <button className="btn btn-primary" onClick={() => setShowOrderModal(true)}>
              <ShoppingCart size={18} /> New Order
            </button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="stat-grid" role="region" aria-label="Key performance indicators">
        {kpis.map((kpi) => (
          <StatCard key={kpi.title} {...kpi} loading={loading} />
        ))}
      </div>

      <div className="dashboard-columns">
        {/* Left: movement chart */}
        <Panel
          title="Units Received vs. Units Sold"
          subtitle={periodMeta.long}
          to="/insights"
          className="dashboard-chart-panel"
        >
          {loading ? (
            <Skeleton height={320} />
          ) : hasMovements ? (
            <div
              className="chart-container"
              role="img"
              aria-label={`Line chart of units received and sold, ${periodMeta.long}`}
            >
              <Line data={lineChartData} options={lineOptions({ showPoints: periodMeta.days <= 14 })} />
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No stock movement yet"
              text={`Nothing was received or sold in the ${periodMeta.long.toLowerCase()}.`}
            />
          )}
        </Panel>

        {/* Right: priorities + top products */}
        <div className="dashboard-stack">
          <Panel
            title="Restock Priorities"
            subtitle={
              priorities.length > 0
                ? `${(alerts?.out_of_stock || []).length} out of stock, ${(alerts?.low_stock || []).length} low`
                : undefined
            }
            to="/restock"
            linkLabel="View all"
            flush
            footer={
              priorities.length > 0 ? (
                <Link to="/insights" className="panel-link" style={{ justifyContent: 'center' }}>
                  View all stock alerts
                </Link>
              ) : null
            }
          >
            {loading ? (
              <div style={{ padding: 'var(--space-5)', display: 'grid', gap: 12 }}>
                <Skeleton height={20} />
                <Skeleton height={20} />
                <Skeleton height={20} />
              </div>
            ) : priorities.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="num">Stock</th>
                      <th>Status</th>
                      <th aria-label="Action"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorities.map((p) => {
                      const out = p.current_stock <= 0;
                      return (
                        <tr key={p.id}>
                          <td>
                            <span className="cell-primary">{truncate(p.name, 26)}</span>
                            <span className="cell-secondary">Reorder at {formatNumber(p.reorder_level)}</span>
                          </td>
                          <td className="num">{formatNumber(p.current_stock)}</td>
                          <td>
                            <span className={`badge ${out ? 'badge-danger' : 'badge-warning'}`}>
                              {out ? 'Out' : 'Low'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => handleRequestRestock(p)}
                              disabled={requestingId === p.id}
                            >
                              {requestingId === p.id ? 'Requesting…' : 'Restock'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={PackageCheck}
                title="Stock levels look healthy"
                text="No products are below their reorder level."
              />
            )}
          </Panel>

          <Panel title="Top Products by Units Sold" subtitle={periodMeta.long} to="/insights">
            {loading ? (
              <Skeleton height={260} />
            ) : topProducts.length > 0 ? (
              <div
                className="chart-container-sm"
                role="img"
                aria-label="Bar chart of top products by units sold"
              >
                <Bar
                  data={barChartData}
                  options={barOptions({ titles: topProducts.map((p) => p.name) })}
                  plugins={[barValueLabels]}
                />
              </div>
            ) : (
              <EmptyState icon={BarChart3} title="No sales in this period" text="Sales will appear here." />
            )}
          </Panel>
        </div>
      </div>

      {/* Recent completed orders */}
      <Panel title="Recent Completed Orders" to="/orders" linkLabel="View all orders" flush>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th className="num">Items</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th aria-label="Open"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <Skeleton height={18} />
                    </td>
                  </tr>
                ))
              ) : recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                        {order.order_number}
                      </span>
                    </td>
                    <td>{order.customer_name}</td>
                    <td>{formatDateShort(order.completed_at || order.created_at)}</td>
                    <td className="num">{formatNumber(order.total_quantity || 0)}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{formatCurrency(order.total_amount)}</td>
                    <td>
                      <span className={`order-status ${order.status.toLowerCase()}`}>{order.status}</span>
                    </td>
                    <td>
                      <Link
                        to={`/orders/${order.id}`}
                        className="btn btn-sm btn-ghost"
                        aria-label={`View order ${order.order_number}`}
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500" style={{ padding: 'var(--space-8)' }}>
                    No completed orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Receive Stock Modal */}
      {showReceiveModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowReceiveModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="receive-title"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="receive-title" className="modal-title">Receive Stock</h2>
              <button className="modal-close" onClick={() => setShowReceiveModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleReceiveSubmit} className="modal-form" noValidate style={{ padding: 'var(--space-5)' }}>
              <div className="form-group">
                <label htmlFor="receive-product" className="form-label">Product *</label>
                <select
                  id="receive-product"
                  className="form-select"
                  value={receivingProduct?.id || ''}
                  onChange={(e) =>
                    setReceivingProduct(products.find((p) => p.id === parseInt(e.target.value, 10)) || null)
                  }
                  required
                  disabled={submitting || products.length === 0}
                >
                  {productsError && (
                    <option value="" disabled>Failed to load products: {productsError}</option>
                  )}
                  {!productsError && products.length === 0 && (
                    <option value="" disabled>No products available</option>
                  )}
                  {!productsError && products.length > 0 && (
                    <>
                      <option value="">Select a product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) - Stock: {p.current_stock}/{p.reorder_level}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {productsError && <p className="form-error">Could not load products. Please try again.</p>}
                {!productsError && products.length === 0 && <p className="form-hint">No products in the system yet.</p>}
              </div>
              <div className="form-group">
                <label htmlFor="receive-qty" className="form-label">Quantity to Receive *</label>
                <input
                  type="number"
                  id="receive-qty"
                  min="1"
                  className="form-input"
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(e.target.value)}
                  placeholder="Enter quantity"
                  required
                  autoFocus
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="receive-ref" className="form-label">Reference Number</label>
                <input
                  type="text"
                  id="receive-ref"
                  className="form-input"
                  value={receiveRef}
                  onChange={(e) => setReceiveRef(e.target.value)}
                  placeholder="e.g., PO-12345, REC-001"
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="receive-notes" className="form-label">Notes</label>
                <textarea
                  id="receive-notes"
                  className="form-textarea"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes"
                  disabled={submitting}
                />
              </div>
              <div className="modal-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReceiveModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !receivingProduct || !receiveQty}
                >
                  {submitting ? (
                    <>
                      <div
                        className="loading-spinner"
                        style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff' }}
                        aria-hidden="true"
                      />
                      <span>Receiving...</span>
                    </>
                  ) : (
                    'Receive Stock'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Order Modal (points to the Orders page, which has the full form) */}
      {showOrderModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowOrderModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-title"
        >
          <div className="modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="order-title" className="modal-title">Create New Order</h2>
              <button className="modal-close" onClick={() => setShowOrderModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-gray-600)' }}>
                The order creation form is on the Orders page with full product selection and line-item management.
              </p>
              <Link
                to="/orders"
                className="btn btn-primary"
                onClick={() => setShowOrderModal(false)}
                style={{ marginRight: 'var(--space-3)' }}
              >
                <ShoppingCart size={18} /> Go to Orders Page
              </Link>
              <button className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}