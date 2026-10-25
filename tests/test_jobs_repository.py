"""
Unit Tests — SQLite Job Repository and State Transitions
"""

import tempfile
from pathlib import Path
import pytest
from src.jobs.repository import JobRepository, JobRecord


@pytest.fixture
def temp_repo():
    import gc
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_jobs.db"
        repo = JobRepository(str(db_path))
        yield repo
        del repo
        gc.collect()


def test_job_lifecycle(temp_repo):
    # 1. Create job
    job = JobRecord(
        job_id="test-job-001",
        submission_time="2026-10-25T12:00:00Z",
        execution_mode="local",
        dataset_name="reuters_sample.csv",
        input_records=100,
        processed_records=0,
        failed_records=5,
        model_version="v1.0.0-spark-lr",
        status="queued"
    )
    temp_repo.create_job(job)

    fetched = temp_repo.get_job("test-job-001")
    assert fetched is not None
    assert fetched.status == "queued"
    assert fetched.input_records == 100

    # 2. Update to running
    temp_repo.update_job("test-job-001", {
        "status": "running",
        "start_time": "2026-10-25T12:00:01Z"
    })
    running_job = temp_repo.get_job("test-job-001")
    assert running_job.status == "running"

    # 3. Update to succeeded
    temp_repo.update_job("test-job-001", {
        "status": "succeeded",
        "completion_time": "2026-10-25T12:00:15Z",
        "processed_records": 95,
        "duration_seconds": 14.2,
        "throughput": 6.7,
        "output_location": "data/processed/predictions_001.csv"
    })
    done_job = temp_repo.get_job("test-job-001")
    assert done_job.status == "succeeded"
    assert done_job.processed_records == 95

    # 4. Audit summary
    summary = temp_repo.get_audit_summary()
    assert summary["total_jobs"] == 1
    assert summary["succeeded_jobs"] == 1
    assert summary["failed_jobs"] == 0
    assert summary["total_processed_records"] == 95
    assert summary["avg_duration_sec"] == 14.2
