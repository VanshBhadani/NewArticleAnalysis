"""
NewsPulse AI — Daily News Desk REST API Routes
Provides endpoints for deterministic daily editorial curation, story group exploration,
and SQLite-backed editorial selection persistence.
"""

from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel, Field

from src.logging_config import logger
from src.editorial.service import editorial_service
from src.editorial.ranking import EditorialWeights

router = APIRouter(prefix="/editorial", tags=["Daily News Desk"])


class StoryActionRequest(BaseModel):
    story_id: str
    editor_notes: Optional[str] = ""


class SelectStoryRequest(BaseModel):
    story_id: str
    is_lead: bool = False
    edition_order: Optional[int] = None
    publication_section: str = "Front Page"
    editor_notes: Optional[str] = ""


class StoryOrderItem(BaseModel):
    story_id: str
    edition_order: int


class ReorderRequest(BaseModel):
    orders: List[StoryOrderItem]


class SectionAssignmentRequest(BaseModel):
    story_id: str
    publication_section: str


@router.get("/daily")
def get_daily_news_desk(
    balance_categories: bool = Query(True, description="Balance top story picks across news desks"),
    w_coverage: Optional[float] = Query(None, description="Weight for coverage breadth"),
    w_impact: Optional[float] = Query(None, description="Weight for public impact"),
    w_depth: Optional[float] = Query(None, description="Weight for lexical depth"),
    w_cohesion: Optional[float] = Query(None, description="Weight for cluster cohesion"),
    w_recency: Optional[float] = Query(None, description="Weight for recency")
):
    """
    Returns the comprehensive Daily News Desk editorial payload:
    - Ranked top stories (with category balancing)
    - Lead story candidate
    - Category highlights across all active taxonomy categories
    - Active edition selections, saved bookmarks, and dismissed queue
    """
    weights = None
    if all(w is not None for w in [w_coverage, w_impact, w_depth, w_cohesion, w_recency]):
        try:
            weights = EditorialWeights(
                coverage_breadth=float(w_coverage),
                public_impact=float(w_impact),
                lexical_depth=float(w_depth),
                cluster_cohesion=float(w_cohesion),
                recency=float(w_recency)
            )
            weights.validate()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid weights: {e}")

    try:
        return editorial_service.get_daily_news_desk_payload(
            balance_categories=balance_categories,
            weights=weights
        )
    except Exception as e:
        logger.error(f"Error generating daily editorial payload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate daily news desk: {str(e)}")


@router.get("/stories")
def list_story_groups(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search across headlines and excerpts"),
    status: Optional[str] = Query(None, description="Filter by status (recommended, selected, saved, dismissed)"),
    min_score: float = Query(0.0, ge=0.0, le=100.0, description="Minimum editorial importance score")
):
    """Lists and searches all clustered story groups."""
    stories = editorial_service.get_ranked_stories()

    if category and category.lower() != "all" and category != "All Categories":
        stories = [s for s in stories if s.main_category.lower() == category.lower()]

    if search:
        q = search.lower().strip()
        stories = [s for s in stories if q in s.headline.lower() or q in s.excerpt.lower()]

    if status and status.lower() != "all":
        stories = [s for s in stories if s.status.lower() == status.lower()]

    if min_score > 0.0:
        stories = [s for s in stories if s.editorial_score >= min_score]

    return [s.to_dict() for s in stories]


@router.get("/stories/{story_id}")
def get_story_group_details(story_id: str):
    """Fetches complete story group details, including all member articles and mathematical breakdown."""
    stories = editorial_service.get_ranked_stories()
    for s in stories:
        if s.story_id == story_id:
            return s.to_dict()
    raise HTTPException(status_code=404, detail=f"Story group '{story_id}' not found.")


@router.post("/select")
def select_story_for_edition(req: SelectStoryRequest):
    """Curates a story group into today's publication edition."""
    stories = editorial_service.get_ranked_stories()
    target = None
    for s in stories:
        if s.story_id == req.story_id:
            target = s
            break

    if not target:
        raise HTTPException(status_code=404, detail=f"Story '{req.story_id}' not found.")

    record = editorial_service.repo.select_story(
        story_id=target.story_id,
        lead_article_id=target.lead_article_id,
        headline=target.headline,
        category=target.main_category,
        editorial_score=target.editorial_score,
        article_ids=target.article_ids,
        is_lead=req.is_lead,
        edition_order=req.edition_order,
        publication_section=req.publication_section,
        editor_notes=req.editor_notes or ""
    )
    return {"status": "success", "selection": record.to_dict()}


@router.post("/deselect")
def deselect_story_from_edition(req: StoryActionRequest):
    """Removes a story group from current edition lineup without deleting articles."""
    success = editorial_service.repo.deselect_story(req.story_id)
    return {"status": "success", "story_id": req.story_id, "removed": success}


@router.post("/set-lead")
def set_story_as_lead(req: StoryActionRequest):
    """Designates a story as the edition's primary Lead Headline."""
    record = editorial_service.repo.set_lead_story(req.story_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Story '{req.story_id}' could not be marked as lead.")
    return {"status": "success", "lead_story": record.to_dict()}


@router.post("/save-later")
def save_story_for_later(req: StoryActionRequest):
    """Bookmarks a story group for future editorial editions."""
    stories = editorial_service.get_ranked_stories()
    target = None
    for s in stories:
        if s.story_id == req.story_id:
            target = s
            break

    if not target:
        raise HTTPException(status_code=404, detail=f"Story '{req.story_id}' not found.")

    record = editorial_service.repo.save_story_later(
        story_id=target.story_id,
        lead_article_id=target.lead_article_id,
        headline=target.headline,
        category=target.main_category,
        editorial_score=target.editorial_score,
        article_ids=target.article_ids,
        editor_notes=req.editor_notes or ""
    )
    return {"status": "success", "saved": record.to_dict()}


@router.post("/dismiss")
def dismiss_story_recommendation(req: StoryActionRequest):
    """Dismisses a story from active recommendations without deleting the underlying articles."""
    stories = editorial_service.get_ranked_stories()
    target = None
    for s in stories:
        if s.story_id == req.story_id:
            target = s
            break

    if not target:
        raise HTTPException(status_code=404, detail=f"Story '{req.story_id}' not found.")

    record = editorial_service.repo.dismiss_story(
        story_id=target.story_id,
        lead_article_id=target.lead_article_id,
        headline=target.headline,
        category=target.main_category,
        editorial_score=target.editorial_score,
        article_ids=target.article_ids
    )
    return {"status": "success", "dismissed": record.to_dict()}


@router.post("/restore")
def restore_dismissed_story(req: StoryActionRequest):
    """Restores a dismissed or saved story back to default recommendations."""
    success = editorial_service.repo.restore_story(req.story_id)
    return {"status": "success", "story_id": req.story_id, "restored": success}


@router.post("/reorder")
def reorder_edition_stories(req: ReorderRequest):
    """Updates the sequence/priority order of stories in the day's edition."""
    items = [{"story_id": o.story_id, "edition_order": o.edition_order} for o in req.orders]
    success = editorial_service.repo.reorder_selections(items)
    return {"status": "success", "reordered": success}


@router.post("/section")
def assign_story_section(req: SectionAssignmentRequest):
    """Assigns story to a newspaper/web publication section."""
    record = editorial_service.repo.update_publication_section(req.story_id, req.publication_section)
    if not record:
        raise HTTPException(status_code=404, detail=f"Story '{req.story_id}' not found.")
    return {"status": "success", "updated": record.to_dict()}
