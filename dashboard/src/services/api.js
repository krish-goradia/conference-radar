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
  getMyConferences: (search = '', filterBy = '', filterValue = '', selectedDomains = [], selectedKeywords = []) =>
    api.get('/my-conferences', {
      params: { 
        search, 
        filterBy, 
        filterValue,
        selectedDomains: selectedDomains.length > 0 ? JSON.stringify(selectedDomains) : undefined,
        selectedKeywords: selectedKeywords.length > 0 ? JSON.stringify(selectedKeywords) : undefined
      },
    }),
  getResearchDomains: () =>
    api.get('/research-domains'),
  getSearchAutocomplete: (q) =>
    api.get('/autocomplete/search', { params: { q } }),
  getKeywordAutocomplete: (q) =>
    api.get('/autocomplete/keywords', { params: { q } }),
  getTitleAutocomplete: (q) =>
    api.get('/autocomplete/titles', { params: { q } }),
  getDomainAutocomplete: (q) =>
    api.get('/autocomplete/domains', { params: { q } }),
  getUserConferences: (userId, search = '', filterBy = '', filterValue = '') =>
    api.get(`/user/${userId}/conferences`, {
      params: { search, filterBy, filterValue },
    }),
  getUserInfo: (userId) =>
    api.get(`/user/${userId}/info`),
};

export default api;
