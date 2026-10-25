"""
Unit Tests — Storage Adapter and S3 Connectivity Fallback
"""

from pathlib import Path
import pandas as pd
import pytest
from src.storage.s3 import S3StorageAdapter


def test_storage_adapter_connectivity_unconfigured(monkeypatch):
    # Ensure unconfigured environment
    adapter = S3StorageAdapter()
    adapter.is_configured = False

    diag = adapter.test_connectivity()
    assert diag["status"] == "UNCONFIGURED"
    assert diag["is_cloud_active"] is False
    assert "local development mode" in diag["message"].lower()


def test_save_predictions_local(tmp_path, monkeypatch):
    adapter = S3StorageAdapter()
    adapter.is_configured = False

    df = pd.DataFrame([
        {"article_id": "art-1", "title": "News 1", "predicted_category": "World", "confidence": 0.85}
    ])

    meta = adapter.save_predictions_csv(df, job_id="test_run_1")
    assert "Local Storage" in meta["storage_backend"]
    assert Path(meta["local_path"]).exists()
    assert meta["bytes"] > 0
