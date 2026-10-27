"""
Unit Tests — Deterministic Topic Discovery Engine
Verifies conventional TF-IDF cosine similarity, agglomerative clustering,
evidence-based emerging topic discovery, and edge cases (empty dataset, single outliers).
"""

import pytest
import pandas as pd
from src.taxonomy.topic_discovery import TopicDiscoveryEngine


def test_empty_dataframe_handling():
    engine = TopicDiscoveryEngine()
    empty_df = pd.DataFrame()
    res = engine.analyze_corpus(empty_df)
    assert res.nodes == []
    assert res.edges == []
    assert res.clusters == []
    assert res.emerging_candidates == []


def test_similarity_and_clustering_on_sample_corpus():
    engine = TopicDiscoveryEngine(min_cluster_size=3, similarity_threshold=0.20)

    sample_articles = [
        # Quantum computing cluster
        {"article_id": "q1", "title": "Quantum processor achieves fault tolerant qubits", "description": "Superconducting circuits demonstrate error correction", "predicted_category": "Sci/Tech", "confidence": 0.90},
        {"article_id": "q2", "title": "Fault tolerant quantum computing breakthrough", "description": "Physicists scale logical qubits with error correction", "predicted_category": "Sci/Tech", "confidence": 0.88},
        {"article_id": "q3", "title": "Quantum computing laboratory tests logical qubits", "description": "Cryogenic dilution refrigerators cool quantum processor", "predicted_category": "Sci/Tech", "confidence": 0.85},
        # Diplomacy cluster
        {"article_id": "d1", "title": "UN Security Council discusses maritime accord", "description": "Diplomats gather in Geneva for treaty negotiations", "predicted_category": "World", "confidence": 0.82},
        {"article_id": "d2", "title": "Geneva maritime accord ratified by diplomats", "description": "Ambassadors sign international territorial treaty", "predicted_category": "World", "confidence": 0.80},
    ]
    df = pd.DataFrame(sample_articles)

    res = engine.analyze_corpus(df)
    assert len(res.nodes) == 5
    assert len(res.clusters) >= 2

    # Verify quantum articles share meaningful similarity edge
    quantum_edges = [
        e for e in res.edges
        if e["source"] in ("q1", "q2", "q3") and e["target"] in ("q1", "q2", "q3")
    ]
    assert len(quantum_edges) >= 1
    for edge in quantum_edges:
        assert edge["similarity"] >= 0.20

    # Check that nodes received 2D galaxy coordinates
    for node in res.nodes:
        assert "x" in node and isinstance(node["x"], (int, float))
        assert "y" in node and isinstance(node["y"], (int, float))
        assert "subcategory" in node and len(node["subcategory"]) > 0


def test_single_unknown_article_does_not_create_candidate():
    """Verifies requirement: a single unknown article must not automatically create a permanent or candidate category."""
    engine = TopicDiscoveryEngine(min_cluster_size=3)

    articles = [
        {"article_id": "w1", "title": "President speaks at United Nations", "description": "Global leaders address assembly", "predicted_category": "World", "confidence": 0.85},
        {"article_id": "w2", "title": "Diplomatic treaty signed in Paris", "description": "International summit concludes", "predicted_category": "World", "confidence": 0.87},
        {"article_id": "w3", "title": "Peace negotiations continue in Cairo", "description": "Ceasefire protocols discussed", "predicted_category": "World", "confidence": 0.82},
        # Single isolated uncertain article with unfamiliar topic
        {"article_id": "u1", "title": "Experimental artisanal sourdough fermentation technique", "description": "Wild yeast sourdough starter microbiology in bakery", "predicted_category": "Sci/Tech", "confidence": 0.35, "is_uncertain": True},
    ]
    df = pd.DataFrame(articles)

    res = engine.analyze_corpus(df)
    # Single isolated uncertain article must NOT form an emerging candidate
    assert len(res.emerging_candidates) == 0

    # The uncertain article node must be marked as requires_review
    u1_node = next(n for n in res.nodes if n["article_id"] == "u1")
    assert u1_node["is_uncertain"] is True
    assert u1_node["requires_review"] is True


def test_recurring_unfamiliar_articles_create_candidate():
    """Multiple related unfamiliar articles meeting cluster size and cohesion DO create an emerging topic candidate."""
    engine = TopicDiscoveryEngine(min_cluster_size=3, min_cohesion=0.25)

    articles = [
        # Standard known articles
        {"article_id": "s1", "title": "Champions League final football match", "description": "Real Madrid wins final", "predicted_category": "Sports", "confidence": 0.89},
        {"article_id": "s2", "title": "Wimbledon tennis championship semifinals", "description": "Top seed advances in five sets", "predicted_category": "Sports", "confidence": 0.91},
        # 3 recurring uncertain articles about an emerging topic (e.g., geothermal energy)
        {"article_id": "e1", "title": "Deep geothermal borehole drilling starts in Nevada", "description": "Engineered geothermal systems tap subsurface heat reservoirs", "predicted_category": "Sci/Tech", "confidence": 0.38, "is_uncertain": True},
        {"article_id": "e2", "title": "Clean electricity generated from geothermal borehole", "description": "Superheated geothermal reservoir powers clean energy grid", "predicted_category": "Sci/Tech", "confidence": 0.39, "is_uncertain": True},
        {"article_id": "e3", "title": "Geothermal drilling technology expands in Western states", "description": "Subsurface reservoir fracture engineering yields geothermal power", "predicted_category": "Sci/Tech", "confidence": 0.37, "is_uncertain": True},
    ]
    df = pd.DataFrame(articles)

    res = engine.analyze_corpus(df)
    # Must identify the emerging topic candidate
    assert len(res.emerging_candidates) == 1
    cand = res.emerging_candidates[0]
    assert cand["size"] == 3
    assert cand["cohesion"] >= 0.25
    assert any("geothermal" in kw.lower() for kw in cand["keywords"])
