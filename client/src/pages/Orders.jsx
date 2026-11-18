import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  ShoppingCart,
  CheckCircle,
  XCircle,
  FileText,
  Trash2,
  Edit,
  ExternalLink,
  Package,
  Minus,
  AlertCircle,
} from 'lucide-react';
import { useOrders, useProducts } from '../hooks/useApi';
import { formatCurrency, formatNumber, formatDateShort, getOrderStatusLabel } from '../utils/format';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function Orders() {
  const { list, getOne, create, complete, cancel, remove, loading: ordersLoading } = useOrders();
  const { list: listProducts, loading: productsLoading } = useProducts();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    date_from: '',
    date_to: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    notes: '',
    lines: [{ product_id: '', quantity: 1 }],
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [lineErrors, setLineErrors] = useState({});

  // Load products for dropdown
  useEffect(() => {
    listProducts({ limit: 100, page: 1 }).then(res => setProducts(res.products));
  }, [listProducts]);

  // Load orders when filters/pagination change
  const loadOrders = useCallback(async () => {
    try {
      const res = await list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setOrders(res.orders);
      setPagination(prev => ({ ...prev, total: res.pagination.total, totalPages: res.pagination.totalPages }));
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  }, [list, pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      notes: '',
      lines: [{ product_id: '', quantity: 1 }],
    });
    setFormErrors({});
    setLineErrors({});
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleViewDetail = async (order) => {
    try {
      const res = await getOne(order.id);
      setViewingOrder(res.order);
      setShowDetailModal(true);
    } catch (err) {
      alert('Failed to load order details');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.customer_name.trim()) errors.customer_name = 'Customer name is required';
    if (formData.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email)) {
      errors.customer_email = 'Invalid email format';
    }
    if (formData.lines.length === 0) {
      errors.lines = 'At least one order line is required';
    }
    const newLineErrors = {};
    formData.lines.forEach((line, index) => {
      if (!line.product_id) newLineErrors[`line_${index}_product`] = 'Product required';
      if (!line.quantity || parseInt(line.quantity) < 1) newLineErrors[`line_${index}_qty`] = 'Quantity must be >= 1';
    });
    setLineErrors(newLineErrors);
    setFormErrors(errors);
    return Object.keys(errors).length === 0 && Object.keys(newLineErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const lines = formData.lines.map(line => ({
        product_id: parseInt(line.product_id),
        quantity: parseInt(line.quantity),
      }));

      await create({
        customer_name: formData.customer_name.trim(),
        customer_email: formData.customer_email.trim() || null,
        customer_phone: formData.customer_phone.trim() || null,
        notes: formData.notes.trim() || null,
        lines,
      });

      setShowCreateModal(false);
      resetForm();
      loadOrders();
    } catch (err) {
      setFormErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (orderId) => {
    if (!window.confirm('Complete this order? This will deduct stock from inventory.')) return;
    try {
      await complete(orderId);
      loadOrders();
      if (viewingOrder?.id === orderId) setShowDetailModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this draft order?')) return;
    try {
      await cancel(orderId);
      loadOrders();
      if (viewingOrder?.id === orderId) setShowDetailModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm('Delete this draft order? This cannot be undone.')) return;
    try {
      await remove(orderId);
      loadOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  // Line management
  const addLine = () => {
    setFormData(prev => ({ ...prev, lines: [...prev.lines, { product_id: '', quantity: 1 }] }));
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 1) return;
    setFormData(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
  };

  const updateLine = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => i === index ? { ...line, [field]: value } : line),
    }));
    // Clear error for this line
    setLineErrors(prev => {
      const next = { ...prev };
      delete next[`line_${index}_product`];
      delete next[`line_${index}_qty`];
      return next;
    });
  };

  const getProduct = (id) => products.find(p => p.id === parseInt(id));

  const calculateLineTotal = (line) => {
    const product = getProduct(line.product_id);
    if (!product) return 0;
    return product.unit_price * parseInt(line.quantity || 1);
  };

  const calculateSubtotal = () => {
    return formData.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
  };

  const calculateTotals = () => {
    const subtotal = calculateSubtotal();
    const tax = subtotal * 0.18;
    return { subtotal, tax, total: subtotal + tax };
  };

  const renderOrderStatus = (status) => {
    const labels = { DRAFT: 'Draft', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
    return (
      <span className={`order-status ${status.toLowerCase()}`}>
        {labels[status] || status}
      </span>
    );
  };

  const renderActions = (order) => (
    <div className="action-buttons justify-center">
      <Link
        to={`/orders/${order.id}`}
        className="btn btn-sm btn-ghost"
        aria-label={`View ${order.order_number}`}
      >
        <ExternalLink size={14} />
      </Link>
      {order.status === 'DRAFT' && (
        <>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => handleComplete(order.id)}
            aria-label={`Complete ${order.order_number}`}
          >
            <CheckCircle size={14} />
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => handleCancel(order.id)}
            aria-label={`Cancel ${order.order_number}`}
          >
            <XCircle size={14} />
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => handleDelete(order.id)}
            aria-label={`Delete ${order.order_number}`}
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );

  const loading = ordersLoading || productsLoading;

  return (
    <div className="orders-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Manage customer orders</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> New Order
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="filter-group" style={{ flex: 2, minWidth: 250 }}>
          <label htmlFor="order-search">Search</label>
          <div className="input-with-icon">
            <Search className="icon" size={18} aria-hidden="true" />
            <input
              type="text"
              id="order-search"
              className="form-input"
              placeholder="Search order #, customer..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="order-status">Status</label>
          <select
            id="order-status"
            className="form-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="date-from">From</label>
          <input
            type="date"
            id="date-from"
            className="form-input"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="date-to">To</label>
          <input
            type="date"
            id="date-to"
            className="form-input"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <button className="btn btn-secondary" onClick={() => {
            setFilters({ search: '', status: '', date_from: '', date_to: '' });
            setPagination(prev => ({ ...prev, page: 1 }));
          }}>
            <Filter size={18} /> Clear
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Order #</th>
              <th style={{ width: '20%' }}>Customer</th>
              <th style={{ width: '12%' }}>Date</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Items</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Status</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{order.order_number}</span>
                  </td>
                  <td>
                    <div>
                      <span className="font-medium">{order.customer_name}</span>
                      {order.customer_email && (
                        <div className="text-xs text-gray-500">{order.customer_email}</div>
                      )}
                    </div>
                  </td>
                  <td>{formatDateShort(order.created_at)}</td>
                  <td style={{ textAlign: 'center' }}>{formatNumber(order.total_quantity || 0)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderOrderStatus(order.status)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderActions(order)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <div className="empty-state">
                    <ShoppingCart className="empty-state-icon" size={48} />
                    <p className="empty-state-title">No orders found</p>
                    <p className="empty-state-text">
                      {filters.search || filters.status || filters.date_from
                        ? 'Try adjusting your filters'
                        : 'Create your first order to get started'}
                    </p>
                    {!filters.search && !filters.status && !filters.date_from && (
                      <button className="btn btn-primary" onClick={openCreateModal} style={{ marginTop: 'var(--space-3)' }}>
                        <Plus size={18} /> New Order
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination" role="navigation" aria-label="Orders pagination">
          <button
            className="pagination-btn"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            let pageNum;
            if (pagination.totalPages <= 5) pageNum = i + 1;
            else if (pagination.page <= 3) pageNum = i + 1;
            else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
            else pageNum = pagination.page - 2 + i;
            return (
              <button
                key={pageNum}
                className={`pagination-btn ${pagination.page === pageNum ? 'active' : ''}`}
                onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                aria-label={`Page ${pageNum}`}
                aria-current={pagination.page === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            className="pagination-btn"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
          <span className="pagination-info">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
          </span>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)} role="dialog" aria-modal="true" aria-labelledby="create-order-title" style={{ maxHeight: '90vh', overflow: 'auto' }}>
          <div className="modal" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="create-order-title" className="modal-title">New Order</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form" noValidate>
              <div className="modal-form-row">
                <div className="form-group">
                  <label htmlFor="cust-name" className="form-label">Customer Name *</label>
                  <input
                    type="text"
                    id="cust-name"
                    className={`form-input ${formErrors.customer_name ? 'error' : ''}`}
                    value={formData.customer_name}
                    onChange={e => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="Customer name"
                    required
                    disabled={submitting}
                    autoFocus
                  />
                  {formErrors.customer_name && <p className="form-error">{formErrors.customer_name}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="cust-email" className="form-label">Customer Email</label>
                  <input
                    type="email"
                    id="cust-email"
                    className={`form-input ${formErrors.customer_email ? 'error' : ''}`}
                    value={formData.customer_email}
                    onChange={e => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                    placeholder="customer@email.com"
                    disabled={submitting}
                  />
                  {formErrors.customer_email && <p className="form-error">{formErrors.customer_email}</p>}
                </div>
              </div>
              <div className="modal-form-row">
                <div className="form-group">
                  <label htmlFor="cust-phone" className="form-label">Customer Phone</label>
                  <input
                    type="tel"
                    id="cust-phone"
                    className="form-input"
                    value={formData.customer_phone}
                    onChange={e => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="+91-9876543210"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-gray-200)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Order Lines</h3>
                  <button type="button" className="add-line-btn" onClick={addLine} disabled={submitting}>
                    <Plus size={16} /> Add Line
                  </button>
                </div>

                <div className="order-lines-table">
                  <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
                    <table className="table" style={{ minWidth: '600px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '35%' }}>Product</th>
                          <th style={{ width: '15%', textAlign: 'center' }}>Available</th>
                          <th style={{ width: '15%', textAlign: 'center' }}>Qty</th>
                          <th style={{ width: '15%', textAlign: 'right' }}>Unit Price</th>
                          <th style={{ width: '15%', textAlign: 'right' }}>Line Total</th>
                          <th style={{ width: '5%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.lines.map((line, index) => {
                          const product = getProduct(line.product_id);
                          const lineTotal = calculateLineTotal(line);
                          return (
                            <tr key={index}>
                              <td>
                                <select
                                  className={`form-select ${lineErrors[`line_${index}_product`] ? 'error' : ''}`}
                                  value={line.product_id}
                                  onChange={e => updateLine(index, 'product_id', e.target.value)}
                                  required
                                  disabled={submitting}
                                >
                                  <option value="">Select product</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.sku}) - {formatCurrency(p.unit_price)}
                                    </option>
                                  ))}
                                </select>
                                {lineErrors[`line_${index}_product`] && (
                                  <p className="form-error" style={{ marginTop: 'var(--space-1)' }}>{lineErrors[`line_${index}_product`]}</p>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {product ? (
                                  <span className={`stock-value ${product.current_stock === 0 ? 'text-danger' : product.current_stock <= product.reorder_level ? 'text-warning' : ''}`}>
                                    {formatNumber(product.current_stock)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="number"
                                  min="1"
                                  className={`order-line-input ${lineErrors[`line_${index}_qty`] ? 'error' : ''}`}
                                  value={line.quantity}
                                  onChange={e => updateLine(index, 'quantity', e.target.value)}
                                  required
                                  disabled={submitting || !line.product_id}
                                  style={{ width: '80px', textAlign: 'center' }}
                                />
                                {lineErrors[`line_${index}_qty`] && (
                                  <p className="form-error" style={{ marginTop: 'var(--space-1)' }}>{lineErrors[`line_${index}_qty`]}</p>
                                )}
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                {product ? formatCurrency(product.unit_price) : '—'}
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                                {product ? formatCurrency(lineTotal) : '—'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {formData.lines.length > 1 && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => removeLine(index)}
                                    aria-label="Remove line"
                                    disabled={submitting}
                                  >
                                    <Minus size={16} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Order Totals */}
                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
                  {(() => {
                    const { subtotal, tax, total } = calculateTotals();
                    return (
                      <div>
                        <div className="order-subtotal-row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        <div className="order-subtotal-row"><span>Tax (18%)</span><span>{formatCurrency(tax)}</span></div>
                        <div className="order-subtotal-row total"><span>Total</span><span>{formatCurrency(total)}</span></div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="order-notes" className="form-label">Notes</label>
                <textarea
                  id="order-notes"
                  className="form-textarea"
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional notes"
                  disabled={submitting}
                />
              </div>

              {formErrors.submit && (
                <div className="alert alert-danger">
                  <p className="alert-message">{formErrors.submit}</p>
                </div>
              )}

              <div className="modal-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || formData.lines.length === 0}>
                  {submitting ? (
                    <>
                      <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff' }} aria-hidden="true" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Order'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && viewingOrder && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)} role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
          <div className="modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="order-detail-title" className="modal-title">{viewingOrder.order_number}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{viewingOrder.customer_name}</p>
                  {viewingOrder.customer_email && <p className="text-sm text-gray-500">{viewingOrder.customer_email}</p>}
                  {viewingOrder.customer_phone && <p className="text-sm text-gray-500">{viewingOrder.customer_phone}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{renderOrderStatus(viewingOrder.status)}</p>
                  <p className="text-sm text-gray-500 mt-1">Created: {formatDateShort(viewingOrder.created_at)}</p>
                  {viewingOrder.completed_at && <p className="text-sm text-gray-500">Completed: {formatDateShort(viewingOrder.completed_at)}</p>}
                </div>
              </div>

              {viewingOrder.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-500">Notes</p>
                  <p>{viewingOrder.notes}</p>
                </div>
              )}

              <h3 className="font-semibold mb-3">Order Lines</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingOrder.lines || []).map((line, index) => (
                      <tr key={index}>
                        <td>
                          <div>
                            <span className="font-medium">{line.product_name}</span>
                            <div className="text-xs text-gray-500">{line.product_sku}</div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{formatNumber(line.quantity)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(line.unit_price)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{formatCurrency(line.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4" style={{ textAlign: 'right' }}>
                <div className="order-subtotal-row"><span>Subtotal</span><span>{formatCurrency(viewingOrder.subtotal)}</span></div>
                <div className="order-subtotal-row"><span>Tax (18%)</span><span>{formatCurrency(viewingOrder.tax_amount)}</span></div>
                <div className="order-subtotal-row total"><span>Total</span><span>{formatCurrency(viewingOrder.total_amount)}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay" style={{ position: 'fixed', inset: 0, zIndex: 200 }} aria-label="Loading">
          <div className="loading-spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
        </div>
      )}
    </div>
  );
}