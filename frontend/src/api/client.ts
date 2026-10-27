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
  CategoryMetadata,
  CandidateActionResponse,
  GalaxyResponse,
  SectionAssignmentRequest,
  ReorderRequest,
  StoryActionRequest,
  SelectStoryRequest,
  DailyNewsDeskResponse,
  RankedStory,
  EmergingCandidate,
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
    subcategory?: string;
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
    if (params.subcategory && params.subcategory !== 'All Subcategories') query.append('subcategory', params.subcategory);
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
    subcategory?: string;
    status?: string;
    min_confidence?: number;
    max_confidence?: number;
    sort_by?: string;
  }) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All Categories') query.append('category', params.category);
    if (params.subcategory && params.subcategory !== 'All Subcategories') query.append('subcategory', params.subcategory);
    if (params.status && params.status !== 'All Records') {
      query.append('status', params.status.includes('Decisive') ? 'decisive' : 'uncertain');
    }
    if (params.min_confidence !== undefined) query.append('min_confidence', params.min_confidence.toString());
    if (params.max_confidence !== undefined) query.append('max_confidence', params.max_confidence.toString());
    if (params.sort_by) query.append('sort_by', params.sort_by);
    return `${BASE_URL}/articles/export?${query.toString()}`;
  },

  // Categories & Taxonomy Registry
  getCategories: (status?: string, includeArchived: boolean = false) => {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (includeArchived) query.append('include_archived', 'true');
    return fetchJson<CategoryMetadata[]>(`${BASE_URL}/categories?${query.toString()}`);
  },
  getEmergingCandidates: () => fetchJson<EmergingCandidate[]>(`${BASE_URL}/categories/emerging`),
  promoteCategory: (categoryId: string) =>
    fetchJson<CandidateActionResponse>(`${BASE_URL}/categories/${categoryId}/promote`, {
      method: 'POST',
    }),
  rejectCategory: (categoryId: string) =>
    fetchJson<CandidateActionResponse>(`${BASE_URL}/categories/${categoryId}/reject`, {
      method: 'POST',
    }),

  // News Galaxy Spatial Visualization
  getGalaxyData: (params?: {
    search?: string;
    category?: string;
    subcategory?: string;
    status?: string;
    min_confidence?: number;
    max_confidence?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category && params.category !== 'All Categories') query.append('category', params.category);
    if (params?.subcategory && params.subcategory !== 'All Subcategories') query.append('subcategory', params.subcategory);
    if (params?.status && params.status !== 'All Records') {
      query.append('status', params.status.includes('Decisive') ? 'decisive' : 'uncertain');
    }
    if (params?.min_confidence !== undefined) query.append('min_confidence', params.min_confidence.toString());
    if (params?.max_confidence !== undefined) query.append('max_confidence', params.max_confidence.toString());
    return fetchJson<GalaxyResponse>(`${BASE_URL}/galaxy?${query.toString()}`);
  },

// Daily News Desk
  getDailyNewsDesk: (params?: {
    balance_categories?: boolean;
    w_coverage?: number;
    w_impact?: number;
    w_depth?: number;
    w_cohesion?: number;
    w_recency?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.balance_categories !== undefined) {
      query.append('balance_categories', params.balance_categories ? 'true' : 'false');
    }
    if (params?.w_coverage !== undefined) query.append('w_coverage', params.w_coverage.toString());
    if (params?.w_impact !== undefined) query.append('w_impact', params.w_impact.toString());
    if (params?.w_depth !== undefined) query.append('w_depth', params.w_depth.toString());
    if (params?.w_cohesion !== undefined) query.append('w_cohesion', params.w_cohesion.toString());
    if (params?.w_recency !== undefined) query.append('w_recency', params.w_recency.toString());
    return fetchJson<DailyNewsDeskResponse>(`${BASE_URL}/editorial/daily?${query.toString()}`);
  },

  listStoryGroups: (params?: { category?: string; search?: string; status?: string; min_score?: number }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All Categories') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.min_score) query.append('min_score', params.min_score.toString());
    return fetchJson<RankedStory[]>(`${BASE_URL}/editorial/stories?${query.toString()}`);
  },

  getStoryDetails: (storyId: string) => fetchJson<RankedStory>(`${BASE_URL}/editorial/stories/${storyId}`),

  selectStory: (req: SelectStoryRequest) =>
    fetchJson<{ status: string; selection: any }>(`${BASE_URL}/editorial/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }),

  deselectStory: (storyId: string) =>
    fetchJson<{ status: string; story_id: string; removed: boolean }>(`${BASE_URL}/editorial/deselect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId }),
    }),

  setLeadStory: (storyId: string) =>
    fetchJson<{ status: string; lead_story: any }>(`${BASE_URL}/editorial/set-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId }),
    }),

  saveStoryLater: (storyId: string, notes?: string) =>
    fetchJson<{ status: string; saved: any }>(`${BASE_URL}/editorial/save-later`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId, editor_notes: notes || '' }),
    }),

  dismissStory: (storyId: string) =>
    fetchJson<{ status: string; dismissed: any }>(`${BASE_URL}/editorial/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId }),
    }),

  restoreStory: (storyId: string) =>
    fetchJson<{ status: string; story_id: string; restored: boolean }>(`${BASE_URL}/editorial/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId }),
    }),

  reorderEditionStories: (orders: { story_id: string; edition_order: number }[]) =>
    fetchJson<{ status: string; reordered: boolean }>(`${BASE_URL}/editorial/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    }),

  assignStorySection: (storyId: string, section: string) =>
    fetchJson<{ status: string; updated: any }>(`${BASE_URL}/editorial/section`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId, publication_section: section }),
    }),

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
