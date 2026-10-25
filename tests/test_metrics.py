"""
Unit Tests — Analytics Metrics & Distribution Buckets
"""

import pandas as pd
import pytest
from src.analytics.metrics import compute_confidence_buckets, get_dataset_overview_metrics


def test_compute_confidence_buckets():
    df = pd.DataFrame({
        "confidence": [0.12, 0.45, 0.78, 0.82, 0.95, 0.60]
    })
    res = compute_confidence_buckets(df, num_buckets=5)
    assert len(res["labels"]) == 5
    assert len(res["counts"]) == 5
    assert sum(res["counts"]) == 6


def test_dataset_overview_metrics_empty():
    res = get_dataset_overview_metrics(None)
    assert res["active_dataset_records"] == 0
    assert "total_jobs_submitted" in res
