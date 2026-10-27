"""
Unit Tests — Dynamic Category Taxonomy Registry
Tests canonical desk seeding, deterministic color stability, candidate lifecycle,
promotion/rejection, and persistence.
"""

import pytest
from pathlib import Path
from src.taxonomy.registry import CategoryRegistry, CategoryMetadata, get_deterministic_color


def test_canonical_categories_initialization(tmp_path):
    reg = CategoryRegistry(persistence_file=tmp_path / "taxonomy.json")
    cats = reg.list_categories(status="active")
    cat_ids = {c.id for c in cats}
    
    assert "world" in cat_ids
    assert "sports" in cat_ids
    assert "business" in cat_ids
    assert "scitech" in cat_ids
    assert len(cats) >= 4


def test_deterministic_color_stability():
    # Canonical colors are preserved
    assert get_deterministic_color("world") == "#1E3A8A"
    assert get_deterministic_color("World") == "#1E3A8A"
    assert get_deterministic_color("sports") == "#047857"
    assert get_deterministic_color("business") == "#B45309"
    assert get_deterministic_color("Sci/Tech") == "#4338CA"
    assert get_deterministic_color("scitech") == "#4338CA"

    # Novel categories receive stable, reproducible colors
    color1 = get_deterministic_color("renewable_energy")
    color2 = get_deterministic_color("renewable_energy")
    assert color1 == color2
    assert color1.startswith("#") and len(color1) == 7


def test_candidate_registration_and_promotion(tmp_path):
    reg = CategoryRegistry(persistence_file=tmp_path / "taxonomy.json")

    # Register candidate
    cand = reg.register_candidate(
        name="Quantum Algorithms",
        parent_id="scitech",
        description="Candidate topic discovered via TF-IDF cohesion",
        cohesion_score=0.68,
        keywords=["quantum", "processor", "qubits"],
        article_count=5
    )
    assert cand.status == "candidate"
    assert cand.parent_id == "scitech"
    assert cand.cohesion_score == 0.68

    # Verify candidate appears in candidate list
    candidates = reg.list_categories(status="candidate")
    assert any(c.name == "Quantum Algorithms" for c in candidates)

    # Promote candidate
    promoted = reg.promote_candidate(cand.id)
    assert promoted.status == "active"

    # Verify promoted category now in active list
    active_cats = reg.list_categories(status="active")
    assert any(c.id == cand.id and c.status == "active" for c in active_cats)


def test_candidate_rejection(tmp_path):
    reg = CategoryRegistry(persistence_file=tmp_path / "taxonomy.json")

    cand = reg.register_candidate(
        name="Spam Outlier",
        description="Spurious cluster",
        cohesion_score=0.15,
        keywords=["noise", "gibberish"],
        article_count=2
    )

    rejected = reg.reject_candidate(cand.id)
    assert rejected.status == "archived"

    # Active list should not include archived
    active_cats = reg.list_categories(status="active")
    assert not any(c.id == cand.id for c in active_cats)

    # list_categories without archived should exclude it
    normal_list = reg.list_categories(include_archived=False)
    assert not any(c.id == cand.id for c in normal_list)


def test_persistence_roundtrip(tmp_path):
    file_path = tmp_path / "taxonomy_test.json"
    reg1 = CategoryRegistry(persistence_file=file_path)
    reg1.register_candidate(name="Biotechnology", keywords=["crispr", "dna"])

    # Load in new registry instance
    reg2 = CategoryRegistry(persistence_file=file_path)
    cat = reg2.get_category("biotechnology")
    assert cat is not None
    assert cat.name == "Biotechnology"
