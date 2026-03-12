import { create } from 'zustand';

export interface ReportType {
  reportType: string;
  format: string;
}

export interface Report {
  id: string;
  type: string;
  format: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  s3Key: string | null;
}

interface ReportsState {
  reportTypes: ReportType[];
  reports: Report[];
  isLoading: boolean;
  error: string | null;
  sseConnected: boolean;

  fetchTypes: () => Promise<void>;
  startGeneration: (type: string, format: string) => Promise<void>;
  subscribeToAllUpdates: () => void;
  fetchReports: () => Promise<void>;
  updateReportStatus: (reportId: string, status: string, s3Key?: string) => void;
  upsertReports: (reports: Report[]) => void;
}

const API_BASE = '/api';

export const useReportsStore = create<ReportsState>((set, get) => ({
  reportTypes: [],
  reports: [],
  isLoading: false,
  error: null,
  sseConnected: false,

  fetchTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/reports/types`);
      const data = await res.json();
      set({ reportTypes: data, isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to fetch types',
        isLoading: false,
      });
    }
  },

  startGeneration: async (type: string, format: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, format }),
      });
      await res.json();
      set({ isLoading: false });
      get().fetchReports();
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to start generation',
        isLoading: false,
      });
    }
  },

  subscribeToAllUpdates: () => {
    if (get().sseConnected) return;
    set({ sseConnected: true });

    const es = new EventSource(`${API_BASE}/reports/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.reports) {
        get().upsertReports(data.reports);
      } else if (data.reportId) {
        get().updateReportStatus(data.reportId, data.status, data.s3Key);
      }
    };
    es.onerror = () => {
      es.close();
      set({ sseConnected: false });
    };
  },

  fetchReports: async () => {
    try {
      const res = await fetch(`${API_BASE}/reports`);
      const data = await res.json();
      set({ reports: Array.isArray(data) ? data : [] });
    } catch {
      // ignore
    }
  },

  updateReportStatus: (reportId: string, status: string, s3Key?: string) => {
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? { ...r, status, s3Key: s3Key ?? r.s3Key, completedAt: status === 'completed' || status === 'failed' ? new Date().toISOString() : r.completedAt }
          : r,
      ),
    }));
  },

  upsertReports: (reports: Report[]) => {
    set((s) => {
      const byId = new Map(s.reports.map((r) => [r.id, r]));
      for (const r of reports) {
        byId.set(r.id, {
          id: r.id,
          type: r.type,
          format: r.format,
          status: r.status,
          createdAt: typeof r.createdAt === 'string' ? r.createdAt : (r.createdAt as Date).toISOString(),
          completedAt: r.completedAt ? (typeof r.completedAt === 'string' ? r.completedAt : (r.completedAt as Date).toISOString()) : null,
          s3Key: r.s3Key ?? null,
        });
      }
      return {
        reports: Array.from(byId.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      };
    });
  },
}));
