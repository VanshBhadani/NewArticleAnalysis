"""
NewsPulse AI — Model Training Script
Loads AG News dataset, trains Spark MLlib Logistic Regression pipeline, and persists artifact.
"""

import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.logging_config import logger
from src.data.ingestion import load_ag_news_benchmark, create_sample_batch_csv
from src.spark.training import train_and_evaluate_model
from src.spark.session import stop_spark_session


def main():
    logger.info("Initializing NewsPulse AI model training pipeline...")
    
    # 1. Ensure sample batch CSV exists
    create_sample_batch_csv()

    # 2. Ingest benchmark dataset
    train_df, test_df = load_ag_news_benchmark()
    logger.info(f"Loaded benchmark dataset: {len(train_df)} train, {len(test_df)} test samples.")

    # 3. Train and evaluate Spark MLlib pipeline
    model, metadata = train_and_evaluate_model(
        train_df=train_df,
        test_df=test_df,
        model_version="v1.0.0-spark-lr",
        num_features=4000,
        reg_param=0.08,
        max_iter=30
    )

    acc = metadata["metrics"]["accuracy"]
    f1 = metadata["metrics"]["f1_score"]
    logger.info(f"Training completed successfully. Test Accuracy: {acc*100:.2f}%, F1: {f1*100:.2f}%")
    
    stop_spark_session()


if __name__ == "__main__":
    main()
