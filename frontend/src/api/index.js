import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.errors?.[0]?.msg ||
      err.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// Users
export const upsertUser = (data) => api.post('/users', data);
export const getUserByEmail = (email) => api.get(`/users/${encodeURIComponent(email)}`);

// Products
export const addProduct = (data) => api.post('/products', data);
export const getProducts = (email) => api.get(`/products?email=${encodeURIComponent(email)}`);
export const getProductById = (id) => api.get(`/products/${id}`);
export const getPriceHistory = (id, limit = 50) =>
  api.get(`/products/${id}/history?limit=${limit}`);
export const updateTargetPrice = (id, targetPrice) =>
  api.put(`/products/${id}/target`, { targetPrice });
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const checkNow = (id) => api.post(`/products/${id}/check`);
