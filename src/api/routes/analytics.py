"""
Analytics & Model Evaluation API Routes
"""

from fastapi import APIRouter
from src.config import CATEGORY_MAP
from src.jobs.repository import job_repo
from src.spark.inference import get_model_metadata
from src.analytics.metrics import compute_confidence_buckets
from src.api.schemas import AnalyticsResponse, ConfidenceBins
from src.api.routes.articles import _get_active_dataframe

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsResponse)
def get_analytics():
    """Returns analytics across active batch predictions and model evaluation benchmarks."""
    active_df = _get_active_dataframe()
    recent_jobs = job_repo.list_jobs(limit=15)
    model_meta = get_model_metadata()

    cat_dist = {c: 0 for c in CATEGORY_MAP.values()}
    total_active = len(active_df) if active_df is not None else 0

    if active_df is not None and not active_df.empty and "predicted_category" in active_df.columns:
        for cat, count in active_df["predicted_category"].value_counts().items():
            cat_dist[cat] = int(count)

    conf_bins_raw = compute_confidence_buckets(active_df) if active_df is not None else {"labels": [], "counts": []}
    conf_bins = ConfidenceBins(
        labels=conf_bins_raw.get("labels", []),
        counts=conf_bins_raw.get("counts", [])
    )

    throughput_hist = [
        {
            "job_id": j.job_id,
            "duration_seconds": j.duration_seconds,
            "throughput": j.throughput,
            "processed_records": j.processed_records,
            "submission_time": j.submission_time
        } for j in reversed(recent_jobs)
    ]

    benchmark_metrics = model_meta.get("metrics") if model_meta else None

    return AnalyticsResponse(
        total_active_records=total_active,
        category_distribution=cat_dist,
        confidence_distribution=conf_bins,
        throughput_history=throughput_hist,
        model_benchmark_metrics=benchmark_metrics
    )
