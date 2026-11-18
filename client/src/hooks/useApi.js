import { useState, useCallback } from 'react';

const API_BASE = '/api';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed: ${response.status}`);
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((endpoint) => request(endpoint, { method: 'GET' }), [request]);
  const post = useCallback((endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }), [request]);
  const put = useCallback((endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }), [request]);
  const del = useCallback((endpoint) => request(endpoint, { method: 'DELETE' }), [request]);

  return { get, post, put, del, loading, error, setError };
}

// Auth-specific hooks
export function useAuth() {
  const { get, post, loading, error } = useApi();

  const login = useCallback(async (email, password) => {
    return post('/auth/login', { email, password });
  }, [post]);

  const logout = useCallback(async () => {
    return post('/auth/logout');
  }, [post]);

  const me = useCallback(async () => {
    return get('/auth/me');
  }, [get]);

  return { login, logout, me, loading, error };
}

// Products hooks
export function useProducts() {
  const { get, post, put, del, loading, error } = useApi();

  const list = useCallback(async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return get(`/products?${query}`);
  }, [get]);

  const exportCsv = useCallback(async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/api/products/export?${query}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  }, []);

  const getLowStock = useCallback(async () => {
    return get('/products/low-stock');
  }, [get]);

  const getOne = useCallback(async (id) => {
    return get(`/products/${id}`);
  }, [get]);

  const create = useCallback(async (data) => {
    return post('/products', data);
  }, [post]);

  const update = useCallback(async (id, data) => {
    return put(`/products/${id}`, data);
  }, [put]);

  const remove = useCallback(async (id) => {
    return del(`/products/${id}`);
  }, [del]);

  return { list, exportCsv, getLowStock, getOne, create, update, remove, loading, error };
}

// Categories hooks
export function useCategories() {
  const { get, post, put, del, loading, error } = useApi();

  const list = useCallback(async () => {
    return get('/categories');
  }, [get]);

  const getOne = useCallback(async (id) => {
    return get(`/categories/${id}`);
  }, [get]);

  const create = useCallback(async (data) => {
    return post('/categories', data);
  }, [post]);

  const update = useCallback(async (id, data) => {
    return put(`/categories/${id}`, data);
  }, [put]);

  const remove = useCallback(async (id) => {
    return del(`/categories/${id}`);
  }, [del]);

  return { list, getOne, create, update, remove, loading, error };
}

// Orders hooks
export function useOrders() {
  const { get, post, put, del, loading, error } = useApi();

  const list = useCallback(async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return get(`/orders?${query}`);
  }, [get]);

  const getOne = useCallback(async (id) => {
    return get(`/orders/${id}`);
  }, [get]);

  const create = useCallback(async (data) => {
    return post('/orders', data);
  }, [post]);

  const complete = useCallback(async (id) => {
    return post(`/orders/${id}/complete`);
  }, [post]);

  const cancel = useCallback(async (id) => {
    return post(`/orders/${id}/cancel`);
  }, [post]);

  const remove = useCallback(async (id) => {
    return del(`/orders/${id}`);
  }, [del]);

  return { list, getOne, create, complete, cancel, remove, loading, error };
}

// Movements hooks
export function useMovements() {
  const { get, post, loading, error } = useApi();

  const list = useCallback(async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return get(`/movements?${query}`);
  }, [get]);

  const getHistory = useCallback(async (productId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return get(`/movements/${productId}/history?${query}`);
  }, [get]);

  const receive = useCallback(async (productId, data) => {
    return post(`/movements/receive/${productId}`, data);
  }, [post]);

  const adjust = useCallback(async (productId, data) => {
    return post(`/movements/adjust/${productId}`, data);
  }, [post]);

  return { list, getHistory, receive, adjust, loading, error };
}

// Restock hooks
export function useRestock() {
  const { get, post, loading, error } = useApi();

  const list = useCallback(async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return get(`/restock?${query}`);
  }, [get]);

  const getSummary = useCallback(async () => {
    return get('/restock/summary');
  }, [get]);

  const getOne = useCallback(async (id) => {
    return get(`/restock/${id}`);
  }, [get]);

  const create = useCallback(async (data) => {
    return post('/restock', data);
  }, [post]);

  const approve = useCallback(async (id) => {
    return post(`/restock/${id}/approve`);
  }, [post]);

  const markDelivery = useCallback(async (id) => {
    return post(`/restock/${id}/mark-delivery`);
  }, [post]);

  const receive = useCallback(async (id) => {
    return post(`/restock/${id}/receive`);
  }, [post]);

  const cancel = useCallback(async (id) => {
    return post(`/restock/${id}/cancel`);
  }, [post]);

  return { list, getSummary, getOne, create, approve, markDelivery, receive, cancel, loading, error };
}

// Insights hooks
export function useInsights() {
  const { get, post, loading, error } = useApi();

  const getOverview = useCallback(async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return get(`/insights/overview?${query}`);
  }, [get]);

  const getTrends = useCallback(async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return get(`/insights/trends?${query}`);
  }, [get]);

  const getStockAlerts = useCallback(async () => {
    return get('/insights/stock-alerts');
  }, [get]);

  const requestRestock = useCallback(async (productId, data) => {
    return post(`/insights/stock-alerts/${productId}/request-restock`, data);
  }, [post]);

  return { getOverview, getTrends, getStockAlerts, requestRestock, loading, error };
}