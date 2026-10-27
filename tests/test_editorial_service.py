"""
NewsPulse AI — Tests for Daily News Desk & Editorial Service
Verifies deterministic editorial ranking, story clustering, category balancing,
fallback handling, and SQLite-backed curation persistence.
"""

import pytest
import pandas as pd
from fastapi.testclient import TestClient

from src.editorial.ranking import (
    EditorialWeights,
    EditorialScoreBreakdown,
    calculate_editorial_score,
    detect_impact_keywords
)
from src.editorial.clustering import (
    StoryClusteringEngine,
    extract_source_from_text
)
from src.editorial.repository import EditorialRepository
from src.editorial.service import EditorialDeskService, RankedStory
from src.api.main import app


def test_detect_impact_keywords():
    text = "UN Security Council convenes summit on Middle East peace accord and ceasefire verification."
    matches = detect_impact_keywords(text)
    assert "summit" in matches
    assert "accord" in matches
    assert "ceasefire" in matches
    assert "security council" in matches


def test_calculate_editorial_score_determinism():
    headline = "European Union Ratifies Historic Maritime Accord in Brussels"
    body = "Diplomats reach unanimous consensus on treaty monitoring and trade sanctions."

    res1 = calculate_editorial_score(
        headline=headline,
        body=body,
        related_articles_count=3,
        distinct_sources_count=2,
        cluster_cohesion=0.92
    )
    res2 = calculate_editorial_score(
        headline=headline,
        body=body,
        related_articles_count=3,
        distinct_sources_count=2,
        cluster_cohesion=0.92
    )

    assert res1.total_score == res2.total_score
    assert res1.coverage_breadth_score == res2.coverage_breadth_score
    assert res1.public_impact_score == res2.public_impact_score
    assert res1.explanation == res2.explanation
    assert res1.total_score > 60.0


def test_editorial_score_signals_comparison():
    # Story A has high impact and multiple sources
    story_a = calculate_editorial_score(
        headline="Central Bank Holds Benchmark Interest Rates Amid Recession Warning",
        body="Federal Reserve signals monetary policy shift as inflation cools.",
        related_articles_count=4,
        distinct_sources_count=3,
        cluster_cohesion=0.95
    )

    # Story B is a routine local story with no impact keywords
    story_b = calculate_editorial_score(
        headline="Local Weekend Flea Market Attracts Sunny Saturday Shoppers",
        body="Vendors sold handcrafted wooden birdhouses and homemade jam.",
        related_articles_count=1,
        distinct_sources_count=1,
        cluster_cohesion=0.80
    )

    assert story_a.total_score > story_b.total_score
    assert story_a.public_impact_score > story_b.public_impact_score
    assert story_a.coverage_breadth_score > story_b.coverage_breadth_score


def test_editorial_score_fallback_behavior():
    # If date is None or malformed, recency falls back to neutral 70.0
    res = calculate_editorial_score(
        headline="Quantum Computing Consortium Reaches Error Correction Milestone",
        body="Scientists demonstrate fault-tolerant qubit stabilization.",
        published_date_str="INVALID_DATE"
    )
    assert res.recency_score == 70.0
    assert 0.0 <= res.total_score <= 100.0


def test_story_clustering_grouping():
    engine = StoryClusteringEngine(similarity_threshold=0.25)
    df = pd.DataFrame([
        {
            "article_id": "art-1",
            "title": "Diplomats Gather in Geneva for Ceasefire Summit",
            "description": "UN envoys negotiate peace accord protocols.",
            "combined_text": "Diplomats Gather in Geneva for Ceasefire Summit - UN envoys negotiate peace accord protocols.",
            "predicted_category": "World",
            "confidence": 0.88,
            "is_uncertain": False
        },
        {
            "article_id": "art-2",
            "title": "Geneva Peace Talks Continue as Envoys Outline Ceasefire",
            "description": "UN delegates deliberate ceasefire monitoring terms.",
            "combined_text": "Geneva Peace Talks Continue as Envoys Outline Ceasefire - UN delegates deliberate ceasefire monitoring terms.",
            "predicted_category": "World",
            "confidence": 0.82,
            "is_uncertain": False
        },
        {
            "article_id": "art-3",
            "title": "Striker Scores Hat-Trick to Win Premier Championship",
            "description": "Football fans celebrate thrilling overtime title.",
            "combined_text": "Striker Scores Hat-Trick to Win Premier Championship - Football fans celebrate thrilling overtime title.",
            "predicted_category": "Sports",
            "confidence": 0.95,
            "is_uncertain": False
        }
    ])

    groups = engine.group_articles(df, force_recompute=True)
    assert len(groups) == 2  # 1 World cluster with 2 articles, 1 Sports cluster with 1 article

    world_group = next(g for g in groups if g.main_category == "World")
    assert world_group.related_articles_count == 2
    assert "art-1" in world_group.article_ids
    assert "art-2" in world_group.article_ids


def test_editorial_repository_persistence(tmp_path):
    db_file = tmp_path / "test_editorial.db"
    repo = EditorialRepository(str(db_file))

    # 1. Select Story
    sel = repo.select_story(
        story_id="story-001",
        lead_article_id="art-101",
        headline="Breakthrough in Quantum Processing Announced",
        category="Sci/Tech",
        editorial_score=82.5,
        article_ids=["art-101", "art-102"],
        is_lead=True,
        edition_order=1,
        publication_section="Front Page"
    )
    assert sel.status == "selected"
    assert sel.is_lead is True

    # 2. Re-instantiate repo to ensure SQLite persistence
    repo2 = EditorialRepository(str(db_file))
    reloaded = repo2.get_selection("story-001")
    assert reloaded is not None
    assert reloaded.headline == "Breakthrough in Quantum Processing Announced"
    assert reloaded.is_lead is True

    # 3. Save another story for later
    repo2.save_story_later(
        story_id="story-002",
        lead_article_id="art-201",
        headline="Quarterly GDP Growth Exceeds Analyst Projections",
        category="Business",
        editorial_score=71.0,
        article_ids=["art-201"]
    )
    saved = repo2.list_selections(status="saved")
    assert len(saved) == 1
    assert saved[0].story_id == "story-002"

    # 4. Dismiss a story
    repo2.dismiss_story(
        story_id="story-003",
        lead_article_id="art-301",
        headline="Routine Player Contract Renewal Finalized",
        category="Sports",
        editorial_score=45.0,
        article_ids=["art-301"]
    )
    dismissed = repo2.list_selections(status="dismissed")
    assert len(dismissed) == 1
    assert dismissed[0].story_id == "story-003"

    # 5. Restore story
    assert repo2.restore_story("story-003") is True
    assert len(repo2.list_selections(status="dismissed")) == 0


def test_editorial_api_endpoints():
    client = TestClient(app)

    # 1. GET /api/v1/editorial/daily
    res = client.get("/api/v1/editorial/daily")
    assert res.status_code == 200
    data = res.json()
    assert "top_stories" in data
    assert "category_highlights" in data
    assert "stats" in data
    assert "ranking_weights" in data

    # 2. GET /api/v1/editorial/stories
    stories_res = client.get("/api/v1/editorial/stories?min_score=10.0")
    assert stories_res.status_code == 200
    stories = stories_res.json()
    assert isinstance(stories, list)

    if stories:
        first_story = stories[0]
        sid = first_story["story_id"]

        # 3. GET /api/v1/editorial/stories/{story_id}
        det_res = client.get(f"/api/v1/editorial/stories/{sid}")
        assert det_res.status_code == 200
        assert det_res.json()["story_id"] == sid

        # 4. POST /api/v1/editorial/select
        sel_res = client.post("/api/v1/editorial/select", json={
            "story_id": sid,
            "is_lead": True,
            "publication_section": "Front Page Lead"
        })
        assert sel_res.status_code == 200
        assert sel_res.json()["status"] == "success"

        # 5. Verify daily payload reflects selection
        daily_updated = client.get("/api/v1/editorial/daily").json()
        assert any(s["story_id"] == sid for s in daily_updated["selected_edition"])
