"""
Unit Tests — Active Dataset Selection & Test Isolation
Verifies that temporary test-run files and corrupt artifacts cannot
unintentionally replace legitimate production or demonstration datasets.
"""

import pytest
import pandas as pd
from pathlib import Path

from src.data.dataset_service import DatasetService, REQUIRED_COLUMNS
from src.config import settings


def test_required_columns_validation():
    service = DatasetService()
    
    # Missing required columns
    bad_df = pd.DataFrame([{"title": "Test News", "category": "World"}])
    assert not service._is_valid_dataset(bad_df)

    # Empty df
    empty_df = pd.DataFrame()
    assert not service._is_valid_dataset(empty_df)

    # Valid df with required columns and >= 5 records
    valid_data = [
        {
            "article_id": f"art-{i}",
            "title": f"Headline {i}",
            "combined_text": f"Content {i}",
            "predicted_category": "World",
            "confidence": 0.85
        } for i in range(10)
    ]
    valid_df = pd.DataFrame(valid_data)
    assert service._is_valid_dataset(valid_df)


def test_test_run_file_isolation(tmp_path, monkeypatch):
    service = DatasetService()

    # Create dummy test run file matching the pattern "predictions_test_run_1.csv"
    test_run_file = tmp_path / "predictions_test_run_1.csv"
    test_run_file.write_text("article_id,title,predicted_category,confidence\nart-1,News 1,World,0.85\n")

    # Create legitimate production prediction file
    prod_file = tmp_path / "predictions_job-prod1234.csv"
    prod_data = [
        {
            "article_id": f"prod-{i}",
            "title": f"Diplomatic Summit #{i}",
            "combined_text": f"Delegates gather in Geneva for conference #{i}",
            "predicted_category": "World",
            "confidence": 0.82
        } for i in range(10)
    ]
    pd.DataFrame(prod_data).to_csv(prod_file, index=False)

    monkeypatch.setattr(settings, "processed_data_dir", tmp_path)

    active_df = service.get_active_dataframe()
    assert len(active_df) == 10
    # Must NOT have picked up predictions_test_run_1.csv
    assert "prod-0" in active_df["article_id"].values
    assert "art-1" not in active_df["article_id"].values


def test_explicit_dataset_pinning(tmp_path):
    service = DatasetService()

    pinned_file = tmp_path / "custom_pinned_predictions.csv"
    pinned_data = [
        {
            "article_id": f"pin-{i}",
            "title": f"Pinned Headline {i}",
            "combined_text": f"Pinned text content {i}",
            "predicted_category": "Business",
            "confidence": 0.91
        } for i in range(8)
    ]
    pd.DataFrame(pinned_data).to_csv(pinned_file, index=False)

    service.set_explicit_dataset(pinned_file)
    active_df = service.get_active_dataframe()
    assert len(active_df) == 8
    assert "pin-0" in active_df["article_id"].values

    service.clear_explicit_dataset()
