import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 responses globally
// Distinguishes between auth-check calls (silent) and protected route calls (toast + redirect)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const url = error.config?.url || '';

    if (status === 401) {
      // Clear stale auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Don't redirect if this is the silent token-verification call on load
      const isSilentCheck = url.includes('/auth/me');

      if (!isSilentCheck && window.location.pathname !== '/login') {
        // Show a message based on the error code
        const message =
          code === 'TOKEN_EXPIRED'
            ? 'Your session has expired. Please log in again.'
            : 'Authentication required. Please log in.';

        // Use a custom event so AuthContext / toast can pick it up
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { message } }));
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
