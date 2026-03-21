import axios from 'axios';

let apiBaseUrl = import.meta.env.VITE_API_URL || '';

// Force relative paths if deployed on Vercel but VITE_API_URL contains localhost
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    apiBaseUrl = '/api';
} else if (!apiBaseUrl) {
    apiBaseUrl = 'http://localhost:8000/api';
} else if (!apiBaseUrl.endsWith('/api') && !apiBaseUrl.endsWith('/api/')) {
    apiBaseUrl = apiBaseUrl.replace(/\/$/, '') + '/api';
}

const api = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add the access token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor to handle token refresh on 401 errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const response = await axios.post(`${apiBaseUrl}/token/refresh/`, {
                        refresh: refreshToken,
                    });
                    localStorage.setItem('access_token', response.data.access);
                    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // If refresh fails, log out
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
