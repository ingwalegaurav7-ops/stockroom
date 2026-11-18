import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Truck,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Package,
  Tag,
  AlertTriangle,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import { useProducts, useCategories, useMovements } from '../hooks/useApi';
import { formatCurrency, formatNumber, getStockStatus, getStockStatusLabel, downloadBlob } from '../utils/format';

const STOCK_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
];

export function Products() {
  const { list, exportCsv, getLowStock, create, update, remove, loading: productsLoading } = useProducts();
  const { list: listCategories, loading: categoriesLoading } = useCategories();
  const { receive, loading: movementsLoading } = useMovements();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    status: '',
    sort: 'name',
    order: 'asc',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [receivingProduct, setReceivingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    unit_price: '',
    reorder_level: '',
    current_stock: 0,
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveRef, setReceiveRef] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load categories on mount
  useEffect(() => {
    listCategories().then(res => setCategories(res.categories));
  }, [listCategories]);

  // Load products when filters/pagination change
  const loadProducts = useCallback(async () => {
    try {
      const res = await list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setProducts(res.products);
      setPagination(prev => ({ ...prev, total: res.pagination.total, totalPages: res.pagination.totalPages }));
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  }, [list, pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field) => {
    setFilters(prev => ({
      ...prev,
      sort: field,
      order: prev.sort === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category_id: '',
      unit_price: '',
      reorder_level: '',
      current_stock: 0,
      description: '',
    });
    setFormErrors({});
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setEditingProduct(null);
    setShowAddModal(true);
  };

  // Open edit modal
  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category_id: String(product.category_id),
      unit_price: String(product.unit_price),
      reorder_level: String(product.reorder_level),
      current_stock: product.current_stock,
      description: product.description || '',
    });
    setShowEditModal(true);
  };

  // Open receive modal
  const handleReceive = (product) => {
    setReceivingProduct(product);
    setReceiveQty('');
    setReceiveRef('');
    setReceiveNotes('');
    setShowReceiveModal(true);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.sku.trim()) errors.sku = 'SKU is required';
    if (!formData.category_id) errors.category_id = 'Category is required';
    if (formData.unit_price === '' || parseFloat(formData.unit_price) < 0) errors.unit_price = 'Valid price required';
    if (formData.reorder_level === '' || parseInt(formData.reorder_level) < 0) errors.reorder_level = 'Valid reorder level required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const data = {
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        category_id: parseInt(formData.category_id),
        unit_price: parseFloat(formData.unit_price),
        reorder_level: parseInt(formData.reorder_level),
        current_stock: parseInt(formData.current_stock) || 0,
        description: formData.description.trim() || null,
      };

      if (editingProduct) {
        await update(editingProduct.id, data);
      } else {
        await create(data);
      }

      setShowAddModal(false);
      setShowEditModal(false);
      resetForm();
      loadProducts();
    } catch (err) {
      setFormErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle receive stock submit
  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(receiveQty);
    if (!qty || qty < 1) return;

    setSubmitting(true);
    try {
      await receive(receivingProduct.id, {
        quantity: qty,
        reference_number: receiveRef.trim() || null,
        notes: receiveNotes.trim() || null,
      });
      setShowReceiveModal(false);
      loadProducts();
    } catch (err) {
      setFormErrors({ receive: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await remove(product.id);
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle CSV export
  const handleExport = async () => {
    try {
      const blob = await exportCsv(filters);
      downloadBlob(blob, `products-export-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  // Render stock status badge
  const renderStockStatus = (product) => {
    const status = getStockStatus(product.current_stock, product.reorder_level);
    const label = getStockStatusLabel(status);
    const className = `stock-status ${status.toLowerCase().replace('_', '-')}`;
    return <span className={className}>{label}</span>;
  };

  // Render action buttons
  const renderActions = (product) => (
    <div className="action-buttons">
      <button
        className="btn btn-sm btn-ghost"
        onClick={() => handleEdit(product)}
        aria-label={`Edit ${product.name}`}
      >
        <Edit size={16} />
      </button>
      <button
        className="btn btn-sm btn-ghost"
        onClick={() => handleReceive(product)}
        aria-label={`Receive stock for ${product.name}`}
      >
        <Truck size={16} />
      </button>
      <Link
        to={`/movements/${product.id}`}
        className="btn btn-sm btn-ghost"
        aria-label={`View history for ${product.name}`}
      >
        <Clock size={16} />
      </Link>
    </div>
  );

  const loading = productsLoading || categoriesLoading;

  return (
    <div className="products-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your inventory</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="filter-group" style={{ flex: 2, minWidth: 250 }}>
          <label htmlFor="search">Search</label>
          <div className="input-with-icon">
            <Search className="icon" size={18} aria-hidden="true" />
            <input
              type="text"
              id="search"
              className="form-input"
              placeholder="Search by name or SKU..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            className="form-select"
            value={filters.category_id}
            onChange={(e) => handleFilterChange('category_id', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status">Stock Status</label>
          <select
            id="status"
            className="form-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            {STOCK_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-actions">
          <button className="btn btn-secondary" onClick={() => {
            setFilters({ search: '', category_id: '', status: '', sort: 'name', order: 'asc' });
            setPagination(prev => ({ ...prev, page: 1 }));
          }}>
            <Filter size={18} /> Clear
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', width: '35%' }}>
                Product <span aria-hidden="true">⇅</span>
              </th>
              <th onClick={() => handleSort('category')} style={{ cursor: 'pointer', width: '15%' }}>
                Category <span aria-hidden="true">⇅</span>
              </th>
              <th onClick={() => handleSort('unit_price')} style={{ cursor: 'pointer', width: '12%', textAlign: 'right' }}>
                Unit Price <span aria-hidden="true">⇅</span>
              </th>
              <th onClick={() => handleSort('current_stock')} style={{ cursor: 'pointer', width: '12%', textAlign: 'center' }}>
                Stock <span aria-hidden="true">⇅</span>
              </th>
              <th onClick={() => handleSort('reorder_level')} style={{ cursor: 'pointer', width: '10%', textAlign: 'center' }}>
                Reorder <span aria-hidden="true">⇅</span>
              </th>
              <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
              <th style={{ width: '6%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0 ? (
              products.map(product => (
                <tr key={product.id}>
                  <td>
                    <div className="product-row">
                      <span className="product-name">{product.name}</span>
                      <span className="product-sku">{product.sku}</span>
                    </div>
                  </td>
                  <td>{product.category_name}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                    {formatCurrency(product.unit_price)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="stock-value">{formatNumber(product.current_stock)}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="stock-value">{formatNumber(product.reorder_level)}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderStockStatus(product)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderActions(product)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-8">
                  <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                    <Package className="empty-state-icon" size={48} />
                    <p className="empty-state-title">No products found</p>
                    <p className="empty-state-text">
                      {filters.search || filters.category_id || filters.status
                        ? 'Try adjusting your filters'
                        : 'Add your first product to get started'}
                    </p>
                    {!filters.search && !filters.category_id && !filters.status && (
                      <button className="btn btn-primary" onClick={openAddModal} style={{ marginTop: 'var(--space-3)' }}>
                        <Plus size={18} /> Add Product
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
        <div className="pagination" role="navigation" aria-label="Products pagination">
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
            if (pagination.totalPages <= 5) {
              pageNum = i + 1;
            } else if (pagination.page <= 3) {
              pageNum = i + 1;
            } else if (pagination.page >= pagination.totalPages - 2) {
              pageNum = pagination.totalPages - 4 + i;
            } else {
              pageNum = pagination.page - 2 + i;
            }
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
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} products)
          </span>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)} role="dialog" aria-modal="true" aria-labelledby="add-product-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="add-product-title" className="modal-title">Add Product</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form" noValidate>
              <div className="modal-form-row">
                <div className="form-group">
                  <label htmlFor="add-name" className="form-label">Name *</label>
                  <input
                    type="text"
                    id="add-name"
                    className={`form-input ${formErrors.name ? 'error' : ''}`}
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Product name"
                    required
                    disabled={submitting}
                  />
                  {formErrors.name && <p className="form-error">{formErrors.name}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="add-sku" className="form-label">SKU *</label>
                  <input
                    type="text"
                    id="add-sku"
                    className={`form-input ${formErrors.sku ? 'error' : ''}`}
                    value={formData.sku}
                    onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                    placeholder="UNIQUE-SKU"
                    required
                    disabled={submitting}
                  />
                  {formErrors.sku && <p className="form-error">{formErrors.sku}</p>}
                </div>
              </div>
              <div className="modal-form-row">
                <div className="form-group">
                  <label htmlFor="add-category" className="form-label">Category *</label>
                  <select
                    id="add-category"
                    className={`form-select ${formErrors.category_id ? 'error' : ''}`}
                    value={formData.category_id}
                    onChange={e => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    required
                    disabled={submitting}
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {formErrors.category_id && <p className="form-error">{formErrors.category_id}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="add-price" className="form-label">Unit Price (INR) *</label>
                  <input
                    type="number"
                    id="add-price"
                    step="0.01"
                    min="0"
                    className={`form-input ${formErrors.unit_price ? 'error' : ''}`}
                    value={formData.unit_price}
                    onChange={e => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                    placeholder="0.00"
                    required
                    disabled={submitting}
                  />
                  {formErrors.unit_price && <p className="form-error">{formErrors.unit_price}</p>}
                </div>
              </div>
              <div className="modal-form-row">
                <div className="form-group">
                  <label htmlFor="add-reorder" className="form-label">Reorder Level *</label>
                  <input
                    type="number"
                    id="add-reorder"
                    min="0"
                    className={`form-input ${formErrors.reorder_level ? 'error' : ''}`}
                    value={formData.reorder_level}
                    onChange={e => setFormData(prev => ({ ...prev, reorder_level: e.target.value }))}
                    placeholder="10"
                    required
                    disabled={submitting}
                  />
                  {formErrors.reorder_level && <p className="form-error">{formErrors.reorder_level}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="add-stock" className="form-label">Initial Stock</label>
                  <input
                    type="number"
                    id="add-stock"
                    min="0"
                    className="form-input"
                    value={formData.current_stock}
                    onChange={e => setFormData(prev => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    disabled={submitting}
                  />
                  <p className="form-hint">Leave at 0 for new products; stock is tracked via receipts</p>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="add-description" className="form-label">Description</label>
                <textarea
                  id="add-description"
                  className="form-textarea"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Optional description"
                  disabled={submitting}
                />
              </div>
              {formErrors.submit && (
                <div className="alert alert-danger">
                  <p className="alert-message">{formErrors.submit}</p>
                </div>
              )}
              <div className="modal-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff' }} aria-hidden="true" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Add Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)} role="dialog" aria-modal="true" aria-labelledby="edit-product-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="edit-product-title" className="modal-title">Edit Product</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form" noValidate>
              <div className="modal-form-row">
                <div className="form-group">
                  <label htmlFor="edit-name" className="form-label">Name *</label>
                  <input
                    type="text"
                    id="edit-name"
                    className={`form-input ${formErrors.name ? 'error' : ''}`}
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    disabled={submitting}
                  />
                  {formErrors.name && <p className="form-error">{formErrors.name}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="edit-sku" className="form-label">SKU *</label>
                  <input
                    type="text"
                    id="edit-sku"
                    className={`form-input ${formErrors.sku ? 'error' : ''}`}
                    value={formData.sku}
                    onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                    required
                    disabled={submitting}
                  />
                  {formErrors.sku && <p className="form-error">{formErrors.sku}</p>}
                </div>
              </div>
              <div className="modal-form-row">
                <div className="form-group">
                  <label htmlFor="edit-category" className="form-label">Category *</label>
                  <select
                    id="edit-category"
                    className={`form-select ${formErrors.category_id ? 'error' : ''}`}
                    value={formData.category_id}
                    onChange={e => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    required
                    disabled={submitting}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {formErrors.category_id && <p className="form-error">{formErrors.category_id}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="edit-price" className="form-label">Unit Price (INR) *</label>
                  <input
                    type="number"
                    id="edit-price"
                    step="0.01"
                    min="0"
                    className={`form-input ${formErrors.unit_price ? 'error' : ''}`}
                    value={formData.unit_price}
                    onChange={e => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                    required
                    disabled={submitting}
                  />
                  {formErrors.unit_price && <p className="form-error">{formErrors.unit_price}</p>}
                </div>
              </div>
              <div className="modal-form-row">
                <div className="form-group">
                  <label htmlFor="edit-reorder" className="form-label">Reorder Level *</label>
                  <input
                    type="number"
                    id="edit-reorder"
                    min="0"
                    className={`form-input ${formErrors.reorder_level ? 'error' : ''}`}
                    value={formData.reorder_level}
                    onChange={e => setFormData(prev => ({ ...prev, reorder_level: e.target.value }))}
                    required
                    disabled={submitting}
                  />
                  {formErrors.reorder_level && <p className="form-error">{formErrors.reorder_level}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="edit-stock" className="form-label">Current Stock</label>
                  <input
                    type="number"
                    id="edit-stock"
                    min="0"
                    className="form-input"
                    value={formData.current_stock}
                    onChange={e => setFormData(prev => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))}
                    disabled={submitting}
                  />
                  <p className="form-hint">Current stock level (read-only, updated via receipts/sales)</p>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="edit-description" className="form-label">Description</label>
                <textarea
                  id="edit-description"
                  className="form-textarea"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  disabled={submitting}
                />
              </div>
              {formErrors.submit && (
                <div className="alert alert-danger">
                  <p className="alert-message">{formErrors.submit}</p>
                </div>
              )}
              <div className="modal-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={() => { setShowEditModal(false); handleDelete(editingProduct); }} disabled={submitting}>
                  Delete
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff' }} aria-hidden="true" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {showReceiveModal && receivingProduct && (
        <div className="modal-overlay" onClick={() => setShowReceiveModal(false)} role="dialog" aria-modal="true" aria-labelledby="receive-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="receive-title" className="modal-title">Receive Stock</h2>
              <button className="modal-close" onClick={() => setShowReceiveModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleReceiveSubmit} className="modal-form" noValidate>
              <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
                <svg className="alert-icon" width="20" height={20} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <div className="alert-content">
                  <p className="alert-title">Receiving stock for: <strong>{receivingProduct.name}</strong> ({receivingProduct.sku})</p>
                  <p className="alert-message">Current stock: <strong>{formatNumber(receivingProduct.current_stock)}</strong> | Reorder level: <strong>{formatNumber(receivingProduct.reorder_level)}</strong></p>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="receive-qty" className="form-label">Quantity to Receive *</label>
                <input
                  type="number"
                  id="receive-qty"
                  min="1"
                  className="form-input"
                  value={receiveQty}
                  onChange={e => setReceiveQty(e.target.value)}
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
                  onChange={e => setReceiveRef(e.target.value)}
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
                  onChange={e => setReceiveNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes"
                  disabled={submitting}
                />
              </div>
              {formErrors.receive && (
                <div className="alert alert-danger">
                  <p className="alert-message">{formErrors.receive}</p>
                </div>
              )}
              <div className="modal-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReceiveModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !receiveQty}>
                  {submitting ? (
                    <>
                      <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff' }} aria-hidden="true" />
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

      {loading && (
        <div className="loading-overlay" style={{ position: 'fixed', inset: 0, zIndex: 200 }} aria-label="Loading">
          <div className="loading-spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
        </div>
      )}
    </div>
  );
}