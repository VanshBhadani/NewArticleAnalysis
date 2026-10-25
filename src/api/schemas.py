"""
NewsPulse AI — API Pydantic Schemas
Defines strictly typed request and response contracts for all REST endpoints.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


# Health & System
class HealthResponse(BaseModel):
    status: str = "healthy"
    app_name: str
    version: str
    environment: str
    execution_mode: str
    spark_version: str
    storage_mode: str


# Single Article Classification
class ClassifyRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=1000)
    body: Optional[str] = Field("", max_length=50000)


class ClassifyResponse(BaseModel):
    title: str
    combined_text: str
    predicted_category: str
    predicted_id: int
    confidence: float
    is_uncertain: bool
    class_scores: Dict[str, float]
    latency_ms: float
    model_version: str
    explanation: str


# Validation & Batch Submission
class ValidationSummaryResponse(BaseModel):
    total_records: int
    accepted_records: int
    rejected_records: int
    duplicate_records: int
    detected_columns: List[str]
    column_mapping: Dict[str, str]
    rejection_reasons: Dict[str, int]
    preview_records: List[Dict[str, Any]] = []


class BatchJobResponse(BaseModel):
    job_id: str
    submission_time: str
    start_time: Optional[str] = None
    completion_time: Optional[str] = None
    execution_mode: str
    dataset_name: str
    input_records: int
    processed_records: int
    failed_records: int
    model_version: str
    status: str
    duration_seconds: float
    throughput: float
    output_location: str
    storage_backend: str
    error_summary: Optional[str] = None


# Article Library
class ArticleItem(BaseModel):
    article_id: str
    title: str
    description: Optional[str] = ""
    combined_text: str
    predicted_category: str
    predicted_id: int
    confidence: float
    is_uncertain: bool
    prob_world: Optional[float] = 0.0
    prob_sports: Optional[float] = 0.0
    prob_business: Optional[float] = 0.0
    prob_scitech: Optional[float] = 0.0


class ArticlesListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[ArticleItem]


# Overview
class OverviewResponse(BaseModel):
    active_dataset_records: int
    total_jobs_submitted: int
    cumulative_processed_records: int
    cumulative_rejected_records: int
    avg_processing_duration_sec: float
    avg_throughput_art_per_sec: float
    average_confidence: float
    category_distribution: Dict[str, int]
    recent_jobs: List[BatchJobResponse]
    benchmark_snapshot: Optional[Dict[str, Any]] = None


# Analytics
class ConfidenceBins(BaseModel):
    labels: List[str]
    counts: List[int]


class AnalyticsResponse(BaseModel):
    total_active_records: int
    category_distribution: Dict[str, int]
    confidence_distribution: ConfidenceBins
    throughput_history: List[Dict[str, Any]]
    model_benchmark_metrics: Optional[Dict[str, Any]] = None


# Model Lab
class PipelineStageSpec(BaseModel):
    stage: str
    type: str
    parameters: str


class ModelLabResponse(BaseModel):
    model_version: str
    algorithm: str
    feature_extractor: str
    training_timestamp: Optional[str] = None
    train_record_count: Optional[int] = None
    test_record_count: Optional[int] = None
    hyperparameters: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    pipeline_stages: List[PipelineStageSpec]
    limitations: List[str]


class RetrainRequest(BaseModel):
    num_features: int = Field(4000, ge=1000, le=20000)
    reg_param: float = Field(0.08, ge=0.001, le=1.0)
    max_iter: int = Field(30, ge=5, le=100)


# Infrastructure
class InfrastructureResponse(BaseModel):
    execution_mode: str
    spark_diagnostics: Dict[str, Any]
    storage_diagnostics: Dict[str, Any]
    sanitized_config: Dict[str, str]
    python_version: str
    system_platform: str
