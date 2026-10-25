"""
NewsPulse AI — Standalone Pipeline CLI Runner
Executes an end-to-end Spark ML batch inference and storage persistence pipeline via CLI.
"""

import sys
import argparse
from pathlib import Path
import pandas as pd

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.logging_config import logger
from src.data.validation import validate_and_preprocess_dataframe
from src.jobs.manager import job_manager
from src.jobs.repository import job_repo
from src.spark.session import stop_spark_session


def run_pipeline(csv_path: str, dataset_name: str = "batch_input.csv"):
    logger.info(f"Starting standalone NewsPulse AI pipeline on: {csv_path}")
    
    file_path = Path(csv_path)
    if not file_path.exists():
        logger.error(f"Input file does not exist: {file_path}")
        sys.exit(1)

    raw_df = pd.read_csv(file_path)
    logger.info(f"Loaded {len(raw_df)} raw records from {file_path.name}")

    # Validate and clean
    acc_df, rej_df, val_summary = validate_and_preprocess_dataframe(raw_df, deduplicate=True)
    logger.info(
        f"Validation complete: {val_summary.accepted_records} accepted, "
        f"{val_summary.rejected_records} rejected ({val_summary.duplicate_records} duplicates)."
    )

    if acc_df.empty:
        logger.error("No valid records found to process.")
        sys.exit(1)

    # Submit batch processing job
    job, enriched = job_manager.submit_batch_job(
        accepted_df=acc_df,
        dataset_name=dataset_name,
        rejected_count=val_summary.rejected_records
    )

    logger.info(
        f"Pipeline succeeded! Job ID: {job.job_id} | Status: {job.status} | "
        f"Duration: {job.duration_seconds}s | Throughput: {job.throughput} art/s"
    )
    logger.info(f"Persisted Output Location: {job.output_location} ({job.storage_backend})")

    # Stop Spark context cleanly
    stop_spark_session()
    return job, enriched


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run NewsPulse AI Spark Batch Pipeline")
    parser.add_argument("--input", default="data/sample_news_batch.csv", help="Path to news CSV file")
    parser.add_argument("--name", default="sample_news_batch.csv", help="Dataset display name")
    args = parser.parse_args()

    run_pipeline(args.input, args.name)
