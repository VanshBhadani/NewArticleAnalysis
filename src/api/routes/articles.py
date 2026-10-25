"""
Article Explorer API Routes
Provides search, multi-parameter filtering, pagination, and CSV export.
"""

import math
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response
import pandas as pd

from src.config import settings, CATEGORY_MAP
from src.api.schemas import ArticlesListResponse, ArticleItem
from src.data.ingestion import create_sample_batch_csv
from src.data.validation import validate_and_preprocess_dataframe
from src.jobs.manager import job_manager

router = APIRouter(prefix="/articles", tags=["Articles"])


def _get_active_dataframe() -> pd.DataFrame:
    """Retrieves the latest predictions DataFrame or runs the bootstrap batch."""
    processed_files = list(settings.processed_data_dir.glob("predictions_*.csv"))
    if processed_files:
        latest_file = max(processed_files, key=lambda f: f.stat().st_mtime)
        try:
            return pd.read_csv(latest_file)
        except Exception:
            pass

    # If no file exists, auto-process the sample batch
    sample_path = settings.data_dir / "sample_news_batch.csv"
    if not sample_path.exists():
        create_sample_batch_csv(sample_path)
    
    sample_raw = pd.read_csv(sample_path)
    acc, rej, _ = validate_and_preprocess_dataframe(sample_raw)
    _, enriched = job_manager.submit_batch_job(acc, "sample_news_batch.csv")
    return enriched


def _filter_dataframe(
    df: pd.DataFrame,
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    min_confidence: float = 0.0,
    max_confidence: float = 1.0,
    sort_by: Optional[str] = "confidence_desc"
) -> pd.DataFrame:
    """Applies search, category, confidence, and sorting filters."""
    filtered = df.copy()

    if search:
        q = search.strip().lower()
        mask = (
            filtered["title"].fillna("").str.lower().str.contains(q) |
            filtered["combined_text"].fillna("").str.lower().str.contains(q)
        )
        filtered = filtered[mask]

    if category and category.lower() != "all" and category != "All Categories":
        filtered = filtered[filtered["predicted_category"].str.lower() == category.lower()]

    if status:
        if status.lower() == "decisive":
            filtered = filtered[filtered["confidence"] >= 0.45]
        elif status.lower() == "uncertain":
            filtered = filtered[filtered["confidence"] < 0.45]

    filtered = filtered[(filtered["confidence"] >= min_confidence) & (filtered["confidence"] <= max_confidence)]

    if sort_by == "confidence_desc":
        filtered = filtered.sort_values(by="confidence", ascending=False)
    elif sort_by == "confidence_asc":
        filtered = filtered.sort_values(by="confidence", ascending=True)
    elif sort_by == "title_asc":
        filtered = filtered.sort_values(by="title", ascending=True)

    return filtered


@router.get("", response_model=ArticlesListResponse)
def list_articles(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    max_confidence: float = Query(1.0, ge=0.0, le=1.0),
    sort_by: str = Query("confidence_desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    """Returns paginated, filtered article records from the active batch."""
    df = _get_active_dataframe()
    filtered = _filter_dataframe(
        df=df,
        search=search,
        category=category,
        status=status,
        min_confidence=min_confidence,
        max_confidence=max_confidence,
        sort_by=sort_by
    )

    total = len(filtered)
    total_pages = max(1, math.ceil(total / page_size))
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    slice_df = filtered.iloc[start_idx:end_idx].fillna("")

    items = []
    for _, r in slice_df.iterrows():
        items.append(ArticleItem(
            article_id=str(r.get("article_id", "")),
            title=str(r.get("title", "")),
            description=str(r.get("description", "")),
            combined_text=str(r.get("combined_text", "")),
            predicted_category=str(r.get("predicted_category", "")),
            predicted_id=int(r.get("predicted_id", 0)),
            confidence=float(r.get("confidence", 0.0)),
            is_uncertain=bool(r.get("is_uncertain", False)),
            prob_world=float(r.get("prob_world", 0.0)),
            prob_sports=float(r.get("prob_sports", 0.0)),
            prob_business=float(r.get("prob_business", 0.0)),
            prob_scitech=float(r.get("prob_scitech", 0.0))
        ))

    return ArticlesListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )


@router.get("/export")
def export_filtered_csv(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    min_confidence: float = Query(0.0),
    max_confidence: float = Query(1.0),
    sort_by: str = Query("confidence_desc")
):
    """Exports filtered article records as a downloadable CSV."""
    df = _get_active_dataframe()
    filtered = _filter_dataframe(
        df=df,
        search=search,
        category=category,
        status=status,
        min_confidence=min_confidence,
        max_confidence=max_confidence,
        sort_by=sort_by
    )

    csv_data = filtered.to_csv(index=False)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=newspulse_filtered_articles.csv"}
    )
