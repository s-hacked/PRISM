// API client for the PRISM backend.
// Base URL is configurable via VITE_API_URL (see .env.example).
// In development the Vite dev server proxies /api/* to the backend,
// so all calls use same-origin relative paths by default.

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: options?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  // health
  health: () => request<{ status: string; model: string; customers: number; lastUpdated: number }>('/api/health'),
    // real ML predictions
  predictChurn: (data: Record<string, unknown>) =>
    request<{
      success: boolean;
      prediction: {
        churn_probability: number;
        churn_percentage: number;
        risk_level: string;
      };
      database: Record<string, unknown>;
    }>('/api/predictions/churn', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  predictSales: (data: Record<string, unknown>) =>
    request<{
      success: boolean;
      prediction: {
        predicted_sales: number;
        forecast_month: number;
      };
      database: Record<string, unknown>;
    }>('/api/predictions/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // overview
  overview: (filters: Record<string, string | undefined> = {}) =>
    request<import('../types').OverviewData>(`/api/overview${qs(filters as Record<string, string>)}`),

  retentionSimulator: (lift: number) =>
    request<import('../types').RetentionSim>(`/api/retention-simulator${qs({ lift })}`),

  // customers
  customers: (params: Record<string, string | number | undefined>) =>
    request<import('../types').CustomerListResponse>(`/api/customers${qs(params)}`),

  customerDetail: (id: string) =>
    request<import('../types').CustomerDetail>(`/api/customers/${encodeURIComponent(id)}`),

  exportCustomers: (params: Record<string, string | number | undefined>) =>
    `${API_BASE}/api/customers/export${qs(params)}`,

  // forecast
  forecast: (horizon: number, confidence: number) =>
    request<import('../types').ForecastData>(`/api/forecast${qs({ horizon, confidence })}`),

  // model health
  modelHealth: () => request<import('../types').ModelHealthData>('/api/model-health'),

  simulateDrift: () =>
    request<{ status: string; psi: import('../types').ModelHealthData['psi']; lastUpdated: number }>(
      '/api/model-health/simulate-drift',
      { method: 'POST' },
    ),

  // datasets
  datasets: () => request<import('../types').DatasetsData>('/api/datasets'),

  // upload (real multipart)
  uploadCsv: (file: File, type: 'customers' | 'sales') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    return request<{ jobId: string; status: string; type: string; fileName: string }>('/api/data/upload', {
      method: 'POST',
      body: fd,
    });
  },

  // jobs
  job: (jobId: string) => request<import('../types').Job>(`/api/jobs/${encodeURIComponent(jobId)}`),

  reprocess: (type: 'customers' | 'sales') =>
    request<{ jobId: string; status: string; type: string }>('/api/reprocess', {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),

  // assistant
  askAssistant: (question: string) =>
    request<import('../types').AssistantResponse>('/api/assistant', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  // reports
  generateReport: () => `${API_BASE}/api/reports`,
};

// Formatting helpers shared across pages
export const fmt = {
  money: (v: number, dp = 0) =>
    '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }),
  moneyCompact: (v: number) =>
    v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + Math.round(v || 0).toString(),
  pct: (v: number, dp = 1) => (v * 100).toFixed(dp) + '%',
  pctRaw: (v: number, dp = 1) => Number(v).toFixed(dp) + '%',
  num: (v: number) => Number(v || 0).toLocaleString('en-US'),
  timeAgo: (ts: number) => {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  },
};
