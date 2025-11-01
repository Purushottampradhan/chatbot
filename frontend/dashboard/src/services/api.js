import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me')
};

export const chatAPI = {
  getAllChats: (params) => api.get('/chats/all', { params }),
  getChatHistory: (userId, sessionId) => api.get(`/chats/history/${userId}/${sessionId}`)
};

export const policyAPI = {
  getAllPolicies: (params) => api.get('/policies', { params }),
  createPolicy: (policyData) => api.post('/policies', policyData),
  updatePolicy: (id, policyData) => api.put(`/policies/${id}`, policyData),
  deletePolicy: (id) => api.delete(`/policies/${id}`)
};

export default api;
