import axios from 'axios';
import {
  Student,
  SubjectCode,
  CatExam,
  SyncState,
  DataQualityIssue,
  AcademicConfig,
  SheetConnectionConfig
} from '../types/academic';

// Direct production backend URL embedded directly in code
export const PROD_BACKEND_URL = 'https://analyzer-backend-1.onrender.com';

// Clean up any old localStorage override if previously stored
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('CUSTOM_API_BASE_URL');
  } catch (_) {}
}

// In production, always use the direct backend URL. In local dev, use dev proxy /api or VITE_API_BASE_URL
export const API_BASE = import.meta.env.PROD
  ? `${PROD_BACKEND_URL}/api`
  : (import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')}/api` : '/api');

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// Anti-cache and performance measurement interceptors
client.interceptors.request.use(config => {
  (config as any).metadata = { startTime: performance.now() };
  config.params = { ...config.params, _t: Date.now() };
  return config;
});

client.interceptors.response.use(
  response => {
    const startTime = (response.config as any).metadata?.startTime;
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`[FRONTEND PERF] ${response.config.url} loaded in ${duration.toFixed(1)} ms`);
    }
    return response;
  },
  error => {
    const startTime = (error.config as any)?.metadata?.startTime;
    if (startTime) {
      const duration = performance.now() - startTime;
      console.warn(`[FRONTEND PERF ERROR] ${error.config?.url} failed after ${duration.toFixed(1)} ms:`, error.message);
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Health
  getHealth: async () => {
    const res = await client.get('/health');
    return res.data;
  },

  // Dashboard
  getDashboard: async (cat: CatExam = 'CAT-1') => {
    const res = await client.get('/dashboard', { params: { cat } });
    return res.data;
  },

  // Students
  getStudents: async (params?: { cat?: CatExam; status?: string; search?: string; page?: number; limit?: number }) => {
    const res = await client.get('/students', { params });
    return res.data;
  },

  getStudentById: async (id: string): Promise<{ student: Student }> => {
    const res = await client.get(`/students/${id}`);
    return res.data;
  },

  getPassedStudents: async (params?: { cat?: CatExam; subject?: SubjectCode; search?: string }) => {
    const res = await client.get('/students/passed', { params });
    return res.data;
  },

  getFailedStudents: async (params?: { cat?: CatExam; subject?: SubjectCode; search?: string }) => {
    const res = await client.get('/students/failed', { params });
    return res.data;
  },

  getAbsentStudents: async (params?: { cat?: CatExam; subject?: SubjectCode; search?: string }) => {
    const res = await client.get('/students/absent', { params });
    return res.data;
  },

  // Subjects
  getSubjects: async () => {
    const res = await client.get('/subjects');
    return res.data;
  },

  getSubjectById: async (id: string) => {
    const res = await client.get(`/subjects/${id}`);
    return res.data;
  },

  // CAT Analytics
  getCatAnalytics: async (catNum: number | string) => {
    const res = await client.get(`/cat/${catNum}`);
    return res.data;
  },

  // Assessments & Assignments
  getAssessmentIssues: async (params?: { subject?: SubjectCode; cat?: CatExam | 'ALL'; status?: string; search?: string }) => {
    const res = await client.get('/assessment/issues', { params });
    return res.data;
  },

  getAssignmentIssues: async (params?: { subject?: SubjectCode; cat?: CatExam | 'ALL'; status?: string; search?: string }) => {
    const res = await client.get('/assignment/issues', { params });
    return res.data;
  },

  // Data Quality
  getDataQuality: async (): Promise<{
    totalIssues: number;
    issues: DataQualityIssue[];
    warnings: string[];
    mappingDiagnostics?: any[];
    headerLayout?: string;
    syncState: SyncState;
  }> => {
    const res = await client.get('/data-quality');
    return res.data;
  },

  // Sync & Connection
  getSyncStatus: async (): Promise<SyncState> => {
    const res = await client.get('/sync/status');
    return res.data;
  },

  syncNow: async (data?: { url?: string; gid?: string }) => {
    const res = await client.post('/sync/now', data);
    return res.data;
  },

  getConnection: async (): Promise<{ connection: SheetConnectionConfig; syncState: SyncState }> => {
    const res = await client.get('/connection');
    return res.data;
  },

  postConnection: async (data: Partial<SheetConnectionConfig>) => {
    const res = await client.post('/connection', data);
    return res.data;
  },

  deleteConnection: async () => {
    const res = await client.delete('/connection');
    return res.data;
  },

  // Settings
  getSettings: async (): Promise<{ academic: AcademicConfig; connection: SheetConnectionConfig }> => {
    const res = await client.get('/settings');
    return res.data;
  },

  updateSettings: async (data: { academic?: Partial<AcademicConfig>; connection?: Partial<SheetConnectionConfig> }) => {
    const res = await client.post('/settings', data);
    return res.data;
  },

  // Report URLs
  getExcelReportUrl: (cat?: CatExam) => `${API_BASE}/reports/excel${cat ? `?cat=${cat}` : ''}`,
  getPdfReportUrl: (cat: CatExam = 'CAT-1', title?: string) => `${API_BASE}/reports/pdf?cat=${cat}${title ? `&title=${encodeURIComponent(title)}` : ''}`,
  getCsvTemplateUrl: () => `${API_BASE}/reports/template`,

  // Diagnostic Health Check
  checkBackendHealth: async (): Promise<{ ok: boolean; status?: number; error?: string; service?: string }> => {
    const url = import.meta.env.PROD ? `${PROD_BACKEND_URL}/health` : '/health';
    try {
      const res = await axios.get(url, { timeout: 8000 });
      return { ok: true, status: res.status, service: res.data?.service };
    } catch (err: any) {
      return {
        ok: false,
        error: err.message === 'Network Error'
          ? 'Network Error / CORS preflight blocked.'
          : (err.message || 'Connection failed')
      };
    }
  }
};

