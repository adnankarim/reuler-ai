import axios from 'axios';

// Get API base URL - the routes already include /api, so base should be just the host
let API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
// Remove /api suffix if present since routes already include it
if (API_BASE.endsWith('/api')) {
  API_BASE = API_BASE.slice(0, -4);
}

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens (future use)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

// ============ Chat API ============
export const chatApi = {
  send: async (question, courseId, sessionId = null) => {
    const { data } = await api.post('/api/chat', { question, courseId, sessionId });
    return data;
  },
  
  getHistory: async (sessionId) => {
    const { data } = await api.get(`/api/chat/history/${sessionId}`);
    return data;
  },
  
  sendFeedback: async (messageId, feedback) => {
    const { data } = await api.post('/api/chat/feedback', { messageId, feedback });
    return data;
  },
};

// ============ Sessions API ============
export const sessionsApi = {
  create: async (courseId, title = 'New Session') => {
    const { data } = await api.post('/api/sessions', { courseId, title });
    return data;
  },
  
  getById: async (sessionId) => {
    const { data } = await api.get(`/api/sessions/${sessionId}`);
    return data;
  },
  
  getByCourse: async (courseId) => {
    const { data } = await api.get(`/api/sessions/course/${courseId}`);
    return data;
  },
  
  update: async (sessionId, updates) => {
    const { data } = await api.put(`/api/sessions/${sessionId}`, updates);
    return data;
  },
  
  delete: async (sessionId) => {
    const { data } = await api.delete(`/api/sessions/${sessionId}`);
    return data;
  },
  
  createSnapshot: async (sessionId) => {
    const { data } = await api.post(`/api/sessions/${sessionId}/snapshot`);
    return data;
  },
};

// ============ Courses API ============
export const coursesApi = {
  getAll: async () => {
    const { data } = await api.get('/api/courses');
    return data;
  },
  
  getById: async (courseId) => {
    const { data } = await api.get(`/api/courses/${courseId}`);
    return data;
  },
  
  create: async (courseData) => {
    const { data } = await api.post('/api/courses', courseData);
    return data;
  },
  
  update: async (courseId, updates) => {
    const { data } = await api.put(`/api/courses/${courseId}`, updates);
    return data;
  },
  
  delete: async (courseId) => {
    const { data } = await api.delete(`/api/courses/${courseId}`);
    return data;
  },
  
  getConcepts: async (courseId) => {
    const { data } = await api.get(`/api/courses/${courseId}/concepts`);
    return data;
  },
  
  buildConceptGraph: async (courseId) => {
    const { data } = await api.post(`/api/courses/${courseId}/concepts/build`);
    return data;
  },
};

// ============ Documents API ============
export const documentsApi = {
  upload: async (file, courseId, docType = 'notes', courseName = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);
    formData.append('docType', docType);
    if (courseName) {
      formData.append('courseName', courseName);
    }
    
    const { data } = await api.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  
  getByCourse: async (courseId) => {
    const { data } = await api.get(`/api/documents/course/${courseId}`);
    // Handle both array and object with documents property
    return Array.isArray(data) ? data : (data.documents || []);
  },
  
  getById: async (documentId) => {
    const { data } = await api.get(`/api/documents/${documentId}`);
    return data;
  },
  
  delete: async (documentId) => {
    const { data } = await api.delete(`/api/documents/${documentId}`);
    return data;
  },
  
  search: async (query, courseId = null) => {
    const { data } = await api.post('/api/documents/search', { query, courseId });
    return data;
  },
};

// ============ AI Generation API (Direct to AI Service) ============
const AI_SERVICE = process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:8000';

export const generateApi = {
  summary: async (courseId, options = {}) => {
    const { data } = await api.post('/api/generate/summary', {
      courseId,
      format: options.format || 'structured',
      topics: options.topics || [],
    });
    return data;
  },
  
  flashcards: async (courseId, options = {}) => {
    const { data } = await api.post('/api/flashcards/generate', {
      courseId,
      count: options.count || 20,
      difficulty: options.difficulty || 'mixed',
      topics: options.topics || [],
    });
    return data;
  },
  
  exam: async (courseId, options = {}) => {
    const { data } = await api.post('/api/exams/generate', {
      courseId,
      question_count: options.question_count || options.count || 10,
      question_types: options.question_types || options.questionTypes || ['multiple_choice', 'short_answer'],
      difficulty: options.difficulty || 'mixed',
      topics: options.topics || [],
    });
    return data;
  },
  
  bibliography: async (courseId, format = 'apa') => {
    const { data } = await api.post('/api/generate/bibliography', {
      courseId,
      format,
    });
    return data;
  },
};

// Flashcards API
export const flashcardsApi = {
  getDecks: async (courseId) => {
    const { data } = await api.get(`/api/flashcards/course/${courseId}`);
    return data;
  },
  
  getDeck: async (deckId) => {
    const { data } = await api.get(`/api/flashcards/deck/${deckId}`);
    return data;
  },
  
  updateStudy: async (cardId, isCorrect) => {
    const { data } = await api.post('/api/flashcards/study', { cardId, isCorrect });
    return data;
  },
  
  getProgress: async (courseId) => {
    const { data } = await api.get(`/api/flashcards/progress/${courseId}`);
    return data;
  }
};

// Exams API
export const examsApi = {
  getExams: async (courseId) => {
    const { data } = await api.get(`/api/exams/course/${courseId}`);
    return data;
  },
  
  getExam: async (examId) => {
    const { data } = await api.get(`/api/exams/${examId}`);
    return data;
  },
  
  startExam: async (examId, courseId) => {
    const { data } = await api.post(`/api/exams/${examId}/start`, { courseId });
    return data;
  },
  
  submitExam: async (examId, attemptId, answers) => {
    const { data } = await api.post(`/api/exams/${examId}/submit`, { attemptId, answers });
    return data;
  },
  
  getAttempts: async (courseId) => {
    const { data } = await api.get(`/api/exams/attempts/${courseId}`);
    return data;
  },
  
  getAttempt: async (attemptId) => {
    const { data } = await api.get(`/api/exams/attempt/${attemptId}`);
    return data;
  }
};

export default api;
