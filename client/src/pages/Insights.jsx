import { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Box,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  BarChart2,
  AlertCircle,
  RotateCcw,
  CheckCircle,
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
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useInsights } from '../hooks/useApi';
import { formatCurrency, formatNumber, formatDateShort, getStockStatus, getStockStatusLabel } from '../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'alerts', label: 'Stock Alerts', icon: AlertTriangle },
];

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

const CHART_COLORS = {
  sold: '#ef4444',
  received: '#22c55e',
  orderValue: '#3b82f6',
  grid: '#e2e8f0',
  text: '#64748b',
  lowStock: '#f59e0b',
  outOfStock: '#ef4444',
};

export function Insights() {
  const { getOverview, getTrends, getStockAlerts, requestRestock, loading: insightsLoading } = useInsights();

  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [stockAlerts, setStockAlerts] = useState({ out_of_stock: [], low_stock: [], summary: {} });
  const [requestingRestock, setRequestingRestock] = useState(null);

  // Load overview data
  useEffect(() => {
    getOverview({ period }).then(res => {
      setOverview(res.kpis);
    });
  }, [period, getOverview]);

  // Load trends data
  useEffect(() => {
    getTrends({ period }).then(res => {
      setTrends(res);
    });
  }, [period, getTrends]);

  // Load stock alerts (always current, not historical)
  useEffect(() => {
    getStockAlerts().then(res => {
      setStockAlerts(res);
    });
  }, [getStockAlerts]);

  const handleRequestRestock = async (product) => {
    setRequestingRestock(product.id);
    try {
      const suggestedQty = Math.max(product.reorder_level - product.current_stock + 10, 10);
      await requestRestock(product.id, { requested_qty: suggestedQty, notes: 'Requested from Stock Alerts' });
      // Refresh alerts
      getStockAlerts().then(res => setStockAlerts(res));
    } catch (err) {
      alert(err.message);
    } finally {
      setRequestingRestock(null);
    }
  };

  // Chart data preparation
  const dailyData = trends?.daily_movements || [];
  const chartLabels = dailyData.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const soldData = dailyData.map(d => d.units_sold || 0);
  const receivedData = dailyData.map(d => d.units_received || 0);

  const lineChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Units Sold',
        data: soldData,
        borderColor: CHART_COLORS.sold,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Units Received',
        data: receivedData,
        borderColor: CHART_COLORS.received,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const topProducts = trends?.top_products || [];
  const barChartData = {
    labels: topProducts.map(p => p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name),
    datasets: [
      {
        label: 'Units Sold',
        data: topProducts.map(p => p.units_sold || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: CHART_COLORS.received,
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  // Stock status distribution for doughnut chart
  const statusData = overview ? [
    { label: 'In Stock', value: overview.total_products - overview.low_stock_count - overview.out_of_stock_count, color: CHART_COLORS.received },
    { label: 'Low Stock', value: overview.low_stock_count, color: CHART_COLORS.lowStock },
    { label: 'Out of Stock', value: overview.out_of_stock_count, color: CHART_COLORS.outOfStock },
  ] : [];

  const doughnutData = {
    labels: statusData.map(d => d.label),
    datasets: [{
      data: statusData.map(d => d.value),
      backgroundColor: statusData.map(d => d.color),
      borderWidth: 2,
      borderColor: '#334155',
      cutout: '70%',
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { usePointStyle: true, padding: 16, font: { size: 12 }, color: '#334155' },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: CHART_COLORS.grid }, ticks: { color: '#475569', font: { size: 11 }, stepSize: 1 } },
    },
    interaction: { intersect: false, mode: 'index' },
  };

  const barChartOptions = {
    ...chartOptions,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, grid: { color: CHART_COLORS.grid }, ticks: { color: '#475569', font: { size: 11 } } },
      y: { grid: { display: false }, ticks: { color: '#475569', font: { size: 11 } } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { usePointStyle: true, padding: 16, font: { size: 12 }, color: '#334155' } },
      tooltip: { backgroundColor: '#1e293b', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 8 },
    },
  };

  const loading = insightsLoading;

  // KPI Cards for Overview
  const kpiCards = overview ? [
    { title: 'Total Products', value: formatNumber(overview.total_products), icon: Package, color: 'primary' },
    { title: 'Units on Hand', value: formatNumber(overview.units_on_hand), icon: Box, color: 'success' },
    { title: 'Low Stock', value: formatNumber(overview.low_stock_count), icon: AlertTriangle, color: 'warning' },
    { title: 'Out of Stock', value: formatNumber(overview.out_of_stock_count), icon: XCircle, color: 'danger' },
    { title: 'Units Sold', value: formatNumber(overview.units_sold), icon: TrendingUp, color: 'danger' },
    { title: 'Units Received', value: formatNumber(overview.units_received), icon: Warehouse, color: 'success' },
    { title: 'Completed Order Value', value: formatCurrency(overview.completed_order_value), icon: BarChart2, color: 'primary' },
  ] : [];

  return (
    <div className="insights-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Business Insights</h1>
          <p className="page-subtitle">Analytics and reports</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs" role="tablist" aria-label="Insights tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} className="mr-2" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Period Filter (for Overview and Trends) */}
      {(activeTab === 'overview' || activeTab === 'trends') && (
        <div className="filters-bar" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="filter-group">
            <label htmlFor="insights-period">Period</label>
            <select
              id="insights-period"
              className="form-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-actions">
            <span className="text-sm text-gray-500" style={{ alignSelf: 'flex-end', marginBottom: 'var(--space-2)' }}>
              {overview && `Showing data for ${PERIOD_OPTIONS.find(o => o.value === period)?.label}`}
            </span>
          </div>
        </div>
      )}

      {/* Tab Panels */}
      {/* OVERVIEW TAB */}
      <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" hidden={activeTab !== 'overview'}>
        {/* KPI Cards */}
        <div className="kpi-grid" role="region" aria-label="Key Performance Indicators">
          {kpiCards.map((kpi, index) => (
            <article key={index} className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">{kpi.title}</span>
                <div className={`kpi-icon ${kpi.color}`} aria-hidden="true">
                  <kpi.icon size={20} />
                </div>
              </div>
              <div className="kpi-value">{kpi.value}</div>
            </article>
          ))}
        </div>

        {/* Charts Row */}
        <div className="dashboard-grid">
          {/* Stock Status Distribution */}
          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h2 className="dashboard-panel-title">Stock Status Distribution</h2>
            </div>
            <div className="dashboard-panel-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '280px' }}>
              <div style={{
                width: '280px',
                height: '280px',
                position: 'relative',
                background: '#E2E8F0',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
              }}>
                {overview ? (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                ) : (
                  <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                    <Warehouse className="empty-state-icon" size={48} />
                    <p className="empty-state-text">No data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Daily Order Value */}
          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h2 className="dashboard-panel-title">Daily Completed Order Value</h2>
            </div>
            <div className="dashboard-panel-body">
              <div className="chart-container" role="img" aria-label="Line chart showing daily completed order value">
                {trends?.daily_order_value?.length > 0 ? (
                  <Line
                    data={{
                      labels: trends.daily_order_value.map(d => {
                        const date = new Date(d.date);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }),
                      datasets: [{
                        label: 'Order Value (INR)',
                        data: trends.daily_order_value.map(d => d.order_value || 0),
                        borderColor: CHART_COLORS.orderValue,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                      }],
                    }}
                    options={chartOptions}
                  />
                ) : (
                  <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                    <BarChart2 className="empty-state-icon" size={48} />
                    <p className="empty-state-text">No completed orders in this period</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {overview && (
          <div className="card" style={{ marginTop: 'var(--space-6)' }}>
            <div className="card-header">
              <h3 className="font-semibold text-lg">Period Summary</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Net Stock Change</p>
                  <p className="font-bold text-2xl text-primary">{formatNumber(overview.units_received - overview.units_sold)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Avg Daily Sales</p>
                  <p className="font-bold text-2xl">{formatNumber(Math.round(overview.units_sold / (period === '7d' ? 7 : period === '30d' ? 30 : 90)))}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Avg Daily Receipts</p>
                  <p className="font-bold text-2xl">{formatNumber(Math.round(overview.units_received / (period === '7d' ? 7 : period === '30d' ? 30 : 90)))}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Avg Order Value</p>
                  <p className="font-bold text-2xl">{formatCurrency(overview.units_sold > 0 ? overview.completed_order_value / overview.units_sold : 0)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TRENDS TAB */}
      <div role="tabpanel" id="panel-trends" aria-labelledby="tab-trends" hidden={activeTab !== 'trends'}>
        <div className="dashboard-grid">
          {/* Units Received vs Units Sold */}
          <div className="dashboard-panel" style={{ gridColumn: '1 / -1' }}>
            <div className="dashboard-panel-header">
              <h2 className="dashboard-panel-title">Units Received vs. Units Sold</h2>
            </div>
            <div className="dashboard-panel-body">
              <div className="chart-container" role="img" aria-label="Line chart comparing units received vs units sold over time">
                {dailyData.length > 0 ? (
                  <Line data={lineChartData} options={chartOptions} />
                ) : (
                  <div className="empty-state" style={{ padding: 'var(--space-12)' }}>
                    <TrendingUp className="empty-state-icon" size={48} />
                    <p className="empty-state-title">No movement data for this period</p>
                    <p className="empty-state-text">Receive stock or complete orders to see trends</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Products by Units Sold */}
          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h2 className="dashboard-panel-title">Top Products by Units Sold</h2>
            </div>
            <div className="dashboard-panel-body">
              <div className="chart-container-sm" role="img" aria-label="Bar chart showing top products by units sold">
                {topProducts.length > 0 ? (
                  <Bar data={barChartData} options={barChartOptions} />
                ) : (
                  <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                    <Package className="empty-state-icon" size={48} />
                    <p className="empty-state-text">No sales data for this period</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="dashboard-panel" style={{ gridColumn: '1 / -1' }}>
            <div className="dashboard-panel-header">
              <h2 className="dashboard-panel-title">Top 10 Products by Units Sold</h2>
            </div>
            <div className="dashboard-panel-body">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>Rank</th>
                      <th style={{ width: '35%' }}>Product</th>
                      <th style={{ width: '15%' }}>Category</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>Units Sold</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Revenue</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.length > 0 ? (
                      topProducts.map((product, index) => (
                        <tr key={product.id}>
                          <td><span className="font-bold text-primary">{index + 1}</span></td>
                          <td>
                            <div className="product-row">
                              <span className="product-name">{product.name}</span>
                              <span className="product-sku">{product.sku}</span>
                            </div>
                          </td>
                          <td>{product.category_name}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{formatNumber(product.units_sold)}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{formatCurrency(product.revenue)}</td>
                          <td style={{ textAlign: 'center' }}>{formatNumber(product.order_count)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">No sales data for this period</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STOCK ALERTS TAB */}
      <div role="tabpanel" id="panel-alerts" aria-labelledby="tab-alerts" hidden={activeTab !== 'alerts'}>
        {/* Summary Cards */}
        <div className="kpi-grid" style={{ marginBottom: 'var(--space-6)' }}>
          <article className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Out of Stock</span>
              <div className="kpi-icon danger" aria-hidden="true">
                <XCircle size={20} />
              </div>
            </div>
            <div className="kpi-value">{stockAlerts.summary.out_of_stock_count || 0}</div>
          </article>
          <article className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Low Stock</span>
              <div className="kpi-icon warning" aria-hidden="true">
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className="kpi-value">{stockAlerts.summary.low_stock_count || 0}</div>
          </article>
          <article className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Total Alerts</span>
              <div className="kpi-icon primary" aria-hidden="true">
                <AlertCircle size={20} />
              </div>
            </div>
            <div className="kpi-value">{(stockAlerts.summary.out_of_stock_count || 0) + (stockAlerts.summary.low_stock_count || 0)}</div>
          </article>
        </div>

        {/* Out of Stock Products */}
        {(stockAlerts.out_of_stock?.length || 0) > 0 && (
          <section className="dashboard-panel" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="dashboard-panel-header">
              <h2 className="dashboard-panel-title">
                <XCircle size={20} className="text-danger mr-2" aria-hidden="true" />
                Out of Stock ({stockAlerts.out_of_stock.length})
              </h2>
            </div>
            <div className="dashboard-panel-body">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Product</th>
                      <th style={{ width: '15%' }}>Category</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Current Stock</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Reorder Level</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ width: '14%', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockAlerts.out_of_stock.map(product => (
                      <tr key={product.id}>
                        <td>
                          <div className="product-row">
                            <span className="product-name">{product.name}</span>
                            <span className="product-sku">{product.sku}</span>
                          </div>
                        </td>
                        <td>{product.category}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="stock-value text-danger">{formatNumber(product.current_stock)}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="stock-value">{formatNumber(product.reorder_level)}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                          {formatCurrency(product.unit_price)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleRequestRestock(product)}
                            disabled={requestingRestock === product.id}
                            aria-label={`Request restock for ${product.name}`}
                          >
                            {requestingRestock === product.id ? (
                              <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff' }} aria-hidden="true" />
                            ) : (
                              <>
                                <RotateCcw size={14} /> Request
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Low Stock Products */}
        {(stockAlerts.low_stock?.length || 0) > 0 && (
          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h2 className="dashboard-panel-title">
                <AlertTriangle size={20} className="text-warning mr-2" aria-hidden="true" />
                Low Stock ({stockAlerts.low_stock.length})
              </h2>
            </div>
            <div className="dashboard-panel-body">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Product</th>
                      <th style={{ width: '15%' }}>Category</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Current Stock</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Reorder Level</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ width: '14%', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockAlerts.low_stock.map(product => (
                      <tr key={product.id}>
                        <td>
                          <div className="product-row">
                            <span className="product-name">{product.name}</span>
                            <span className="product-sku">{product.sku}</span>
                          </div>
                        </td>
                        <td>{product.category}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="stock-value text-warning">{formatNumber(product.current_stock)}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="stock-value">{formatNumber(product.reorder_level)}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                          {formatCurrency(product.unit_price)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleRequestRestock(product)}
                            disabled={requestingRestock === product.id}
                            aria-label={`Request restock for ${product.name}`}
                          >
                            {requestingRestock === product.id ? (
                              <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff' }} aria-hidden="true" />
                            ) : (
                              <>
                                <RotateCcw size={14} /> Request
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {(stockAlerts.out_of_stock?.length || 0) === 0 && (stockAlerts.low_stock?.length || 0) === 0 && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <div className="empty-state" style={{ display: 'inline-flex' }}>
                <CheckCircle className="empty-state-icon" size={64} style={{ color: 'var(--color-success)' }} />
                <div style={{ textAlign: 'left' }}>
                  <p className="empty-state-title">All products well stocked!</p>
                  <p className="empty-state-text">No products are currently low or out of stock.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500 text-center mt-4">
          Stock alerts show current inventory levels. They are not filtered by the selected time period.
        </p>
      </div>

      {loading && (
        <div className="loading-overlay" style={{ position: 'fixed', inset: 0, zIndex: 200 }} aria-label="Loading">
          <div className="loading-spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
        </div>
      )}
    </div>
  );
}