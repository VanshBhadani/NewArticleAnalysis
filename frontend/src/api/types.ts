/**
 * NewsPulse AI — API TypeScript Types
 */

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  execution_mode: string;
  spark_version: string;
  storage_mode: string;
}

export interface ClassifyRequest {
  title: string;
  body?: string;
}

export interface ClassifyResponse {
  title: string;
  combined_text: string;
  predicted_category: string;
  predicted_id: number;
  confidence: number;
  is_uncertain: boolean;
  class_scores: Record<string, number>;
  latency_ms: number;
  model_version: string;
  explanation: string;
}

export interface PresetSample {
  label: string;
  desk: string;
  title: string;
  body: string;
}

export interface ValidationSummaryResponse {
  total_records: number;
  accepted_records: number;
  rejected_records: number;
  duplicate_records: number;
  detected_columns: string[];
  column_mapping: Record<string, string>;
  rejection_reasons: Record<string, number>;
  preview_records: Array<Record<string, any>>;
}

export interface BatchJobResponse {
  job_id: string;
  submission_time: string;
  start_time?: string;
  completion_time?: string;
  execution_mode: string;
  dataset_name: string;
  input_records: number;
  processed_records: number;
  failed_records: number;
  model_version: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  duration_seconds: number;
  throughput: number;
  output_location: string;
  storage_backend: string;
  error_summary?: string;
}

export interface ArticleItem {
  article_id: string;
  title: string;
  description?: string;
  combined_text: string;
  predicted_category: string;
  predicted_id: number;
  confidence: number;
  is_uncertain: boolean;
  subcategory?: string;
  prob_world?: number;
  prob_sports?: number;
  prob_business?: number;
  prob_scitech?: number;
}

export interface ArticlesListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: ArticleItem[];
}

export interface OverviewResponse {
  active_dataset_records: number;
  total_jobs_submitted: number;
  cumulative_processed_records: number;
  cumulative_rejected_records: number;
  avg_processing_duration_sec: number;
  avg_throughput_art_per_sec: number;
  average_confidence: number;
  category_distribution: Record<string, number>;
  recent_jobs: BatchJobResponse[];
  benchmark_snapshot?: {
    accuracy: number;
    f1_score: number;
    weighted_precision: number;
    weighted_recall: number;
    algorithm: string;
    model_version: string;
  };
}

export interface AnalyticsResponse {
  total_active_records: number;
  category_distribution: Record<string, number>;
  confidence_distribution: {
    labels: string[];
    counts: number[];
  };
  throughput_history: Array<{
    job_id: string;
    duration_seconds: number;
    throughput: number;
    processed_records: number;
    submission_time: string;
  }>;
  model_benchmark_metrics?: {
    accuracy: number;
    weighted_precision: number;
    weighted_recall: number;
    f1_score: number;
    confusion_matrix?: {
      labels: string[];
      matrix: number[][];
    };
    per_class?: Record<string, {
      class_id: number;
      precision: number;
      recall: number;
      f1: number;
    }>;
  };
}

export interface ModelLabResponse {
  model_version: string;
  algorithm: string;
  feature_extractor: string;
  training_timestamp?: string;
  train_record_count?: number;
  test_record_count?: number;
  hyperparameters?: Record<string, any>;
  metrics?: Record<string, any>;
  pipeline_stages: Array<{
    stage: string;
    type: string;
    parameters: string;
  }>;
  limitations: string[];
}

export interface InfrastructureResponse {
  execution_mode: string;
  spark_diagnostics: Record<string, any>;
  storage_diagnostics: Record<string, any>;
  sanitized_config: Record<string, string>;
  python_version: string;
  system_platform: string;
}

export interface CategoryMetadata {
  id: string;
  name: string;
  parent_id?: string | null;
  status: 'active' | 'candidate' | 'archived';
  color: string;
  description: string;
  created_at: string;
  taxonomy_version: string;
  article_count: number;
  cohesion_score?: number | null;
  keywords: string[];
}

export interface CandidateActionResponse {
  success: boolean;
  message: string;
  category: CategoryMetadata;
}

export interface GalaxyNode {
  article_id: string;
  title: string;
  description: string;
  combined_text: string;
  predicted_category: string;
  subcategory: string;
  confidence: number;
  is_uncertain: boolean;
  requires_review: boolean;
  x: number;
  y: number;
  cluster_id: string;
  top_keywords: string[];
  source?: string;
  published_date?: string;
}

export interface GalaxyEdge {
  source: string;
  target: string;
  similarity: number;
}

export interface GalaxyCluster {
  cluster_id: string;
  parent_category: string;
  name: string;
  keywords: string[];
  size: number;
  cohesion: number;
  centroid_x: number;
  centroid_y: number;
  color: string;
}

export interface EmergingCandidate {
  id: string;
  name: string;
  size: number;
  cohesion: number;
  keywords: string[];
  color: string;
  status: string;
  sample_titles: string[];
}

export interface GalaxyResponse {
  nodes: GalaxyNode[];
  edges: GalaxyEdge[];
  clusters: GalaxyCluster[];
  emerging_candidates: EmergingCandidate[];
  total_nodes: number;
  total_clusters: number;
}


// ==========================================
// Daily News Desk & Editorial Types
// ==========================================

export interface EditorialArticleRef {
  article_id: string;
  title: string;
  description: string;
  combined_text: string;
  predicted_category: string;
  confidence: number;
  is_uncertain: boolean;
  source: string;
  published_date: string;
}

export interface EditorialScoreBreakdown {
  total_score: number;
  coverage_breadth_score: number;
  public_impact_score: number;
  lexical_depth_score: number;
  cluster_cohesion_score: number;
  recency_score: number;
  matched_impact_keywords: string[];
  distinct_sources_count: number;
  related_articles_count: number;
  explanation: string;
  weights_applied: Record<string, number>;
}

export interface RankedStory {
  story_id: string;
  headline: string;
  lead_article_id: string;
  main_category: string;
  subcategory: string;
  excerpt: string;
  published_date: string;
  source: string;
  distinct_sources_count: number;
  related_articles_count: number;
  editorial_score: number;
  classification_confidence: number;
  score_breakdown: EditorialScoreBreakdown;
  score_explanation: string;
  is_uncertain: boolean;
  status: 'recommended' | 'selected' | 'saved' | 'dismissed';
  is_lead: boolean;
  edition_order: number;
  publication_section: string;
  editor_notes: string;
  articles: EditorialArticleRef[];
  article_ids: string[];
  distinct_sources: string[];
}

export interface CategoryHighlightGroup {
  category_id: string;
  category_name: string;
  color: string;
  description: string;
  total_stories: number;
  stories: RankedStory[];
}

export interface DailyNewsDeskResponse {
  date: string;
  edition_title: string;
  stats: {
    total_stories_clustered: number;
    total_articles_ingested: number;
    total_selected: number;
    total_saved: number;
    total_dismissed: number;
    active_categories_count: number;
  };
  lead_story: RankedStory | null;
  top_stories: RankedStory[];
  category_highlights: CategoryHighlightGroup[];
  selected_edition: RankedStory[];
  saved_stories: RankedStory[];
  dismissed_stories: RankedStory[];
  ranking_weights: Record<string, number>;
}

export interface SelectStoryRequest {
  story_id: string;
  is_lead?: boolean;
  edition_order?: number;
  publication_section?: string;
  editor_notes?: string;
}

export interface StoryActionRequest {
  story_id: string;
  editor_notes?: string;
}

export interface ReorderRequest {
  orders: { story_id: string; edition_order: number }[];
}

export interface SectionAssignmentRequest {
  story_id: string;
  publication_section: string;
}
