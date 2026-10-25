"""
Unit and Integration Tests — FastAPI REST Endpoints
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_api_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "spark_version" in data
    assert "storage_mode" in data


def test_api_overview():
    response = client.get("/api/v1/overview")
    assert response.status_code == 200
    data = response.json()
    assert "active_dataset_records" in data
    assert "total_jobs_submitted" in data
    assert "category_distribution" in data


def test_api_classify_presets():
    response = client.get("/api/v1/classify/presets")
    assert response.status_code == 200
    presets = response.json()
    assert len(presets) == 4
    assert any(p["desk"] == "Sports" for p in presets)


def test_api_classify_single():
    payload = {
        "title": "Olympic Sprinter Breaks 100m World Record in Paris",
        "body": "The athletic prodigy crossed the tape in a blazing 9.55 seconds to win gold."
    }
    response = client.post("/api/v1/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_category"] in ["World", "Sports", "Business", "Sci/Tech"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert data["latency_ms"] > 0
    assert "explanation" in data


def test_api_classify_empty():
    response = client.post("/api/v1/classify", json={"title": "  ", "body": ""})
    assert response.status_code == 400


def test_api_batch_template():
    response = client.get("/api/v1/batches/template")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert len(response.content) > 50


def test_api_list_articles():
    response = client.get("/api/v1/articles?page=1&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert len(data["items"]) <= 5


def test_api_jobs_history():
    response = client.get("/api/v1/jobs")
    assert response.status_code == 200
    jobs = response.json()
    assert isinstance(jobs, list)


def test_api_analytics():
    response = client.get("/api/v1/analytics")
    assert response.status_code == 200
    data = response.json()
    assert "category_distribution" in data
    assert "confidence_distribution" in data


def test_api_model_lab():
    response = client.get("/api/v1/model")
    assert response.status_code == 200
    data = response.json()
    assert "pipeline_stages" in data
    assert len(data["pipeline_stages"]) == 5


def test_api_infrastructure():
    response = client.get("/api/v1/infrastructure")
    assert response.status_code == 200
    data = response.json()
    assert "spark_diagnostics" in data
    assert "storage_diagnostics" in data
    assert "sanitized_config" in data
