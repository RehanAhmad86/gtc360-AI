import axios from 'axios';

const rawUrl =
  import.meta.env.VITE_PYTHON_AI_URL ||
  (import.meta.env.PROD
    ? 'https://rehan048686-guardmate-ai.hf.space'
    : 'http://localhost:7860');

const BASE_URL = rawUrl.replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Automatically inject JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gtc360_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle auth expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or invalid
      localStorage.removeItem('gtc360_token');
      localStorage.removeItem('gtc360_user');
      window.dispatchEvent(new Event('gtc360_auth_change'));
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: async (payload) => {
    const res = await apiClient.post('/auth/signup', payload);
    if (res.data.token) {
      localStorage.setItem('gtc360_token', res.data.token);
      localStorage.setItem('gtc360_user', JSON.stringify(res.data.user));
      window.dispatchEvent(new Event('gtc360_auth_change'));
    }
    return res.data;
  },

  login: async (payload) => {
    const res = await apiClient.post('/auth/login', payload);
    if (res.data.token) {
      localStorage.setItem('gtc360_token', res.data.token);
      localStorage.setItem('gtc360_user', JSON.stringify(res.data.user));
      window.dispatchEvent(new Event('gtc360_auth_change'));
    }
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('gtc360_token');
    localStorage.removeItem('gtc360_user');
    window.dispatchEvent(new Event('gtc360_auth_change'));
  },

  getCurrentUser: () => {
    try {
      const u = localStorage.getItem('gtc360_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  getToken: () => localStorage.getItem('gtc360_token'),
};

export const userAPI = {
  getProfile: async () => {
    const res = await apiClient.get('/user/profile');
    if (res.data.user) {
      localStorage.setItem('gtc360_user', JSON.stringify(res.data.user));
    }
    return res.data.user;
  },

  updatePreferences: async (preferences) => {
    const res = await apiClient.post('/user/preferences', preferences);
    if (res.data.user) {
      localStorage.setItem('gtc360_user', JSON.stringify(res.data.user));
      window.dispatchEvent(new Event('gtc360_auth_change'));
    }
    return res.data.user;
  },
};

export const matchingAPI = {
  getMatches: async (params = {}) => {
    const res = await apiClient.post('/match', params);
    return res.data;
  },

  compareGrants: async (grantIds) => {
    const res = await apiClient.post('/grants/compare', { grant_ids: grantIds });
    return res.data.grants || [];
  },
};

export const systemAPI = {
  getHealth: async () => {
    const res = await apiClient.get('/health');
    return res.data;
  },

  triggerSync: async (live = true) => {
    const res = await apiClient.post(`/sync-grants?live=${live}`);
    return res.data;
  },
};
