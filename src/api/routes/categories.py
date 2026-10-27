"""
NewsPulse AI — Category Taxonomy REST Endpoints
Provides authoritative category and candidate lifecycle operations.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from src.taxonomy.registry import category_registry, CategoryMetadata
from src.data.dataset_service import dataset_service
from src.taxonomy.topic_discovery import topic_discovery

router = APIRouter(prefix="/categories", tags=["Categories"])


class CategoryResponse(BaseModel):
    id: str
    name: str
    parent_id: Optional[str] = None
    status: str
    color: str
    description: str
    created_at: str
    taxonomy_version: str
    article_count: int
    cohesion_score: Optional[float] = None
    keywords: List[str] = []


class CandidateActionResponse(BaseModel):
    success: bool
    message: str
    category: CategoryResponse


@router.get("", response_model=List[CategoryResponse])
def get_categories(
    status: Optional[str] = Query(None, description="Filter by status: active, candidate, archived"),
    include_archived: bool = Query(False)
):
    """Returns the single authoritative category registry list."""
    cats = category_registry.list_categories(status=status, include_archived=include_archived)
    return [
        CategoryResponse(
            id=c.id,
            name=c.name,
            parent_id=c.parent_id,
            status=c.status,
            color=c.color,
            description=c.description,
            created_at=c.created_at,
            taxonomy_version=c.taxonomy_version,
            article_count=c.article_count,
            cohesion_score=c.cohesion_score,
            keywords=c.keywords
        ) for c in cats
    ]


@router.get("/emerging", response_model=List[Dict[str, Any]])
def get_emerging_candidates():
    """Runs deterministic topic discovery across active dataset to detect candidate emerging topics."""
    df = dataset_service.get_active_dataframe()
    galaxy_data = topic_discovery.analyze_corpus(df)
    return galaxy_data.emerging_candidates


@router.post("/{category_id}/promote", response_model=CandidateActionResponse)
def promote_category(category_id: str):
    """Promotes a candidate topic to an approved active category in the registry."""
    try:
        cat = category_registry.promote_candidate(category_id)
        return CandidateActionResponse(
            success=True,
            message=f"Category '{cat.name}' successfully promoted to active taxonomy.",
            category=CategoryResponse(
                id=cat.id,
                name=cat.name,
                parent_id=cat.parent_id,
                status=cat.status,
                color=cat.color,
                description=cat.description,
                created_at=cat.created_at,
                taxonomy_version=cat.taxonomy_version,
                article_count=cat.article_count,
                cohesion_score=cat.cohesion_score,
                keywords=cat.keywords
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{category_id}/reject", response_model=CandidateActionResponse)
def reject_category(category_id: str):
    """Rejects and archives a candidate topic."""
    try:
        cat = category_registry.reject_candidate(category_id)
        return CandidateActionResponse(
            success=True,
            message=f"Category candidate '{cat.name}' rejected and archived.",
            category=CategoryResponse(
                id=cat.id,
                name=cat.name,
                parent_id=cat.parent_id,
                status=cat.status,
                color=cat.color,
                description=cat.description,
                created_at=cat.created_at,
                taxonomy_version=cat.taxonomy_version,
                article_count=cat.article_count,
                cohesion_score=cat.cohesion_score,
                keywords=cat.keywords
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
