import { 
  User, 
  SequencingRequest, 
  Sample, 
  SampleProcessing, 
  QualityCheck, 
  SequencingRun, 
  AnalysisRun, 
  GenomicReport, 
  WorkflowHistoryItem, 
  DashboardData 
} from '../types';

const TOKEN_KEY = 'genomics_auth_token';

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearStoredToken = (): void => localStorage.removeItem(TOKEN_KEY);

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ message: string; token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    logout: () =>
      request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
    getMe: () =>
      request<{ user: User }>('/api/auth/me'),
  },

  // Users (Admin)
  users: {
    list: (params?: { role?: string; status?: string; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ users: User[] }>(`/api/users${q ? `?${q}` : ''}`);
    },
    roles: () =>
      request<{ roles: { id: number; name: string; description: string }[] }>('/api/users/roles'),
    create: (userData: any) =>
      request<{ message: string; user: User }>('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    update: (id: number, userData: any) =>
      request<{ message: string; user: User }>(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      }),
    updateStatus: (id: number, status: string) =>
      request<{ message: string; user: User }>(`/api/users/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  },

  // Sequencing Requests
  requests: {
    list: (params?: { status?: string; priority?: string; test_type?: string; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ requests: SequencingRequest[] }>(`/api/requests${q ? `?${q}` : ''}`);
    },
    get: (id: number) =>
      request<{ request: SequencingRequest; samples: Sample[] }>(`/api/requests/${id}`),
    create: (data: Partial<SequencingRequest>) =>
      request<{ message: string; request: SequencingRequest }>('/api/requests', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<SequencingRequest>) =>
      request<{ message: string; request: SequencingRequest }>(`/api/requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/api/requests/${id}`, { method: 'DELETE' }),
  },

  // Samples & Traceability
  samples: {
    list: (params?: { status?: string; sample_type?: string; request_id?: number; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ samples: Sample[] }>(`/api/samples${q ? `?${q}` : ''}`);
    },
    get: (id: number) =>
      request<{
        sample: Sample;
        processing?: SampleProcessing;
        qc?: QualityCheck;
        sequencing?: SequencingRun;
        analysis?: AnalysisRun;
        report?: GenomicReport;
      }>(`/api/samples/${id}`),
    getHistory: (id: number) =>
      request<{ history: WorkflowHistoryItem[] }>(`/api/samples/${id}/history`),
    create: (data: any) =>
      request<{ message: string; sample: Sample }>('/api/samples', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      request<{ message: string; sample: Sample }>(`/api/samples/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Processing (Lab Tech)
  processing: {
    list: (params?: { status?: string; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ processing: SampleProcessing[] }>(`/api/processing${q ? `?${q}` : ''}`);
    },
    get: (sampleId: number) =>
      request<{ processing: SampleProcessing }>(`/api/processing/${sampleId}`),
    start: (sampleId: number, data?: any) =>
      request<{ message: string; processing: SampleProcessing }>(`/api/processing/${sampleId}/start`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    complete: (sampleId: number, data: any) =>
      request<{ message: string; processing: SampleProcessing }>(`/api/processing/${sampleId}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Quality Control (Lab Tech / Admin)
  qc: {
    list: (params?: { result?: string; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ qualityChecks: QualityCheck[] }>(`/api/qc${q ? `?${q}` : ''}`);
    },
    get: (sampleId: number) =>
      request<{ qualityCheck: QualityCheck }>(`/api/qc/${sampleId}`),
    record: (data: any) =>
      request<{ message: string; qualityCheck: QualityCheck; sampleStatus: string }>('/api/qc', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Sequencing (Bioinformatics Analyst / Admin)
  sequencing: {
    list: (params?: { status?: string; platform?: string; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ sequencingRuns: SequencingRun[] }>(`/api/sequencing${q ? `?${q}` : ''}`);
    },
    eligible: () =>
      request<{ eligibleSamples: any[] }>('/api/sequencing/eligible'),
    start: (sampleId: number, data: any) =>
      request<{ message: string; sequencing: SequencingRun }>(`/api/sequencing/${sampleId}/start`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    complete: (sampleId: number, data: any) =>
      request<{ message: string; sequencing: SequencingRun }>(`/api/sequencing/${sampleId}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Bioinformatics Analysis
  analysis: {
    list: (params?: { status?: string; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ analyses: AnalysisRun[] }>(`/api/analysis${q ? `?${q}` : ''}`);
    },
    eligible: () =>
      request<{ eligibleSamples: any[] }>('/api/analysis/eligible'),
    start: (sampleId: number, data: any) =>
      request<{ message: string; analysis: AnalysisRun }>(`/api/analysis/${sampleId}/start`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    complete: (sampleId: number, data: any) =>
      request<{ message: string; analysis: AnalysisRun }>(`/api/analysis/${sampleId}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Reports & Clinical Sign-off
  reports: {
    list: (params?: { status?: string; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ reports: GenomicReport[] }>(`/api/reports${q ? `?${q}` : ''}`);
    },
    get: (id: number) =>
      request<{ report: GenomicReport }>(`/api/reports/${id}`),
    generate: (data: any) =>
      request<{ message: string; report: GenomicReport }>('/api/reports', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    approve: (id: number, data?: { comments?: string }) =>
      request<{ message: string; report: GenomicReport }>(`/api/reports/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    reject: (id: number, data: { rejection_reason: string; comments?: string }) =>
      request<{ message: string; report: GenomicReport }>(`/api/reports/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deliver: (id: number, data?: { recipient_email?: string }) =>
      request<{ message: string; report: GenomicReport }>(`/api/reports/${id}/deliver`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
  },

  // Dashboard Aggregates
  dashboard: {
    get: () => request<DashboardData>('/api/dashboard'),
  },
};
