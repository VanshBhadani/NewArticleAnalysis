"""
NewsPulse AI — Job Execution Manager
Coordinates end-to-end batch processing workflows, Spark execution, and storage dispatch.
"""

from datetime import datetime
import time
import uuid
from typing import Dict, Any, Tuple, Optional
import pandas as pd

from src.config import settings
from src.logging_config import logger
from src.spark.inference import predict_batch_articles
from src.storage.s3 import storage
from src.jobs.repository import job_repo, JobRecord


class BatchJobManager:
    """Manages batch job lifecycle, Spark prediction execution, and audit trail."""

    def submit_batch_job(
        self,
        accepted_df: pd.DataFrame,
        dataset_name: str = "batch_input.csv",
        rejected_count: int = 0
    ) -> Tuple[JobRecord, pd.DataFrame]:
        """
        Submits and executes a real Spark batch prediction job.
        Records every transition (queued -> running -> succeeded/failed).
        """
        job_id = f"job-{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat() + "Z"
        input_count = len(accepted_df) + rejected_count

        job = JobRecord(
            job_id=job_id,
            submission_time=now,
            execution_mode="aws-ec2" if settings.execution_mode == "aws" else "local",
            dataset_name=dataset_name,
            input_records=input_count,
            processed_records=0,
            failed_records=rejected_count,
            model_version=settings.active_model_version,
            status="queued"
        )
        job_repo.create_job(job)
        logger.info(f"Batch job {job_id} queued with {len(accepted_df)} valid records.")

        # Transition to running
        start_time_sec = time.time()
        start_time_iso = datetime.utcnow().isoformat() + "Z"
        job_repo.update_job(job_id, {
            "status": "running",
            "start_time": start_time_iso
        })

        try:
            # Execute real Spark ML inference
            enriched_df, stats = predict_batch_articles(accepted_df)
            
            # Persist output via storage adapter (S3 in cloud mode, local in local mode)
            out_meta = storage.save_predictions_csv(
                df=enriched_df,
                job_id=job_id,
                filename=f"predictions_{job_id}.csv"
            )

            completion_time_iso = datetime.utcnow().isoformat() + "Z"
            duration = stats.get("processing_time_seconds", round(time.time() - start_time_sec, 2))
            throughput = stats.get("throughput_articles_per_sec", 0.0)

            updated_job = job_repo.update_job(job_id, {
                "status": "succeeded",
                "completion_time": completion_time_iso,
                "processed_records": len(enriched_df),
                "duration_seconds": duration,
                "throughput": throughput,
                "output_location": out_meta.get("location", ""),
                "storage_backend": out_meta.get("storage_backend", "Local Storage"),
                "error_summary": None
            })

            # Save full job audit metadata
            storage.save_job_metadata({
                "job_id": job_id,
                "dataset_name": dataset_name,
                "submission_time": now,
                "start_time": start_time_iso,
                "completion_time": completion_time_iso,
                "status": "succeeded",
                "input_records": input_count,
                "processed_records": len(enriched_df),
                "rejected_records": rejected_count,
                "duration_seconds": duration,
                "throughput": throughput,
                "storage": out_meta,
                "stats": stats
            })

            logger.info(f"Job {job_id} succeeded. Output: {out_meta.get('location')}")
            return updated_job, enriched_df

        except Exception as e:
            logger.error(f"Batch job {job_id} failed: {e}")
            completion_time_iso = datetime.utcnow().isoformat() + "Z"
            duration = round(time.time() - start_time_sec, 2)
            
            failed_job = job_repo.update_job(job_id, {
                "status": "failed",
                "completion_time": completion_time_iso,
                "duration_seconds": duration,
                "error_summary": str(e)
            })
            raise RuntimeError(f"Spark batch execution failed: {e}") from e


job_manager = BatchJobManager()
