/**
 * NewsPulse AI — Typed API Client
 */

import {
  HealthResponse,
  OverviewResponse,
  ClassifyRequest,
  ClassifyResponse,
  PresetSample,
  ValidationSummaryResponse,
  BatchJobResponse,
  ArticlesListResponse,
  AnalyticsResponse,
  ModelLabResponse,
  InfrastructureResponse,
} from './types';

const BASE_URL = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errMsg = `Request failed: ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData && errData.detail) errMsg = errData.detail;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Health
  getHealth: () => fetchJson<HealthResponse>(`${BASE_URL}/health`),

  // Overview
  getOverview: () => fetchJson<OverviewResponse>(`${BASE_URL}/overview`),

  // Classify
  getClassifyPresets: () => fetchJson<PresetSample[]>(`${BASE_URL}/classify/presets`),
  classifyArticle: (data: ClassifyRequest) =>
    fetchJson<ClassifyResponse>(`${BASE_URL}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Batches
  validateBatchCsv: async (file: File): Promise<ValidationSummaryResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchJson<ValidationSummaryResponse>(`${BASE_URL}/batches/validate`, {
      method: 'POST',
      body: formData,
    });
  },
  submitBatchJob: async (file: File, deduplicate: boolean = true): Promise<BatchJobResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('deduplicate', deduplicate ? 'true' : 'false');
    return fetchJson<BatchJobResponse>(`${BASE_URL}/batches/submit`, {
      method: 'POST',
      body: formData,
    });
  },
  getBatchTemplateUrl: () => `${BASE_URL}/batches/template`,

  // Articles
  getArticles: (params: {
    search?: string;
    category?: string;
    status?: string;
    min_confidence?: number;
    max_confidence?: number;
    sort_by?: string;
    page?: number;
    page_size?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All Categories') query.append('category', params.category);
    if (params.status && params.status !== 'All Records') {
      query.append('status', params.status.includes('Decisive') ? 'decisive' : 'uncertain');
    }
    if (params.min_confidence !== undefined) query.append('min_confidence', params.min_confidence.toString());
    if (params.max_confidence !== undefined) query.append('max_confidence', params.max_confidence.toString());
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());

    return fetchJson<ArticlesListResponse>(`${BASE_URL}/articles?${query.toString()}`);
  },
  getExportUrl: (params: {
    search?: string;
    category?: string;
    status?: string;
    min_confidence?: number;
    max_confidence?: number;
    sort_by?: string;
  }) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All Categories') query.append('category', params.category);
    if (params.status && params.status !== 'All Records') {
      query.append('status', params.status.includes('Decisive') ? 'decisive' : 'uncertain');
    }
    if (params.min_confidence !== undefined) query.append('min_confidence', params.min_confidence.toString());
    if (params.max_confidence !== undefined) query.append('max_confidence', params.max_confidence.toString());
    if (params.sort_by) query.append('sort_by', params.sort_by);
    return `${BASE_URL}/articles/export?${query.toString()}`;
  },

  // Jobs
  getJobs: (status?: string, limit: number = 50) => {
    const query = new URLSearchParams();
    if (status && status !== 'All Jobs') query.append('status', status.toLowerCase());
    query.append('limit', limit.toString());
    return fetchJson<BatchJobResponse[]>(`${BASE_URL}/jobs?${query.toString()}`);
  },
  getJobDetails: (jobId: string) => fetchJson<BatchJobResponse>(`${BASE_URL}/jobs/${jobId}`),

  // Analytics
  getAnalytics: () => fetchJson<AnalyticsResponse>(`${BASE_URL}/analytics`),

  // Model Lab
  getModelDetails: () => fetchJson<ModelLabResponse>(`${BASE_URL}/model`),
  retrainModel: (data: { num_features: number; reg_param: number; max_iter: number }) =>
    fetchJson<ModelLabResponse>(`${BASE_URL}/model/retrain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Infrastructure
  getInfrastructure: () => fetchJson<InfrastructureResponse>(`${BASE_URL}/infrastructure`),
  pingS3: () =>
    fetchJson<Record<string, any>>(`${BASE_URL}/infrastructure/ping-s3`, {
      method: 'POST',
    }),
};
