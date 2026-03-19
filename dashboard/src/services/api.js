import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (email, password) =>
    api.post('/signup', { email, password }),
  login: (email, password) =>
    api.post('/login', { email, password }),
};

export const conferencesAPI = {
  getMyConferences: (search = '', filterBy = '', filterValue = '') =>
    api.get('/my-conferences', {
      params: { search, filterBy, filterValue },
    }),
  getKeywordAutocomplete: (q) =>
    api.get('/autocomplete/keywords', { params: { q } }),
};

export default api;
