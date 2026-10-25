"""
Batch Processing API Routes
Handles CSV upload, schema detection, quality audit, and Spark batch job submission.
"""

import io
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
import pandas as pd

from src.config import settings
from src.data.validation import validate_and_preprocess_dataframe, auto_detect_columns
from src.data.ingestion import create_sample_batch_csv
from src.jobs.manager import job_manager
from src.api.schemas import ValidationSummaryResponse, BatchJobResponse

router = APIRouter(prefix="/batches", tags=["Batches"])


@router.get("/template")
def get_sample_template():
    """Returns downloadable CSV template for news batch processing."""
    sample_path = settings.data_dir / "sample_news_batch.csv"
    if not sample_path.exists():
        create_sample_batch_csv(sample_path)
    return FileResponse(
        path=str(sample_path),
        filename="sample_news_batch.csv",
        media_type="text/csv"
    )


@router.post("/validate", response_model=ValidationSummaryResponse)
async def validate_csv(file: UploadFile = File(...)):
    """Parses uploaded CSV, auto-detects schema, cleans records, and returns quality breakdown."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 50MB limit.")

    try:
        raw_df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if raw_df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")

    acc_df, rej_df, summary = validate_and_preprocess_dataframe(raw_df, deduplicate=True)

    preview = acc_df[["article_id", "title", "combined_text"]].head(5).to_dict(orient="records")

    return ValidationSummaryResponse(
        total_records=summary.total_records,
        accepted_records=summary.accepted_records,
        rejected_records=summary.rejected_records,
        duplicate_records=summary.duplicate_records,
        detected_columns=summary.detected_columns,
        column_mapping=summary.column_mapping,
        rejection_reasons=summary.rejection_reasons,
        preview_records=preview
    )


@router.post("/submit", response_model=BatchJobResponse)
async def submit_batch(
    file: UploadFile = File(...),
    deduplicate: bool = Form(True)
):
    """Submits uploaded news archive to the Apache Spark MLlib distributed processing pipeline."""
    content = await file.read()
    try:
        raw_df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {str(e)}")

    acc_df, rej_df, summary = validate_and_preprocess_dataframe(
        raw_df,
        deduplicate=deduplicate
    )

    if acc_df.empty:
        raise HTTPException(status_code=400, detail="No valid article records found to process.")

    try:
        job_record, results_df = job_manager.submit_batch_job(
            accepted_df=acc_df,
            dataset_name=file.filename,
            rejected_count=summary.rejected_records
        )
        return BatchJobResponse(
            job_id=job_record.job_id,
            submission_time=job_record.submission_time,
            start_time=job_record.start_time,
            completion_time=job_record.completion_time,
            execution_mode=job_record.execution_mode,
            dataset_name=job_record.dataset_name,
            input_records=job_record.input_records,
            processed_records=job_record.processed_records,
            failed_records=job_record.failed_records,
            model_version=job_record.model_version,
            status=job_record.status,
            duration_seconds=job_record.duration_seconds,
            throughput=job_record.throughput,
            output_location=job_record.output_location,
            storage_backend=job_record.storage_backend,
            error_summary=job_record.error_summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Spark batch job execution failed: {str(e)}")
