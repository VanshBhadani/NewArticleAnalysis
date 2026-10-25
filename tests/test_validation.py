"""
Unit Tests — Data Validation and Schema Verification
"""

import pandas as pd
import pytest
from src.data.validation import (
    validate_and_preprocess_dataframe,
    clean_text_field,
    auto_detect_columns
)


def test_clean_text_field():
    raw = "Breaking &amp; Urgent: Markets Rally!   \\n\\t Next Details."
    cleaned = clean_text_field(raw)
    assert "&amp;" not in cleaned
    assert "&" in cleaned
    assert "\\n" not in cleaned
    assert "   " not in cleaned


def test_auto_detect_columns():
    cols = ["Headline", "Summary", "Body_Text", "Topic"]
    mapping = auto_detect_columns(cols)
    assert mapping["title"] == "Headline"
    assert mapping["description"] == "Summary"
    assert mapping["text"] == "Body_Text"
    assert mapping["label"] == "Topic"


def test_validation_valid_and_malformed():
    data = [
        {"title": "Valid Article Title About World Affairs", "body": "This is a detailed valid body text exceeding the minimum threshold.", "label": "World"},
        {"title": "No", "body": "X", "label": "Sports"},  # Insufficient text (< 10 chars)
        {"title": "", "body": None, "label": "Business"},      # Empty record
        {"title": "Duplicate Dispatch Title", "body": "Identical article content repeated.", "label": "Sci/Tech"},
        {"title": "Duplicate Dispatch Title", "body": "Identical article content repeated.", "label": "Sci/Tech"}
    ]
    raw_df = pd.DataFrame(data)
    acc_df, rej_df, summary = validate_and_preprocess_dataframe(raw_df, deduplicate=True)

    assert summary.total_records == 5
    assert summary.accepted_records == 2  # 1 valid, 1 unique of duplicates
    assert summary.rejected_records == 3  # 1 short, 1 empty, 1 duplicate
    assert summary.duplicate_records == 1
    assert "article_id" in acc_df.columns
    assert "combined_text" in acc_df.columns
