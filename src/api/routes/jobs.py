"""
Jobs and Audit History API Routes
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from src.jobs.repository import job_repo
from src.api.schemas import BatchJobResponse

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=List[BatchJobResponse])
def list_jobs(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100)
):
    """Returns persistent job history from SQLite ledger, newest first."""
    jobs = job_repo.list_jobs(limit=limit)
    if status and status.lower() != "all":
        jobs = [j for j in jobs if j.status.lower() == status.lower()]

    return [
        BatchJobResponse(
            job_id=j.job_id,
            submission_time=j.submission_time,
            start_time=j.start_time,
            completion_time=j.completion_time,
            execution_mode=j.execution_mode,
            dataset_name=j.dataset_name,
            input_records=j.input_records,
            processed_records=j.processed_records,
            failed_records=j.failed_records,
            model_version=j.model_version,
            status=j.status,
            duration_seconds=j.duration_seconds,
            throughput=j.throughput,
            output_location=j.output_location,
            storage_backend=j.storage_backend,
            error_summary=j.error_summary
        ) for j in jobs
    ]


@router.get("/{job_id}", response_model=BatchJobResponse)
def get_job(job_id: str):
    """Fetches forensic details for a specific processing job."""
    j = job_repo.get_job(job_id)
    if not j:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    return BatchJobResponse(
        job_id=j.job_id,
        submission_time=j.submission_time,
        start_time=j.start_time,
        completion_time=j.completion_time,
        execution_mode=j.execution_mode,
        dataset_name=j.dataset_name,
        input_records=j.input_records,
        processed_records=j.processed_records,
        failed_records=j.failed_records,
        model_version=j.model_version,
        status=j.status,
        duration_seconds=j.duration_seconds,
        throughput=j.throughput,
        output_location=j.output_location,
        storage_backend=j.storage_backend,
        error_summary=j.error_summary
    )
