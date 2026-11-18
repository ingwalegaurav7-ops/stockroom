import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Package, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCategories } from '../hooks/useApi';

export function Categories() {
  const { list, create, update, remove, loading } = useCategories();

  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load categories on mount
  useEffect(() => {
    list().then(res => setCategories(res.categories));
  }, [list]);

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setFormErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setEditingCategory(null);
    setShowAddModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || '' });
    setShowEditModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Category name is required';
    if (formData.name.trim().length > 80) errors.name = 'Name must be 80 characters or less';
    if (formData.description && formData.description.length > 500) errors.description = 'Description must be 500 characters or less';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      };

      if (editingCategory) {
        await update(editingCategory.id, data);
      } else {
        await create(data);
      }

      setShowAddModal(false);
      setShowEditModal(false);
      resetForm();
      list().then(res => setCategories(res.categories));
    } catch (err) {
      setFormErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return;
    try {
      await remove(category.id);
      list().then(res => setCategories(res.categories));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="categories-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize your products</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Category Name</th>
                <th style={{ width: '15%' }}>Product Count</th>
                <th style={{ width: '40%' }}>Description</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length > 0 ? (
                categories.map(category => (
                  <tr key={category.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center" aria-hidden="true">
                          <Tag size={18} className="text-primary" />
                        </div>
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono font-medium">{category.product_count || 0}</span>
                    </td>
                    <td className="text-gray-600 truncate max-w-xs">
                      {category.description || '<em class="text-gray-400">No description</em>'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons justify-center">
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleEdit(category)}
                          aria-label={`Edit ${category.name}`}
                        >
                          <Edit size={16} />
                        </button>
                        {(category.product_count || 0) === 0 && (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleDelete(category)}
                            aria-label={`Delete ${category.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <div className="empty-state">
                      <Tag className="empty-state-icon" size={48} />
                      <p className="empty-state-title">No categories yet</p>
                      <p className="empty-state-text">Create categories to organize your products</p>
                      <button className="btn btn-primary" onClick={openAddModal} style={{ marginTop: 'var(--space-3)' }}>
                        <Plus size={18} /> Add Category
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)} role="dialog" aria-modal="true" aria-labelledby="add-category-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="add-category-title" className="modal-title">Add Category</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form" noValidate>
              <div className="form-group">
                <label htmlFor="add-cat-name" className="form-label">Category Name *</label>
                <input
                  type="text"
                  id="add-cat-name"
                  className={`form-input ${formErrors.name ? 'error' : ''}`}
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Electronics, Office Supplies"
                  maxLength={80}
                  required
                  disabled={submitting}
                  autoFocus
                />
                {formErrors.name && <p className="form-error">{formErrors.name}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="add-cat-desc" className="form-label">Description</label>
                <textarea
                  id="add-cat-desc"
                  className={`form-textarea ${formErrors.description ? 'error' : ''}`}
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Optional description"
                  maxLength={500}
                  disabled={submitting}
                />
                {formErrors.description && <p className="form-error">{formErrors.description}</p>}
                <p className="form-hint">This category will be available in product forms and filters</p>
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
                      <span>Adding...</span>
                    </>
                  ) : (
                    'Add Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && editingCategory && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)} role="dialog" aria-modal="true" aria-labelledby="edit-category-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="edit-category-title" className="modal-title">Edit Category</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form" noValidate>
              <div className="form-group">
                <label htmlFor="edit-cat-name" className="form-label">Category Name *</label>
                <input
                  type="text"
                  id="edit-cat-name"
                  className={`form-input ${formErrors.name ? 'error' : ''}`}
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  maxLength={80}
                  required
                  disabled={submitting}
                  autoFocus
                />
                {formErrors.name && <p className="form-error">{formErrors.name}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="edit-cat-desc" className="form-label">Description</label>
                <textarea
                  id="edit-cat-desc"
                  className={`form-textarea ${formErrors.description ? 'error' : ''}`}
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  disabled={submitting}
                />
                {formErrors.description && <p className="form-error">{formErrors.description}</p>}
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
                {(editingCategory.product_count || 0) === 0 && (
                  <button type="button" className="btn btn-danger" onClick={() => { setShowEditModal(false); handleDelete(editingCategory); }} disabled={submitting}>
                    <Trash2 size={16} /> Delete
                  </button>
                )}
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

      {loading && (
        <div className="loading-overlay" style={{ position: 'fixed', inset: 0, zIndex: 200 }} aria-label="Loading">
          <div className="loading-spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
        </div>
      )}
    </div>
  );
}