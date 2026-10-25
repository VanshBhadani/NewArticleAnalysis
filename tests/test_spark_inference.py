"""
Integration Tests — Spark MLlib Model Inference
"""

import pytest
from src.spark.inference import load_model, predict_single_article
from src.config import CATEGORY_MAP
from src.spark.session import stop_spark_session


@pytest.fixture(scope="module")
def spark_model():
    model = load_model("v1.0.0-spark-lr")
    yield model
    stop_spark_session()


def test_predict_single_article(spark_model):
    headline = "Olympic Gold Medalist Breaks World Record in 200m Final"
    body = "The championship sprinter surged past rivals in the final stretch to claim gold."
    
    result = predict_single_article(headline, body, model=spark_model)
    
    assert "predicted_category" in result
    assert result["predicted_category"] in CATEGORY_MAP.values()
    assert 0.0 <= result["confidence"] <= 1.0
    assert result["latency_ms"] > 0
    assert len(result["class_scores"]) == 4
    assert result["model_version"] == "v1.0.0-spark-lr"


def test_predict_single_article_empty(spark_model):
    result = predict_single_article("", "", model=spark_model)
    assert "error" in result
