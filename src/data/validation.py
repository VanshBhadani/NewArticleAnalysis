"""
NewsPulse AI — Data Validation and Schema Verification
Validates tabular news datasets, standardizes column mapping, cleans text, and filters malformed records.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import html
import re
import uuid
import pandas as pd


@dataclass
class ValidationSummary:
    total_records: int = 0
    accepted_records: int = 0
    rejected_records: int = 0
    duplicate_records: int = 0
    missing_content_records: int = 0
    detected_columns: List[str] = field(default_factory=list)
    column_mapping: Dict[str, str] = field(default_factory=dict)
    rejection_reasons: Dict[str, int] = field(default_factory=dict)


def clean_text_field(val: str) -> str:
    """Normalizes whitespace, unescapes HTML entities, and strips non-printable chars."""
    if not isinstance(val, str):
        return ""
    # Unescape HTML entities (e.g. &amp;, &quot;, &#39;)
    text = html.unescape(val)
    # Replace backslash escapes and redundant whitespace
    text = re.sub(r'\\n|\\r|\\t', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def auto_detect_columns(columns: List[str]) -> Dict[str, str]:
    """
    Intelligently maps uploaded CSV column names to standardized canonical fields:
    - title: headline, title, article_title, news_title
    - description: description, summary, abstract, desc
    - text: text, body, content, article, news_text, full_text
    - label: label, category, class, topic, target
    """
    mapping = {}
    lower_cols = {c.lower().strip(): c for c in columns}

    # Map Title
    for candidate in ["title", "headline", "article_title", "news_title", "header"]:
        if candidate in lower_cols:
            mapping["title"] = lower_cols[candidate]
            break

    # Map Description
    for candidate in ["description", "summary", "abstract", "desc"]:
        if candidate in lower_cols:
            mapping["description"] = lower_cols[candidate]
            break

    # Map Text / Content
    for candidate in ["text", "content", "body", "body_text", "article", "news_text", "full_text", "bodytext"]:
        if candidate in lower_cols:
            mapping["text"] = lower_cols[candidate]
            break
    if "text" not in mapping:
        for c_lower, c_orig in lower_cols.items():
            if "body" in c_lower or "text" in c_lower or "content" in c_lower:
                mapping["text"] = c_orig
                break

    # Map Label / Category (optional for unlabeled prediction batches)
    for candidate in ["label", "category", "class", "topic", "target"]:
        if candidate in lower_cols:
            mapping["label"] = lower_cols[candidate]
            break

    return mapping


def validate_and_preprocess_dataframe(
    df: pd.DataFrame,
    column_mapping: Optional[Dict[str, str]] = None,
    min_text_length: int = 10,
    deduplicate: bool = True
) -> Tuple[pd.DataFrame, pd.DataFrame, ValidationSummary]:
    """
    Validates and standardizes a pandas DataFrame of news articles.
    
    Returns:
        (accepted_df, rejected_df, summary)
    """
    summary = ValidationSummary(
        total_records=len(df),
        detected_columns=list(df.columns)
    )

    if column_mapping is None or not column_mapping:
        column_mapping = auto_detect_columns(list(df.columns))

    summary.column_mapping = column_mapping

    if df.empty:
        empty_acc = pd.DataFrame(columns=["article_id", "title", "description", "combined_text", "label"])
        empty_rej = pd.DataFrame(columns=["raw_index", "rejection_reason"])
        return empty_acc, empty_rej, summary

    # Prepare standard columns
    title_col = column_mapping.get("title")
    desc_col = column_mapping.get("description")
    text_col = column_mapping.get("text")
    label_col = column_mapping.get("label")

    # If neither title, description nor text is mapped, reject all
    if not (title_col or desc_col or text_col):
        summary.rejected_records = len(df)
        summary.rejection_reasons["No recognizable title or content columns found"] = len(df)
        rejected_df = df.copy()
        rejected_df["rejection_reason"] = "Missing recognizable title/content columns"
        accepted_df = pd.DataFrame(columns=["article_id", "title", "description", "combined_text", "label"])
        return accepted_df, rejected_df, summary

    accepted_rows = []
    rejected_rows = []
    seen_hashes = set()

    for idx, row in df.iterrows():
        title = clean_text_field(str(row[title_col])) if title_col and pd.notna(row[title_col]) else ""
        desc = clean_text_field(str(row[desc_col])) if desc_col and pd.notna(row[desc_col]) else ""
        body = clean_text_field(str(row[text_col])) if text_col and pd.notna(row[text_col]) else ""
        
        # Ground truth label if present
        raw_label = None
        if label_col and pd.notna(row[label_col]):
            raw_label = row[label_col]

        # Combine text for classification (Title + Description + Body)
        text_parts = [p for p in [title, desc, body] if p]
        combined_text = " - ".join(text_parts) if len(text_parts) > 1 else (text_parts[0] if text_parts else "")

        # Validation check: minimum content length
        if len(combined_text.strip()) < min_text_length:
            summary.missing_content_records += 1
            summary.rejection_reasons["Insufficient text content (< 10 chars)"] = (
                summary.rejection_reasons.get("Insufficient text content (< 10 chars)", 0) + 1
            )
            rej_dict = row.to_dict()
            rej_dict["rejection_reason"] = "Insufficient text content (< 10 chars)"
            rejected_rows.append(rej_dict)
            continue

        # Duplicate detection check
        content_hash = f"{title.lower()[:80]}|{combined_text.lower()[:150]}"
        if deduplicate and content_hash in seen_hashes:
            summary.duplicate_records += 1
            summary.rejection_reasons["Duplicate content detected"] = (
                summary.rejection_reasons.get("Duplicate content detected", 0) + 1
            )
            rej_dict = row.to_dict()
            rej_dict["rejection_reason"] = "Duplicate article"
            rejected_rows.append(rej_dict)
            continue

        seen_hashes.add(content_hash)

        # Stable unique identifier
        article_id = str(uuid.uuid4())[:8]

        accepted_rows.append({
            "article_id": article_id,
            "title": title if title else combined_text[:60] + "...",
            "description": desc,
            "combined_text": combined_text,
            "ground_truth_label": raw_label
        })

    accepted_df = pd.DataFrame(accepted_rows)
    rejected_df = pd.DataFrame(rejected_rows)

    summary.accepted_records = len(accepted_df)
    summary.rejected_records = len(rejected_df)

    return accepted_df, rejected_df, summary
