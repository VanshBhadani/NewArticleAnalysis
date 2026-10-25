"""
NewsPulse AI — Spark ML Inference Engine
Performs real-time single-article classification and high-throughput batch predictions.
"""

import json
import time
from typing import Dict, Any, Optional, Tuple
import pandas as pd
from pyspark.ml import PipelineModel
from pyspark.sql.types import StructType, StructField, StringType

from src.config import settings, CATEGORY_MAP
from src.logging_config import logger
from src.spark.session import get_spark_session

_CACHED_MODEL = None
_CACHED_VERSION = None


def load_model(version: Optional[str] = None) -> PipelineModel:
    """Loads and caches the fitted Spark MLlib PipelineModel."""
    global _CACHED_MODEL, _CACHED_VERSION
    target_version = version or settings.active_model_version
    
    if _CACHED_MODEL is not None and _CACHED_VERSION == target_version:
        return _CACHED_MODEL

    # Ensure active SparkSession exists before loading PipelineModel
    spark = get_spark_session()
    
    model_path = str(settings.models_dir / target_version / "spark_model")
    logger.info(f"Loading Spark MLlib PipelineModel from: {model_path}")
    
    try:
        model = PipelineModel.load(model_path)
        _CACHED_MODEL = model
        _CACHED_VERSION = target_version
        return model
    except Exception as e:
        logger.error(f"Failed to load model from {model_path}: {e}")
        raise FileNotFoundError(
            f"Fitted Spark MLlib model '{target_version}' not found at {model_path}. "
            "Please train the model first via Model Lab or scripts/train_model.py."
        ) from e


def get_model_metadata(version: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Loads saved evaluation summary and training parameters for the specified model."""
    target_version = version or settings.active_model_version
    meta_path = settings.models_dir / target_version / "evaluation_summary.json"
    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error reading model metadata: {e}")
    return None


def predict_single_article(
    title: str,
    body: str = "",
    model: Optional[PipelineModel] = None
) -> Dict[str, Any]:
    """
    Classifies a single article headline and body using the Spark MLlib Pipeline.
    Returns predicted category, confidence, class probability breakdown, and editorial rationale.
    """
    start_time = time.time()
    if model is None:
        model = load_model()

    spark = get_spark_session()

    # Clean and combine text
    t = (title or "").strip()
    b = (body or "").strip()
    combined = f"{t} - {b}" if (t and b) else (t or b)

    if not combined:
        return {
            "error": "Article text cannot be empty.",
            "latency_ms": 0.0
        }

    schema = StructType([
        StructField("combined_text", StringType(), False)
    ])
    input_df = spark.createDataFrame([(combined,)], schema=schema)

    transformed = model.transform(input_df)
    row = transformed.select("prediction", "probability").collect()[0]

    pred_id = int(row.prediction)
    probabilities = [round(float(p), 4) for p in row.probability.toArray()]

    confidence = probabilities[pred_id]
    predicted_category = CATEGORY_MAP.get(pred_id, "Unknown")

    # Sort probabilities to detect uncertainty
    sorted_probs = sorted(probabilities, reverse=True)
    margin = sorted_probs[0] - sorted_probs[1] if len(sorted_probs) > 1 else 1.0
    is_uncertain = confidence < 0.45 or margin < 0.12

    latency_ms = round((time.time() - start_time) * 1000, 2)

    # Class probabilities dictionary
    class_scores = {
        CATEGORY_MAP[i]: probabilities[i] for i in range(len(CATEGORY_MAP))
    }

    # Editorial rationale generator
    explanation = _generate_editorial_rationale(
        category=predicted_category,
        confidence=confidence,
        margin=margin,
        is_uncertain=is_uncertain
    )

    return {
        "title": t,
        "combined_text": combined,
        "predicted_category": predicted_category,
        "predicted_id": pred_id,
        "confidence": confidence,
        "is_uncertain": is_uncertain,
        "class_scores": class_scores,
        "latency_ms": latency_ms,
        "model_version": settings.active_model_version,
        "explanation": explanation
    }


def predict_batch_articles(
    df: pd.DataFrame,
    model: Optional[PipelineModel] = None
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Executes distributed batch prediction across a validated articles DataFrame.
    Returns the enriched DataFrame with predictions and batch performance metrics.
    """
    start_time = time.time()
    if model is None:
        model = load_model()

    spark = get_spark_session()
    record_count = len(df)
    logger.info(f"Initiating Spark batch prediction on {record_count} records...")

    spark_schema = StructType([
        StructField("article_id", StringType(), False),
        StructField("title", StringType(), True),
        StructField("description", StringType(), True),
        StructField("combined_text", StringType(), False)
    ])

    prep_data = df[["article_id", "title", "description", "combined_text"]].copy()
    spark_df = spark.createDataFrame(prep_data, schema=spark_schema)

    # Run Spark ML transformation
    predictions_spark = model.transform(spark_df)

    # Select relevant prediction columns and bring back to driver
    results = predictions_spark.select(
        "article_id",
        "title",
        "description",
        "combined_text",
        "prediction",
        "probability"
    ).collect()

    rows = []
    category_counts = {c: 0 for c in CATEGORY_MAP.values()}

    for r in results:
        pred_id = int(r.prediction)
        probs = [round(float(p), 4) for p in r.probability.toArray()]
        conf = probs[pred_id]
        cat_name = CATEGORY_MAP.get(pred_id, "Unknown")
        category_counts[cat_name] = category_counts.get(cat_name, 0) + 1

        rows.append({
            "article_id": r.article_id,
            "title": r.title,
            "description": r.description,
            "combined_text": r.combined_text,
            "predicted_category": cat_name,
            "predicted_id": pred_id,
            "confidence": conf,
            "is_uncertain": conf < 0.45,
            "prob_world": probs[0],
            "prob_sports": probs[1],
            "prob_business": probs[2],
            "prob_scitech": probs[3]
        })

    enriched_df = pd.DataFrame(rows)
    total_time_sec = round(time.time() - start_time, 2)
    throughput = round(record_count / total_time_sec, 1) if total_time_sec > 0 else float(record_count)

    stats = {
        "record_count": record_count,
        "processing_time_seconds": total_time_sec,
        "throughput_articles_per_sec": throughput,
        "category_distribution": category_counts,
        "average_confidence": round(float(enriched_df["confidence"].mean()), 4) if not enriched_df.empty else 0.0,
        "model_version": settings.active_model_version
    }

    logger.info(f"Batch prediction complete: {record_count} records in {total_time_sec}s ({throughput} art/sec)")
    return enriched_df, stats


def _generate_editorial_rationale(
    category: str,
    confidence: float,
    margin: float,
    is_uncertain: bool
) -> str:
    """Generates an honest, readable editorial explanation for why this category was predicted."""
    conf_pct = f"{confidence * 100:.1f}%"
    if is_uncertain:
        return (
            f"Prediction leans toward {category} with moderate confidence ({conf_pct}), "
            f"but shows topical overlap with adjacent subjects (lead margin: {margin * 100:.1f}%). "
            "Editorial review is recommended before automated publication."
        )
    return (
        f"Classified as {category} with decisive confidence ({conf_pct}). "
        "Vocabulary and feature weights strongly align with canonical patterns for this desk."
    )
