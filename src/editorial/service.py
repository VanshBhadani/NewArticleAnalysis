"""
NewsPulse AI — Daily News Desk Orchestrator Service
Combines active dataset loading, deterministic story clustering, editorial scoring,
category balancing, and persistent curation actions.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd

from src.logging_config import logger
from src.data.dataset_service import dataset_service
from src.taxonomy.registry import category_registry
from src.editorial.ranking import (
    EditorialWeights,
    EditorialScoreBreakdown,
    calculate_editorial_score
)
from src.editorial.clustering import (
    StoryGroup,
    story_clustering_engine
)
from src.editorial.repository import (
    EditorialRepository,
    EditorialSelectionRecord,
    editorial_repo
)


@dataclass
class RankedStory:
    story_id: str
    headline: str
    lead_article_id: str
    main_category: str
    subcategory: str
    excerpt: str
    published_date: str
    source: str
    distinct_sources_count: int
    related_articles_count: int
    editorial_score: float
    classification_confidence: float
    score_breakdown: Dict[str, Any]
    score_explanation: str
    is_uncertain: bool
    status: str = "recommended"  # "recommended" | "selected" | "saved" | "dismissed"
    is_lead: bool = False
    edition_order: int = 0
    publication_section: str = "Front Page"
    editor_notes: str = ""
    articles: List[Dict[str, Any]] = field(default_factory=list)
    article_ids: List[str] = field(default_factory=list)
    distinct_sources: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class EditorialDeskService:
    """Orchestrates end-to-end Daily News Desk functionality."""

    def __init__(self, repo: Optional[EditorialRepository] = None):
        self.repo = repo or editorial_repo

    def get_ranked_stories(
        self,
        weights: Optional[EditorialWeights] = None,
        force_recompute: bool = False
    ) -> List[RankedStory]:
        """
        Loads active articles, clusters them into stories, computes deterministic
        editorial importance scores, and merges persisted curator status.
        """
        df = dataset_service.get_active_dataframe()
        if df is None or df.empty:
            return []

        story_groups = story_clustering_engine.group_articles(df, force_recompute=force_recompute)
        selections_map = {s.story_id: s for s in self.repo.list_selections()}

        ranked_list: List[RankedStory] = []

        for group in story_groups:
            # Calculate deterministic score
            score_data = calculate_editorial_score(
                headline=group.representative_headline,
                body=group.excerpt,
                related_articles_count=group.related_articles_count,
                distinct_sources_count=group.distinct_sources_count,
                cluster_cohesion=group.cluster_cohesion,
                weights=weights
            )

            # Check if this story has an editor decision in SQLite
            sel = selections_map.get(group.story_id)
            status = sel.status if sel else "recommended"
            is_lead = sel.is_lead if sel else False
            edition_order = sel.edition_order if sel else 0
            pub_section = sel.publication_section if sel else "Front Page"
            notes = sel.editor_notes if sel else ""

            # Check if lead article is uncertain
            is_unc = False
            for art in group.articles:
                if art.article_id == group.lead_article_id:
                    is_unc = art.is_uncertain
                    break

            ranked_story = RankedStory(
                story_id=group.story_id,
                headline=group.representative_headline,
                lead_article_id=group.lead_article_id,
                main_category=group.main_category,
                subcategory=group.subcategory,
                excerpt=group.excerpt,
                published_date=group.published_date,
                source=group.lead_source,
                distinct_sources_count=group.distinct_sources_count,
                related_articles_count=group.related_articles_count,
                editorial_score=score_data.total_score,
                classification_confidence=round(group.lead_confidence * 100.0, 1),
                score_breakdown=score_data.to_dict(),
                score_explanation=score_data.explanation,
                is_uncertain=is_unc,
                status=status,
                is_lead=is_lead,
                edition_order=edition_order,
                publication_section=pub_section,
                editor_notes=notes,
                articles=[asdict(a) for a in group.articles],
                article_ids=group.article_ids,
                distinct_sources=group.distinct_sources
            )
            ranked_list.append(ranked_story)

        # Sort descending by editorial score
        ranked_list.sort(key=lambda s: s.editorial_score, reverse=True)
        return ranked_list

    def get_daily_news_desk_payload(
        self,
        balance_categories: bool = True,
        weights: Optional[EditorialWeights] = None
    ) -> Dict[str, Any]:
        """
        Builds the complete daily editorial intelligence payload:
        - Lead Story candidate
        - Top Stories (with category balancing to prevent any single category from monopolizing)
        - Category Highlights across every active category in taxonomy
        - Current Edition Selections, Saved Stories, and Dismissed Queue
        """
        all_stories = self.get_ranked_stories(weights=weights)

        # Separate by status
        active_candidates = [s for s in all_stories if s.status != "dismissed"]
        selected_stories = [s for s in all_stories if s.status == "selected"]
        saved_stories = [s for s in all_stories if s.status == "saved"]
        dismissed_stories = [s for s in all_stories if s.status == "dismissed"]

        # Sort selected by order
        selected_stories.sort(key=lambda s: (not s.is_lead, s.edition_order, -s.editorial_score))

        # Identify Lead Story:
        # Either explicitly designated by editor, or the highest scoring story
        lead_story = None
        for s in selected_stories:
            if s.is_lead:
                lead_story = s
                break
        if not lead_story and active_candidates:
            lead_story = active_candidates[0]

        # Top Stories Selection with Category Balancing
        top_stories: List[RankedStory] = []
        if active_candidates:
            if balance_categories:
                # Group active stories by category
                by_cat: Dict[str, List[RankedStory]] = {}
                for s in active_candidates:
                    by_cat.setdefault(s.main_category, []).append(s)

                # Round-robin: Pick top story from each category first
                chosen_ids = set()
                for cat_name, cat_stories in by_cat.items():
                    if cat_stories:
                        top_stories.append(cat_stories[0])
                        chosen_ids.add(cat_stories[0].story_id)

                # Fill remaining slots up to 6 by highest score
                for s in active_candidates:
                    if len(top_stories) >= 6:
                        break
                    if s.story_id not in chosen_ids:
                        top_stories.append(s)
                        chosen_ids.add(s.story_id)

                # Sort top stories by score
                top_stories.sort(key=lambda s: (not s.is_lead, -s.editorial_score))
            else:
                top_stories = active_candidates[:6]

        # Dynamic Category Highlights across ALL active categories in registry
        active_cats_meta = category_registry.list_categories(status="active")
        category_highlights: List[Dict[str, Any]] = []

        # Map stories by normalized category name
        stories_by_cat_name: Dict[str, List[RankedStory]] = {}
        for s in active_candidates:
            c_norm = s.main_category.lower().replace("/", "")
            stories_by_cat_name.setdefault(c_norm, []).append(s)

        for cat_meta in active_cats_meta:
            norm_id = cat_meta.id.lower().replace("/", "")
            norm_name = cat_meta.name.lower().replace("/", "")
            cat_list = stories_by_cat_name.get(norm_id, []) or stories_by_cat_name.get(norm_name, [])

            # Also check if any category matches partially
            if not cat_list:
                for k, v in stories_by_cat_name.items():
                    if k in norm_id or norm_id in k or k in norm_name:
                        cat_list = v
                        break

            # Top 4 stories for this category
            top_in_cat = cat_list[:4] if cat_list else []

            category_highlights.append({
                "category_id": cat_meta.id,
                "category_name": cat_meta.name,
                "color": cat_meta.color,
                "description": cat_meta.description,
                "total_stories": len(cat_list),
                "stories": [s.to_dict() for s in top_in_cat]
            })

        w_dict = asdict(weights or EditorialWeights())

        return {
            "date": datetime.utcnow().strftime("%A, %B %d, %Y"),
            "edition_title": "Daily Newsroom Intelligence Edition",
            "stats": {
                "total_stories_clustered": len(all_stories),
                "total_articles_ingested": sum(s.related_articles_count for s in all_stories),
                "total_selected": len(selected_stories),
                "total_saved": len(saved_stories),
                "total_dismissed": len(dismissed_stories),
                "active_categories_count": len(active_cats_meta)
            },
            "lead_story": lead_story.to_dict() if lead_story else None,
            "top_stories": [s.to_dict() for s in top_stories],
            "category_highlights": category_highlights,
            "selected_edition": [s.to_dict() for s in selected_stories],
            "saved_stories": [s.to_dict() for s in saved_stories],
            "dismissed_stories": [s.to_dict() for s in dismissed_stories],
            "ranking_weights": w_dict
        }


editorial_service = EditorialDeskService()
