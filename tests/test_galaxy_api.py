"""
Integration Tests — News Galaxy & Categories REST Endpoints
Tests /api/v1/galaxy, /api/v1/categories, promotion/rejection, filtering,
and consistent analytics across endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_api_categories_list():
    response = client.get("/api/v1/categories")
    assert response.status_code == 200
    cats = response.json()
    assert isinstance(cats, list)
    assert len(cats) >= 4
    cat_names = [c["name"] for c in cats]
    assert "World" in cat_names
    assert "Sports" in cat_names
    assert "Business" in cat_names
    assert "Sci/Tech" in cat_names

    # Check color presence and formatting
    for c in cats:
        assert c["color"].startswith("#")
        assert len(c["color"]) == 7


def test_api_galaxy_endpoint():
    response = client.get("/api/v1/galaxy")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert "clusters" in data
    assert "total_nodes" in data
    assert "total_clusters" in data
    assert len(data["nodes"]) > 0

    # Inspect node schema
    first_node = data["nodes"][0]
    assert "article_id" in first_node
    assert "title" in first_node
    assert "x" in first_node
    assert "y" in first_node
    assert "confidence" in first_node
    assert "subcategory" in first_node

    # Inspect clusters
    assert len(data["clusters"]) > 0
    first_cluster = data["clusters"][0]
    assert "cluster_id" in first_cluster
    assert "centroid_x" in first_cluster
    assert "centroid_y" in first_cluster
    assert "cohesion" in first_cluster


def test_api_galaxy_filters():
    # Filter by category
    resp = client.get("/api/v1/galaxy?category=Sports")
    assert resp.status_code == 200
    data = resp.json()
    assert all(n["predicted_category"].lower() == "sports" for n in data["nodes"])

    # Filter by confidence range
    resp_conf = client.get("/api/v1/galaxy?min_confidence=0.6&max_confidence=0.99")
    assert resp_conf.status_code == 200
    data_conf = resp_conf.json()
    for n in data_conf["nodes"]:
        assert 0.6 <= n["confidence"] <= 0.99

    # Filter by status decisive
    resp_status = client.get("/api/v1/galaxy?status=decisive")
    assert resp_status.status_code == 200
    data_status = resp_status.json()
    assert all(not n["is_uncertain"] for n in data_status["nodes"])


def test_api_category_lifecycle():
    # Register candidate via internal registry or check emerging
    from src.taxonomy.registry import category_registry
    cand = category_registry.register_candidate(
        name="Integration Test Topic",
        cohesion_score=0.72,
        keywords=["integration", "testing"]
    )

    # Promote endpoint
    resp_prom = client.post(f"/api/v1/categories/{cand.id}/promote")
    assert resp_prom.status_code == 200
    data_prom = resp_prom.json()
    assert data_prom["success"] is True
    assert data_prom["category"]["status"] == "active"

    # Reject endpoint
    resp_rej = client.post(f"/api/v1/categories/{cand.id}/reject")
    assert resp_rej.status_code == 200
    data_rej = resp_rej.json()
    assert data_rej["success"] is True
    assert data_rej["category"]["status"] == "archived"


def test_analytics_and_overview_consistency():
    # Overview category distribution
    overview_resp = client.get("/api/v1/overview")
    assert overview_resp.status_code == 200
    overview_data = overview_resp.json()
    overview_dist = overview_data["category_distribution"]
    assert "World" in overview_dist
    assert "Sports" in overview_dist

    # Analytics category distribution
    analytics_resp = client.get("/api/v1/analytics")
    assert analytics_resp.status_code == 200
    analytics_data = analytics_resp.json()
    analytics_dist = analytics_data["category_distribution"]

    # Both must report the same total counts
    assert sum(overview_dist.values()) == sum(analytics_dist.values())


def test_articles_subcategory_support():
    resp = client.get("/api/v1/articles?page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert len(data["items"]) <= 5
    for item in data["items"]:
        assert "subcategory" in item
