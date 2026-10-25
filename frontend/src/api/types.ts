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
