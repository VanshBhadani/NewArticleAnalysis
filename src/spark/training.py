"""
NewsPulse AI — Spark MLlib Training Pipeline
Assembles Pipeline, trains Logistic Regression model, computes evaluation metrics, and persists artifacts.
"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Tuple
import pandas as pd
from pyspark.ml import Pipeline
from pyspark.ml.classification import LogisticRegression
from pyspark.sql.types import StructType, StructField, StringType, IntegerType

from src.config import settings, CATEGORY_MAP
from src.logging_config import logger
from src.spark.session import get_spark_session
from src.spark.preprocessing import create_feature_pipeline_stages
from src.spark.evaluation import evaluate_predictions


def train_and_evaluate_model(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    model_version: str = "v1.0.0-spark-lr",
    num_features: int = 5000,
    reg_param: float = 0.1,
    max_iter: int = 25
) -> Tuple[Any, Dict[str, Any]]:
    """
    Trains a full Spark ML PipelineModel on train_df and evaluates on test_df.
    Persists the fitted PipelineModel and evaluation metadata to disk.
    """
    spark = get_spark_session()
    start_time = time.time()
    logger.info(f"Starting model training (Version: {model_version}, Train Size: {len(train_df)}, Test Size: {len(test_df)})")

    # Define schema for input spark DataFrames
    spark_schema = StructType([
        StructField("title", StringType(), True),
        StructField("description", StringType(), True),
        StructField("combined_text", StringType(), False),
        StructField("label", IntegerType(), False)
    ])

    train_data_clean = train_df[["title", "description", "combined_text", "label"]].copy()
    test_data_clean = test_df[["title", "description", "combined_text", "label"]].copy()

    # Convert to Spark DataFrames
    train_spark = spark.createDataFrame(train_data_clean, schema=spark_schema)
    test_spark = spark.createDataFrame(test_data_clean, schema=spark_schema)

    # Build Pipeline stages
    feature_stages = create_feature_pipeline_stages(
        input_col="combined_text",
        num_features=num_features
    )

    classifier = LogisticRegression(
        featuresCol="features",
        labelCol="label",
        predictionCol="prediction",
        probabilityCol="probability",
        rawPredictionCol="rawPrediction",
        maxIter=max_iter,
        regParam=reg_param,
        elasticNetParam=0.0
    )

    pipeline = Pipeline(stages=feature_stages + [classifier])

    # Fit pipeline
    logger.info("Fitting Spark MLlib Pipeline...")
    fit_start = time.time()
    pipeline_model = pipeline.fit(train_spark)
    training_duration_sec = round(time.time() - fit_start, 2)
    logger.info(f"Pipeline fitted in {training_duration_sec}s")

    # Transform test set and evaluate
    predictions = pipeline_model.transform(test_spark)
    eval_metrics = evaluate_predictions(predictions)

    total_duration_sec = round(time.time() - start_time, 2)

    metadata = {
        "model_version": model_version,
        "algorithm": "Multinomial Logistic Regression (L2 Regularized)",
        "feature_extractor": f"RegexTokenizer -> StopWordsRemover -> HashingTF({num_features}) -> IDF",
        "training_timestamp": datetime.utcnow().isoformat() + "Z",
        "train_record_count": len(train_df),
        "test_record_count": len(test_df),
        "training_duration_seconds": training_duration_sec,
        "total_pipeline_seconds": total_duration_sec,
        "hyperparameters": {
            "num_features": num_features,
            "reg_param": reg_param,
            "max_iter": max_iter,
            "elastic_net": 0.0
        },
        "metrics": eval_metrics
    }

    # Persist model artifact and evaluation metadata
    save_dir = settings.models_dir / model_version
    save_dir.mkdir(parents=True, exist_ok=True)
    
    # Save Spark ML PipelineModel artifact
    spark_model_path = str(save_dir / "spark_model")
    try:
        pipeline_model.write().overwrite().save(spark_model_path)
        logger.info(f"Spark MLlib PipelineModel saved to {spark_model_path}")
    except Exception as e:
        logger.warning(f"Could not overwrite existing model at {spark_model_path} directly: {e}")

    # Save JSON summary
    meta_path = save_dir / "evaluation_summary.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Model metadata saved to {meta_path}. Accuracy: {eval_metrics.get('accuracy')}")
    return pipeline_model, metadata
