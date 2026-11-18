import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle,
  XCircle,
  Package,
  ExternalLink,
} from 'lucide-react';
import { useRestock, useProducts } from '../hooks/useApi';
import { formatNumber, formatDateShort, getRestockStatusLabel } from '../utils/format';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'REQUESTED', label: 'Awaiting Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'AWAITING_DELIVERY', label: 'Awaiting Delivery' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_COLORS = {
  REQUESTED: 'bg-gray-100 text-gray-700',
  APPROVED: 'bg-primary-light text-primary-text',
  AWAITING_DELIVERY: 'bg-primary-light text-primary-text',
  RECEIVED: 'bg-success-light text-success-text',
  CANCELLED: 'bg-danger-light text-danger-text',
};

export function Restock() {
  const { list, getSummary, create, approve, markDelivery, receive, cancel, loading: restockLoading } = useRestock();
  const { list: listProducts, getLowStock, loading: productsLoading } = useProducts();

  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });
  const [summary, setSummary] = useState({ AWAITING_APPROVAL: 0, AWAITING_DELIVERY: 0, RECEIVED: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingRequest, setViewingRequest] = useState(null);
  const [formData, setFormData] = useState({
    product_id: '',
    requested_qty: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load products and low stock products
  useEffect(() => {
    listProducts({ limit: 1000 }).then(res => setProducts(res.products));
    getLowStock().then(res => setLowStockProducts(res.products));
  }, [listProducts, getLowStock]);

  // Load summary
  useEffect(() => {
    getSummary().then(res => setSummary(res.summary));
  }, [getSummary]);

  // Load requests when filters/pagination change
  const loadRequests = useCallback(async () => {
    try {
      const res = await list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setRequests(res.requests);
      setPagination(prev => ({ ...prev, total: res.pagination.total, totalPages: res.pagination.totalPages }));
    } catch (err) {
      console.error('Failed to load restock requests:', err);
    }
  }, [list, pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetForm = () => {
    setFormData({ product_id: '', requested_qty: '', notes: '' });
    setFormErrors({});
  };

  const openCreateModal = (prefillProduct = null) => {
    resetForm();
    if (prefillProduct) {
      setFormData(prev => ({
        ...prev,
        product_id: String(prefillProduct.id),
        requested_qty: String(Math.max(prefillProduct.reorder_level - prefillProduct.current_stock + 10, 10)),
      }));
    }
    setShowCreateModal(true);
  };

  const handleViewDetail = async (request) => {
    setViewingRequest(request);
    setShowDetailModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.product_id) errors.product_id = 'Product is required';
    if (!formData.requested_qty || parseInt(formData.requested_qty) < 1) {
      errors.requested_qty = 'Quantity must be at least 1';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await create({
        product_id: parseInt(formData.product_id),
        requested_qty: parseInt(formData.requested_qty),
        notes: formData.notes.trim() || null,
      });
      setShowCreateModal(false);
      resetForm();
      loadRequests();
      getSummary().then(res => setSummary(res.summary));
    } catch (err) {
      setFormErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (request) => {
    try {
      await approve(request.id);
      loadRequests();
      getSummary().then(res => setSummary(res.summary));
      if (viewingRequest?.id === request.id) setShowDetailModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkDelivery = async (request) => {
    try {
      await markDelivery(request.id);
      loadRequests();
      getSummary().then(res => setSummary(res.summary));
      if (viewingRequest?.id === request.id) {
        const updated = await list({ search: request.id });
        setViewingRequest(updated.requests[0]);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReceive = async (request) => {
    if (!window.confirm('Mark this restock request as received? This will add stock to inventory.')) return;
    try {
      await receive(request.id);
      loadRequests();
      getSummary().then(res => setSummary(res.summary));
      if (viewingRequest?.id === request.id) setShowDetailModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancel = async (request) => {
    if (!window.confirm('Cancel this restock request?')) return;
    try {
      await cancel(request.id);
      loadRequests();
      getSummary().then(res => setSummary(res.summary));
      if (viewingRequest?.id === request.id) setShowDetailModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const getProduct = (id) => products.find(p => p.id === parseInt(id));

  const renderStatusBadge = (status) => (
    <span className={`restock-status ${status.toLowerCase()}`}>
      {getRestockStatusLabel(status)}
    </span>
  );

  const renderActions = (request) => {
    const actions = [];
    if (request.status === 'REQUESTED') {
      actions.push(
        <button
          key="approve"
          className="btn btn-sm btn-ghost"
          onClick={() => handleApprove(request)}
          aria-label={`Approve ${request.product_name}`}
        >
          <CheckCircle size={14} />
        </button>
      );
      actions.push(
        <button
          key="cancel"
          className="btn btn-sm btn-ghost"
          onClick={() => handleCancel(request)}
          aria-label={`Cancel ${request.product_name}`}
        >
          <XCircle size={14} />
        </button>
      );
    } else if (request.status === 'APPROVED') {
      actions.push(
        <button
          key="delivery"
          className="btn btn-sm btn-ghost"
          onClick={() => handleMarkDelivery(request)}
          aria-label={`Mark delivery for ${request.product_name}`}
        >
          <Truck size={14} />
        </button>
      );
      actions.push(
        <button
          key="cancel"
          className="btn btn-sm btn-ghost"
          onClick={() => handleCancel(request)}
          aria-label={`Cancel ${request.product_name}`}
        >
          <XCircle size={14} />
        </button>
      );
    } else if (request.status === 'AWAITING_DELIVERY') {
      actions.push(
        <button
          key="receive"
          className="btn btn-sm btn-primary"
          onClick={() => handleReceive(request)}
          aria-label={`Receive stock for ${request.product_name}`}
        >
          <RotateCcw size={14} /> Receive
        </button>
      );
      actions.push(
        <button
          key="cancel"
          className="btn btn-sm btn-ghost"
          onClick={() => handleCancel(request)}
          aria-label={`Cancel ${request.product_name}`}
        >
          <XCircle size={14} />
        </button>
      );
    }
    actions.push(
      <Link
        key="view"
        to={`/restock/${request.id}`}
        className="btn btn-sm btn-ghost"
        aria-label={`View ${request.product_name}`}
      >
        <ExternalLink size={14} />
      </Link>
    );
    return <div className="action-buttons justify-center">{actions}</div>;
  };

  const loading = restockLoading || productsLoading;

  return (
    <div className="restock-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Restock Requests</h1>
          <p className="page-subtitle">Manage restock workflow</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> New Request
          </button>
        </div>
      </div>

      {/* Summary Cards - clickable to filter table */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <article
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => handleFilterChange('status', 'REQUESTED')}
          role="button"
          tabIndex={0}
          aria-label="Filter by Awaiting Approval"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFilterChange('status', 'REQUESTED'); }}
        >
          <div className="kpi-header">
            <span className="kpi-title">Awaiting Approval</span>
            <div className="kpi-icon primary" aria-hidden="true">
              <Clock size={20} />
            </div>
          </div>
          <div className="kpi-value">{summary.AWAITING_APPROVAL || 0}</div>
        </article>
        <article
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => handleFilterChange('status', 'APPROVED')}
          role="button"
          tabIndex={0}
          aria-label="Filter by Awaiting Delivery"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFilterChange('status', 'APPROVED'); }}
        >
          <div className="kpi-header">
            <span className="kpi-title">Awaiting Delivery</span>
            <div className="kpi-icon warning" aria-hidden="true">
              <Truck size={20} />
            </div>
          </div>
          <div className="kpi-value">{summary.AWAITING_DELIVERY || 0}</div>
        </article>
        <article
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => handleFilterChange('status', 'RECEIVED')}
          role="button"
          tabIndex={0}
          aria-label="Filter by Received"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFilterChange('status', 'RECEIVED'); }}
        >
          <div className="kpi-header">
            <span className="kpi-title">Received</span>
            <div className="kpi-icon success" aria-hidden="true">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="kpi-value">{summary.RECEIVED || 0}</div>
        </article>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="filter-group" style={{ flex: 2, minWidth: 250 }}>
          <label htmlFor="restock-search">Search</label>
          <div className="input-with-icon">
            <Search className="icon" size={18} aria-hidden="true" />
            <input
              type="text"
              id="restock-search"
              className="form-input"
              placeholder="Search product name or SKU..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="restock-status">Status</label>
          <select
            id="restock-status"
            className="form-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-actions">
          <button className="btn btn-secondary" onClick={() => {
            setFilters({ search: '', status: '' });
            setPagination(prev => ({ ...prev, page: 1 }));
          }}>
            <Filter size={18} /> Clear
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Product</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Current Stock</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Reorder Level</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Requested Qty</th>
              <th style={{ width: '18%', textAlign: 'center' }}>Status</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Requested By</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length > 0 ? (
              requests.map(request => (
                <tr key={request.id}>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleViewDetail(request)}
                      style={{ textAlign: 'left', padding: 0 }}
                    >
                      <div className="product-row">
                        <span className="product-name">{request.product_name}</span>
                        <span className="product-sku">{request.product_sku}</span>
                      </div>
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`stock-value ${request.current_stock === 0 ? 'text-danger' : request.current_stock <= request.reorder_level ? 'text-warning' : ''}`}>
                      {formatNumber(request.current_stock)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="stock-value">{formatNumber(request.reorder_level)}</span>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                    {formatNumber(request.requested_qty)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderStatusBadge(request.status)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {request.requested_by_name}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderActions(request)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <div className="empty-state">
                    <RotateCcw className="empty-state-icon" size={48} />
                    <p className="empty-state-title">No restock requests found</p>
                    <p className="empty-state-text">
                      {filters.search || filters.status
                        ? 'Try adjusting your filters'
                        : 'Create restock requests for products that need replenishment'}
                    </p>
                    {!filters.search && !filters.status && (
                      <button className="btn btn-primary" onClick={openCreateModal} style={{ marginTop: 'var(--space-3)' }}>
                        <Plus size={18} /> New Request
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
        <div className="pagination" role="navigation" aria-label="Restock requests pagination">
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
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} requests)
          </span>
        </div>
      )}

      {/* Create Restock Request Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)} role="dialog" aria-modal="true" aria-labelledby="create-restock-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="create-restock-title" className="modal-title">New Restock Request</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form" noValidate>
              <div className="form-group">
                <label htmlFor="restock-product" className="form-label">Product *</label>
                <select
                  id="restock-product"
                  className={`form-select ${formErrors.product_id ? 'error' : ''}`}
                  value={formData.product_id}
                  onChange={e => setFormData(prev => ({ ...prev, product_id: e.target.value }))}
                  required
                  disabled={submitting}
                >
                  <option value="">Select a product</option>
                  {lowStockProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - Stock: {p.current_stock}/{p.reorder_level}
                    </option>
                  ))}
                  {products
                    .filter(p => !lowStockProducts.some(lp => lp.id === p.id))
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - Stock: {p.current_stock}/{p.reorder_level}
                      </option>
                    ))}
                </select>
                {formErrors.product_id && <p className="form-error">{formErrors.product_id}</p>}
                <p className="form-hint">Low stock products are listed first</p>
              </div>

              <div className="form-group">
                <label htmlFor="restock-qty" className="form-label">Requested Quantity *</label>
                <input
                  type="number"
                  id="restock-qty"
                  min="1"
                  className={`form-input ${formErrors.requested_qty ? 'error' : ''}`}
                  value={formData.requested_qty}
                  onChange={e => setFormData(prev => ({ ...prev, requested_qty: e.target.value }))}
                  placeholder="Enter quantity"
                  required
                  disabled={submitting}
                />
                {formErrors.requested_qty && <p className="form-error">{formErrors.requested_qty}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="restock-notes" className="form-label">Notes</label>
                <textarea
                  id="restock-notes"
                  className="form-textarea"
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Optional notes (supplier, urgency, etc.)"
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
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff' }} aria-hidden="true" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Detail Modal */}
      {showDetailModal && viewingRequest && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)} role="dialog" aria-modal="true" aria-labelledby="restock-detail-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="restock-detail-title" className="modal-title">Restock Request #{viewingRequest.id}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Product</p>
                  <p className="font-medium">{viewingRequest.product_name}</p>
                  <p className="text-sm text-gray-500">{viewingRequest.product_sku}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{viewingRequest.category_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-md">
                <div style={{ textAlign: 'center' }}>
                  <p className="text-sm text-gray-500">Current Stock</p>
                  <p className="font-bold text-2xl">{formatNumber(viewingRequest.current_stock)}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p className="text-sm text-gray-500">Reorder Level</p>
                  <p className="font-bold text-2xl">{formatNumber(viewingRequest.reorder_level)}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p className="text-sm text-gray-500">Requested Qty</p>
                  <p className="font-bold text-2xl text-primary">{formatNumber(viewingRequest.requested_qty)}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">{renderStatusBadge(viewingRequest.status)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Requested By</p>
                  <p>{viewingRequest.requested_by_name}</p>
                  <p className="text-sm text-gray-500">{formatDateShort(viewingRequest.requested_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {viewingRequest.status === 'RECEIVED' ? 'Received By' :
                     viewingRequest.status === 'APPROVED' || viewingRequest.status === 'AWAITING_DELIVERY' ? 'Approved By' : ''}
                  </p>
                  <p>{viewingRequest.approved_by_name || viewingRequest.received_by_name || '-'}</p>
                  <p className="text-sm text-gray-500">
                    {viewingRequest.approved_at ? formatDateShort(viewingRequest.approved_at) :
                     viewingRequest.received_at ? formatDateShort(viewingRequest.received_at) : ''}
                  </p>
                </div>
              </div>

              {viewingRequest.notes && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-500">Notes</p>
                  <p>{viewingRequest.notes}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {viewingRequest.status === 'REQUESTED' && (
                <>
                  <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); handleApprove(viewingRequest); }}>
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setShowDetailModal(false); handleCancel(viewingRequest); }}>
                    <XCircle size={16} /> Cancel
                  </button>
                </>
              )}
              {viewingRequest.status === 'APPROVED' && (
                <>
                  <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); handleMarkDelivery(viewingRequest); }}>
                    <Truck size={16} /> Mark Delivery
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setShowDetailModal(false); handleCancel(viewingRequest); }}>
                    <XCircle size={16} /> Cancel
                  </button>
                </>
              )}
              {viewingRequest.status === 'AWAITING_DELIVERY' && (
                <>
                  <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); handleReceive(viewingRequest); }}>
                    <RotateCcw size={16} /> Receive Stock
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setShowDetailModal(false); handleCancel(viewingRequest); }}>
                    <XCircle size={16} /> Cancel
                  </button>
                </>
              )}
              {(viewingRequest.status === 'RECEIVED' || viewingRequest.status === 'CANCELLED') && (
                <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                  Close
                </button>
              )}
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