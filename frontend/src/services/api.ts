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

// Resolve API base URL from localStorage, Vite environment variables, or fallback
export const DEFAULT_PROD_URL = 'https://analyzer-backend-f3zv.onrender.com';

export const getResolvedBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('CUSTOM_API_BASE_URL');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  }
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase && envBase.trim()) {
    return envBase.trim().replace(/\/+$/, '');
  }
  return import.meta.env.PROD ? DEFAULT_PROD_URL : '';
};

export const setCustomApiBaseUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('CUSTOM_API_BASE_URL', url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('CUSTOM_API_BASE_URL');
    }
  }
};

export const resetCustomApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('CUSTOM_API_BASE_URL');
  }
};

export const getApiBase = (): string => {
  const base = getResolvedBaseUrl();
  return base ? `${base}/api` : '/api';
};

export const API_BASE = getApiBase();

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

// Anti-cache and dynamic URL routing interceptor
client.interceptors.request.use(config => {
  const base = getResolvedBaseUrl();
  config.baseURL = base ? `${base}/api` : '/api';
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
  getExcelReportUrl: (cat?: CatExam) => `${getApiBase()}/reports/excel${cat ? `?cat=${cat}` : ''}`,
  getPdfReportUrl: (cat: CatExam = 'CAT-1', title?: string) => `${getApiBase()}/reports/pdf?cat=${cat}${title ? `&title=${encodeURIComponent(title)}` : ''}`,
  getCsvTemplateUrl: () => `${getApiBase()}/reports/template`,

  // Diagnostic Health Check
  checkBackendHealth: async (customUrl?: string): Promise<{ ok: boolean; status?: number; error?: string; service?: string }> => {
    const targetBase = customUrl ? customUrl.trim().replace(/\/+$/, '') : getResolvedBaseUrl();
    const url = targetBase ? `${targetBase}/health` : '/health';
    try {
      const res = await axios.get(url, { timeout: 8000 });
      return { ok: true, status: res.status, service: res.data?.service };
    } catch (err: any) {
      if (err.response) {
        if (err.response.headers?.['x-render-routing'] === 'no-server') {
          return {
            ok: false,
            status: err.response.status,
            error: 'Render Routing: No active Web Service found at this URL (x-render-routing: no-server). Please verify your Web Service name/URL in the Render dashboard.'
          };
        }
        return {
          ok: false,
          status: err.response.status,
          error: `Server responded with status ${err.response.status}`
        };
      }
      return {
        ok: false,
        error: err.message === 'Network Error'
          ? 'Network Error / CORS preflight blocked. The server may be offline, sleeping, or unreachable.'
          : (err.message || 'Connection failed')
      };
    }
  }
};

