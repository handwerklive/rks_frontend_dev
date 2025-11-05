import axios, { AxiosInstance, AxiosError } from 'axios';

// API Base URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120 seconds (2 minutes) - increased for LightRAG queries
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
  
  updateUser: async (userId: string, data: any) => {
    const response = await apiClient.patch(`/api/users/${userId}`, data);
    return response.data;
  },
  
  deleteUser: async (userId: string) => {
    await apiClient.delete(`/api/users/${userId}`);
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
  getAll: async (limit: number = 25, offset: number = 0) => {
    const response = await apiClient.get('/api/vorlagen', {
      params: { limit, offset }
    });
    // Return paginated response: { items, total, limit, offset, has_more }
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
  getAll: async (limit: number = 25, offset: number = 0) => {
    const response = await apiClient.get('/api/chats', {
      params: { limit, offset }
    });
    // Return paginated response: { items, total, limit, offset, has_more }
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

// Logs API (Admin)
export const logsAPI = {
  getAll: async (params?: {
    log_type?: string;
    user_id?: string;
    chat_id?: number;
    start_date?: string;
    end_date?: string;
    min_duration_ms?: number;
    max_duration_ms?: number;
    status_code?: number;
    search_term?: string;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const response = await apiClient.get('/api/logs', { params });
    return response.data;
  },
  
  getStats: async () => {
    const response = await apiClient.get('/api/logs/stats');
    return response.data;
  },
  
  delete: async (logId: number) => {
    await apiClient.delete(`/api/logs/${logId}`);
  },
  
  deleteAll: async (confirm: boolean = false) => {
    await apiClient.delete('/api/logs', { params: { confirm } });
  },
};

// Transcriptions API
export const transcriptionsAPI = {
  upload: async (audioFile: File, language: string = 'de', onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('language', language);
    
    const response = await apiClient.post('/api/transcriptions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes for large files
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },
  
  getAll: async (limit: number = 25, offset: number = 0, statusFilter?: string) => {
    const params: any = { limit, offset };
    if (statusFilter) {
      params.status_filter = statusFilter;
    }
    const response = await apiClient.get('/api/transcriptions', { params });
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await apiClient.get(`/api/transcriptions/${id}`);
    return response.data;
  },
  
  getAudioUrl: async (id: number, expiresIn: number = 3600) => {
    const response = await apiClient.get(`/api/transcriptions/${id}/audio-url`, {
      params: { expires_in: expiresIn }
    });
    return response.data;
  },
  
  markUsed: async (id: number, chatId?: number, vorlageId?: number) => {
    const response = await apiClient.patch(`/api/transcriptions/${id}/mark-used`, null, {
      params: { chat_id: chatId, vorlage_id: vorlageId }
    });
    return response.data;
  },
  
  delete: async (id: number) => {
    await apiClient.delete(`/api/transcriptions/${id}`);
  },
  
  addToNotebook: async (transcriptionId: number, pageId: number) => {
    const response = await apiClient.post(`/api/transcriptions/${transcriptionId}/add-to-notebook`, null, {
      params: { page_id: pageId }
    });
    return response.data;
  },
};

// Notebooks API
export const notebooksAPI = {
  // Pages
  getAllPages: async (limit: number = 25, offset: number = 0) => {
    const response = await apiClient.get('/api/notebooks/pages', {
      params: { limit, offset }
    });
    return response.data;
  },
  
  getPageById: async (pageId: number) => {
    const response = await apiClient.get(`/api/notebooks/pages/${pageId}`);
    return response.data;
  },
  
  createPage: async (data: { title: string; description?: string }) => {
    const response = await apiClient.post('/api/notebooks/pages', data);
    return response.data;
  },
  
  updatePage: async (pageId: number, data: { title?: string; description?: string; ai_summary?: string }) => {
    const response = await apiClient.patch(`/api/notebooks/pages/${pageId}`, data);
    return response.data;
  },
  
  deletePage: async (pageId: number) => {
    await apiClient.delete(`/api/notebooks/pages/${pageId}`);
  },
  
  generateSummary: async (pageId: number) => {
    const response = await apiClient.post(`/api/notebooks/pages/${pageId}/generate-summary`);
    return response.data;
  },
  
  // Notes
  createNote: async (data: { page_id: number; content: string; display_order?: number }) => {
    const response = await apiClient.post('/api/notebooks/notes', data);
    return response.data;
  },
  
  updateNote: async (noteId: number, data: { content?: string; display_order?: number }) => {
    const response = await apiClient.patch(`/api/notebooks/notes/${noteId}`, data);
    return response.data;
  },
  
  deleteNote: async (noteId: number) => {
    await apiClient.delete(`/api/notebooks/notes/${noteId}`);
  },
};

export default apiClient;

