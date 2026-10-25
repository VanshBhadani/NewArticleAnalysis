"""
NewsPulse AI — Spark ML Evaluation & Metrics Engine
Computes multi-class classification metrics and confusion matrix distributions.
"""

from typing import Dict, Any, List
import numpy as np
from pyspark.ml.evaluation import MulticlassClassificationEvaluator
from src.config import CATEGORY_MAP


def evaluate_predictions(predictions_df) -> Dict[str, Any]:
    """
    Computes standard multi-class evaluation metrics using Spark MLlib evaluators.
    """
    metrics = {}
    metric_names = [
        ("accuracy", "accuracy"),
        ("weighted_precision", "weightedPrecision"),
        ("weighted_recall", "weightedRecall"),
        ("f1_score", "f1")
    ]

    for display_key, eval_metric in metric_names:
        evaluator = MulticlassClassificationEvaluator(
            labelCol="label",
            predictionCol="prediction",
            metricName=eval_metric
        )
        score = evaluator.evaluate(predictions_df)
        metrics[display_key] = round(float(score), 4)

    # Compute Per-Class Precision, Recall, and F1
    per_class = {}
    for class_id, class_name in CATEGORY_MAP.items():
        p_eval = MulticlassClassificationEvaluator(
            labelCol="label", predictionCol="prediction",
            metricName="precisionByLabel", metricLabel=float(class_id)
        )
        r_eval = MulticlassClassificationEvaluator(
            labelCol="label", predictionCol="prediction",
            metricName="recallByLabel", metricLabel=float(class_id)
        )
        f_eval = MulticlassClassificationEvaluator(
            labelCol="label", predictionCol="prediction",
            metricName="fMeasureByLabel", metricLabel=float(class_id)
        )

        per_class[class_name] = {
            "class_id": class_id,
            "precision": round(float(p_eval.evaluate(predictions_df)), 4),
            "recall": round(float(r_eval.evaluate(predictions_df)), 4),
            "f1": round(float(f_eval.evaluate(predictions_df)), 4)
        }

    metrics["per_class"] = per_class

    # Compute Confusion Matrix
    # Collect only (label, prediction) pairs to driver
    pairs = predictions_df.select("label", "prediction").collect()
    num_classes = len(CATEGORY_MAP)
    matrix = np.zeros((num_classes, num_classes), dtype=int)

    for row in pairs:
        actual = int(row.label)
        pred = int(row.prediction)
        if 0 <= actual < num_classes and 0 <= pred < num_classes:
            matrix[actual][pred] += 1

    metrics["confusion_matrix"] = {
        "labels": [CATEGORY_MAP[i] for i in range(num_classes)],
        "matrix": matrix.tolist()
    }

    return metrics
