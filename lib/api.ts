import axios, { AxiosInstance, AxiosError } from 'axios';

// API Base URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    return response.data;
  },
  
  register: async (email: string, name: string, password: string) => {
    const response = await apiClient.post('/api/auth/register', { email, name, password });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },
};

// Users API (Admin)
export const usersAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/users');
    return response.data;
  },
  
  getById: async (userId: string) => {
    const response = await apiClient.get(`/api/users/${userId}`);
    return response.data;
  },
  
  update: async (userId: string, data: any) => {
    const response = await apiClient.patch(`/api/users/${userId}`, data);
    return response.data;
  },
  
  delete: async (userId: string) => {
    await apiClient.delete(`/api/users/${userId}`);
  },
};

// Vorlagen API
export const vorlagenAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/vorlagen');
    return response.data;
  },
  
  getById: async (vorlageId: number) => {
    const response = await apiClient.get(`/api/vorlagen/${vorlageId}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/vorlagen', data);
    return response.data;
  },
  
  update: async (vorlageId: number, data: any) => {
    const response = await apiClient.patch(`/api/vorlagen/${vorlageId}`, data);
    return response.data;
  },
  
  delete: async (vorlageId: number) => {
    await apiClient.delete(`/api/vorlagen/${vorlageId}`);
  },
};

// Chats API
export const chatsAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/chats');
    return response.data;
  },
  
  getById: async (chatId: number) => {
    const response = await apiClient.get(`/api/chats/${chatId}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/chats', data);
    return response.data;
  },
  
  sendMessage: async (data: any) => {
    const response = await apiClient.post('/api/chats/message', data);
    return response.data;
  },
  
  getMessages: async (chatId: number) => {
    const response = await apiClient.get(`/api/chats/${chatId}`);
    // Backend returns full chat object with messages array
    return response.data.messages || [];
  },
  
  delete: async (chatId: number) => {
    await apiClient.delete(`/api/chats/${chatId}`);
  },
};

// Files API
export const filesAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/files');
    return response.data;
  },
  
  getById: async (fileId: number) => {
    const response = await apiClient.get(`/api/files/${fileId}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/files', data);
    return response.data;
  },
  
  delete: async (fileId: number) => {
    await apiClient.delete(`/api/files/${fileId}`);
  },
};

// Settings API
export const settingsAPI = {
  getGlobal: async () => {
    const response = await apiClient.get('/api/settings/global');
    return response.data;
  },
  
  updateGlobal: async (data: any) => {
    const response = await apiClient.patch('/api/settings/global', data);
    return response.data;
  },
};

export default apiClient;

