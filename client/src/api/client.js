import axios from 'axios';

// Create a configured axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', // Uses env variable in production, fallback to localhost
  withCredentials: true, // Important for sending/receiving HTTP-only cookies if we used them, but we use localStorage for tokens
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent infinite retry loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor: add access token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and refresh tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // If the endpoint was the refresh endpoint itself, or login/signup, don't retry to avoid loops
      if (
        originalRequest.url.includes('/auth/refresh') || 
        originalRequest.url.includes('/auth/login') ||
        originalRequest.url.includes('/auth/signup')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait for the refresh call to finish
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post('http://localhost:5000/api/auth/refresh', {
          refreshToken
        });

        // Save new tokens
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);

        apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + data.data.accessToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + data.data.accessToken;
        
        processQueue(null, data.data.accessToken);
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // If refresh fails (e.g. token reuse detected, or expired), clear everything
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tenant');
        localStorage.removeItem('user');
        
        // Redirect to login (better done via context or event dispatcher in React)
        window.dispatchEvent(new Event('auth:unauthorized'));
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
