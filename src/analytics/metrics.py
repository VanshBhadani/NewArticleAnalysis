"""
NewsPulse AI — Analytics & Metric Aggregation Engine
Calculates operational, quality, and statistical summaries from real datasets and job metadata.
"""

from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

from src.config import CATEGORY_MAP, CATEGORY_COLORS
from src.jobs.repository import job_repo


def get_dataset_overview_metrics(active_df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """
    Computes real summary metrics for the operational overview dashboard.
    Distinguishes dataset size, processed records, and cumulative jobs.
    """
    audit = job_repo.get_audit_summary()

    active_count = len(active_df) if active_df is not None else 0
    cat_dist = {}
    avg_conf = 0.0

    if active_df is not None and not active_df.empty:
        if "predicted_category" in active_df.columns:
            cat_dist = active_df["predicted_category"].value_counts().to_dict()
        if "confidence" in active_df.columns:
            avg_conf = round(float(active_df["confidence"].mean()), 4)

    return {
        "active_dataset_records": active_count,
        "total_jobs_submitted": audit["total_jobs"],
        "cumulative_processed_records": audit["total_processed_records"],
        "cumulative_rejected_records": audit["total_rejected_records"],
        "avg_processing_duration_sec": audit["avg_duration_sec"],
        "avg_throughput_art_per_sec": audit["avg_throughput_art_per_sec"],
        "average_confidence": avg_conf,
        "category_distribution": cat_dist
    }


def compute_confidence_buckets(df: pd.DataFrame, num_buckets: int = 10) -> Dict[str, Any]:
    """Generates distribution bins for prediction confidence scores."""
    if df.empty or "confidence" not in df.columns:
        return {"bins": [], "counts": []}

    scores = df["confidence"].dropna().values
    counts, edges = np.histogram(scores, bins=num_buckets, range=(0.0, 1.0))

    labels = [f"{round(edges[i]*100):02d}–{round(edges[i+1]*100):02d}%" for i in range(len(counts))]
    return {
        "labels": labels,
        "counts": counts.tolist()
    }
