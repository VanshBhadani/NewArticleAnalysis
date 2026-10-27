"""
Overview Dashboard API Route
"""

from fastapi import APIRouter
from src.config import settings, CATEGORY_MAP
from src.jobs.repository import job_repo
from src.spark.inference import get_model_metadata
from src.api.schemas import OverviewResponse, BatchJobResponse
from src.api.routes.articles import _get_active_dataframe

router = APIRouter(prefix="/overview", tags=["Overview"])


@router.get("", response_model=OverviewResponse)
def get_overview():
    """Returns aggregated operational metrics, category distribution, and job history."""
    audit = job_repo.get_audit_summary()
    jobs = job_repo.list_jobs(limit=5)
    model_meta = get_model_metadata()

    from src.taxonomy.registry import category_registry
    active_df = _get_active_dataframe()
    active_count = len(active_df) if active_df is not None else 0

    # Dynamic registry-driven distribution
    cat_dist = {c.name: 0 for c in category_registry.list_categories(status="active")}
    avg_conf = 0.0

    if active_df is not None and not active_df.empty:
        if "predicted_category" in active_df.columns:
            for cat, count in active_df["predicted_category"].value_counts().items():
                cat_dist[str(cat)] = int(count)
        if "confidence" in active_df.columns:
            avg_conf = round(float(active_df["confidence"].mean()), 4)

    recent_jobs_resp = [
        BatchJobResponse(
            job_id=j.job_id,
            submission_time=j.submission_time,
            start_time=j.start_time,
            completion_time=j.completion_time,
            execution_mode=j.execution_mode,
            dataset_name=j.dataset_name,
            input_records=j.input_records,
            processed_records=j.processed_records,
            failed_records=j.failed_records,
            model_version=j.model_version,
            status=j.status,
            duration_seconds=j.duration_seconds,
            throughput=j.throughput,
            output_location=j.output_location,
            storage_backend=j.storage_backend,
            error_summary=j.error_summary
        ) for j in jobs
    ]

    benchmark_summary = None
    if model_meta and "metrics" in model_meta:
        m = model_meta["metrics"]
        benchmark_summary = {
            "accuracy": m.get("accuracy", 0.0),
            "f1_score": m.get("f1_score", 0.0),
            "weighted_precision": m.get("weighted_precision", 0.0),
            "weighted_recall": m.get("weighted_recall", 0.0),
            "algorithm": model_meta.get("algorithm", "Multinomial Logistic Regression"),
            "model_version": model_meta.get("model_version", settings.active_model_version)
        }

    return OverviewResponse(
        active_dataset_records=active_count,
        total_jobs_submitted=audit["total_jobs"],
        cumulative_processed_records=audit["total_processed_records"],
        cumulative_rejected_records=audit["total_rejected_records"],
        avg_processing_duration_sec=audit["avg_duration_sec"],
        avg_throughput_art_per_sec=audit["avg_throughput_art_per_sec"],
        average_confidence=avg_conf,
        category_distribution=cat_dist,
        recent_jobs=recent_jobs_resp,
        benchmark_snapshot=benchmark_summary
    )
