import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package,
  Tag,
  ArrowUp,
  ArrowDown,
  Minus,
  Box,
} from 'lucide-react';
import { useMovements, useProducts } from '../hooks/useApi';
import { formatNumber, formatDateTime, getMovementTypeLabel } from '../utils/format';

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'SALE', label: 'Sale' },
  { value: 'RESTOCK', label: 'Restock' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
];

export function Movements() {
  const { list, getHistory, loading: movementsLoading } = useMovements();
  const { list: listProducts, loading: productsLoading } = useProducts();

  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    product_id: '',
    type: '',
    date_from: '',
    date_to: '',
  });
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productMovements, setProductMovements] = useState([]);
  const [productPagination, setProductPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  // Load products for dropdown
  useEffect(() => {
    listProducts({ limit: 100, page: 1 }).then(res => setProducts(res.products));
  }, [listProducts]);

  // Load movements when filters/pagination change
  const loadMovements = useCallback(async () => {
    try {
      const res = await list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setMovements(res.movements);
      setPagination(prev => ({ ...prev, total: res.pagination.total, totalPages: res.pagination.totalPages }));
    } catch (err) {
      console.error('Failed to load movements:', err);
    }
  }, [list, pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  // Load product-specific movements
  const loadProductMovements = useCallback(async () => {
    if (!selectedProduct) return;
    try {
      const res = await getHistory(selectedProduct.id, {
        page: productPagination.page,
        limit: productPagination.limit,
      });
      setProductMovements(res.movements);
      setProductPagination(prev => ({ ...prev, total: res.pagination.total, totalPages: res.pagination.totalPages }));
    } catch (err) {
      console.error('Failed to load product movements:', err);
    }
  }, [getHistory, selectedProduct, productPagination.page, productPagination.limit]);

  useEffect(() => {
    if (showProductDetail && selectedProduct) {
      loadProductMovements();
    }
  }, [showProductDetail, selectedProduct, productPagination.page, productPagination.limit, loadProductMovements]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
    setProductPagination(prev => ({ ...prev, page: 1 }));
  };

  const closeProductDetail = () => {
    setShowProductDetail(false);
    setSelectedProduct(null);
    setProductMovements([]);
  };

  const renderMovementType = (type) => {
    const labels = { RECEIPT: 'Receipt', SALE: 'Sale', RESTOCK: 'Restock', ADJUSTMENT: 'Adjustment' };
    const className = `movement-type ${type.toLowerCase()}`;
    return (
      <span className={className}>
        {labels[type] || type}
      </span>
    );
  };

  const renderQuantity = (movement) => {
    const isIncrease = ['RECEIPT', 'RESTOCK'].includes(movement.type);
    const icon = isIncrease ? <ArrowUp size={14} className="text-success" /> : <ArrowDown size={14} className="text-danger" />;
    const sign = isIncrease ? '+' : '-';
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontWeight: 500, color: isIncrease ? 'var(--color-success)' : 'var(--color-danger)' }}>
        {icon}
        {sign}{formatNumber(movement.quantity)}
      </span>
    );
  };

  const renderReference = (movement) => {
    if (!movement.reference_number) return '-';
    if (movement.reference_type === 'ORDER' && movement.reference_id) {
      return <Link to={`/orders/${movement.reference_id}`} className="font-mono text-primary hover:underline">{movement.reference_number}</Link>;
    }
    if (movement.reference_type === 'RESTOCK_REQUEST' && movement.reference_id) {
      return <Link to={`/restock/${movement.reference_id}`} className="font-mono text-primary hover:underline">{movement.reference_number}</Link>;
    }
    return <span className="font-mono">{movement.reference_number}</span>;
  };

  const loading = movementsLoading || productsLoading;

  return (
    <div className="movements-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Movement History</h1>
          <p className="page-subtitle">Track all stock movements</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="filter-group" style={{ flex: 2, minWidth: 200 }}>
          <label htmlFor="mov-product">Product</label>
          <select
            id="mov-product"
            className="form-select"
            value={filters.product_id}
            onChange={(e) => handleFilterChange('product_id', e.target.value)}
          >
            <option value="">All Products</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="mov-type">Type</label>
          <select
            id="mov-type"
            className="form-select"
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="mov-date-from">From</label>
          <input
            type="date"
            id="mov-date-from"
            className="form-input"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="mov-date-to">To</label>
          <input
            type="date"
            id="mov-date-to"
            className="form-input"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <button className="btn btn-secondary" onClick={() => {
            setFilters({ product_id: '', type: '', date_from: '', date_to: '' });
            setPagination(prev => ({ ...prev, page: 1 }));
          }}>
            <Filter size={18} /> Clear
          </button>
        </div>
      </div>

      {/* Movements Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Date & Time</th>
              <th style={{ width: '25%' }}>Product</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Type</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Quantity</th>
              <th style={{ width: '18%' }}>Reference</th>
              <th style={{ width: '15%' }}>User</th>
              <th style={{ width: '5%', textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {movements.length > 0 ? (
              movements.map(movement => (
                <tr key={movement.id}>
                  <td>{formatDateTime(movement.created_at)}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleViewProduct({ id: movement.product_id, name: movement.product_name, sku: movement.product_sku })}
                      style={{ textAlign: 'left', padding: 0 }}
                    >
                      <div className="product-row">
                        <span className="product-name">{movement.product_name}</span>
                        <span className="product-sku">{movement.product_sku}</span>
                      </div>
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderMovementType(movement.type)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderQuantity(movement)}
                  </td>
                  <td>{renderReference(movement)}</td>
                  <td>{movement.created_by_name || 'System'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <Link to={`/movements/${movement.product_id}`} className="btn btn-sm btn-ghost" aria-label="View product history">
                      <Box size={14} />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <div className="empty-state">
                    <Package className="empty-state-icon" size={48} />
                    <p className="empty-state-title">No movements found</p>
                    <p className="empty-state-text">
                      {filters.product_id || filters.type || filters.date_from
                        ? 'Try adjusting your filters'
                        : 'Stock movements will appear here as you receive and sell products'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination" role="navigation" aria-label="Movements pagination">
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
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} movements)
          </span>
        </div>
      )}

      {/* Product Movement Detail Modal */}
      {showProductDetail && selectedProduct && (
        <div className="modal-overlay" onClick={closeProductDetail} role="dialog" aria-modal="true" aria-labelledby="product-movements-title" style={{ maxHeight: '90vh', overflow: 'auto' }}>
          <div className="modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="product-movements-title" className="modal-title">
                Movement History: {selectedProduct.name} ({selectedProduct.sku})
              </h2>
              <button className="modal-close" onClick={closeProductDetail} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflow: 'auto' }}>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Date & Time</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>Type</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Quantity</th>
                      <th style={{ width: '20%' }}>Reference</th>
                      <th style={{ width: '15%' }}>User</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productMovements.length > 0 ? (
                      productMovements.map(movement => (
                        <tr key={movement.id}>
                          <td>{formatDateTime(movement.created_at)}</td>
                          <td style={{ textAlign: 'center' }}>
                            {renderMovementType(movement.type)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {renderQuantity(movement)}
                          </td>
                          <td>{renderReference(movement)}</td>
                          <td>{movement.created_by_name || 'System'}</td>
                          <td className="text-gray-500">{movement.notes || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          No movements for this product
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for product movements */}
              {productPagination.totalPages > 1 && (
                <div className="pagination" role="navigation" aria-label="Product movements pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => setProductPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={productPagination.page === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: Math.min(5, productPagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (productPagination.totalPages <= 5) pageNum = i + 1;
                    else if (productPagination.page <= 3) pageNum = i + 1;
                    else if (productPagination.page >= productPagination.totalPages - 2) pageNum = productPagination.totalPages - 4 + i;
                    else pageNum = productPagination.page - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        className={`pagination-btn ${productPagination.page === pageNum ? 'active' : ''}`}
                        onClick={() => setProductPagination(prev => ({ ...prev, page: pageNum }))}
                        aria-label={`Page ${pageNum}`}
                        aria-current={productPagination.page === pageNum ? 'page' : undefined}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    className="pagination-btn"
                    onClick={() => setProductPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={productPagination.page === productPagination.totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="pagination-info">
                    Page {productPagination.page} of {productPagination.totalPages} ({productPagination.total} movements)
                  </span>
                </div>
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