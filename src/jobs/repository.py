"""
NewsPulse AI — Job Audit Repository
Provides durable SQLite persistence for batch processing history and system audit logs.
"""

from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Optional, Dict, Any
import sqlite3
import contextlib
from src.config import settings
from src.logging_config import logger


@dataclass
class JobRecord:
    job_id: str
    submission_time: str
    start_time: Optional[str] = None
    completion_time: Optional[str] = None
    execution_mode: str = "local"
    dataset_name: str = "custom_upload.csv"
    input_records: int = 0
    processed_records: int = 0
    failed_records: int = 0
    model_version: str = "v1.0.0-spark-lr"
    status: str = "queued"  # queued | running | succeeded | failed | cancelled
    duration_seconds: float = 0.0
    throughput: float = 0.0
    output_location: str = ""
    storage_backend: str = "Local Storage"
    error_summary: Optional[str] = None


class JobRepository:
    """Manages SQLite-backed job history and audit queries."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = str(db_path or settings.jobs_db_path)
        self._init_db()

    @contextlib.contextmanager
    def _connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self):
        """Initializes tables and indexes."""
        with self._connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    job_id TEXT PRIMARY KEY,
                    submission_time TEXT NOT NULL,
                    start_time TEXT,
                    completion_time TEXT,
                    execution_mode TEXT NOT NULL,
                    dataset_name TEXT NOT NULL,
                    input_records INTEGER NOT NULL,
                    processed_records INTEGER NOT NULL,
                    failed_records INTEGER NOT NULL,
                    model_version TEXT NOT NULL,
                    status TEXT NOT NULL,
                    duration_seconds REAL NOT NULL,
                    throughput REAL NOT NULL,
                    output_location TEXT,
                    storage_backend TEXT,
                    error_summary TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_submission ON jobs(submission_time DESC)")
            conn.commit()

    def create_job(self, job: JobRecord) -> JobRecord:
        """Inserts a new job record."""
        with self._connection() as conn:
            conn.execute("""
                INSERT INTO jobs (
                    job_id, submission_time, start_time, completion_time,
                    execution_mode, dataset_name, input_records, processed_records,
                    failed_records, model_version, status, duration_seconds,
                    throughput, output_location, storage_backend, error_summary
                ) VALUES (
                    :job_id, :submission_time, :start_time, :completion_time,
                    :execution_mode, :dataset_name, :input_records, :processed_records,
                    :failed_records, :model_version, :status, :duration_seconds,
                    :throughput, :output_location, :storage_backend, :error_summary
                )
            """, asdict(job))
            conn.commit()
        return job

    def update_job(self, job_id: str, updates: Dict[str, Any]) -> Optional[JobRecord]:
        """Updates specific fields of an existing job."""
        if not updates:
            return self.get_job(job_id)

        set_clause = ", ".join([f"{k} = :{k}" for k in updates.keys()])
        params = updates.copy()
        params["job_id"] = job_id

        with self._connection() as conn:
            conn.execute(f"UPDATE jobs SET {set_clause} WHERE job_id = :job_id", params)
            conn.commit()

        return self.get_job(job_id)

    def get_job(self, job_id: str) -> Optional[JobRecord]:
        """Fetches a single job by ID."""
        with self._connection() as conn:
            row = conn.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
            if row:
                return JobRecord(**dict(row))
        return None

    def list_jobs(self, limit: int = 50) -> List[JobRecord]:
        """Returns recent jobs sorted newest to oldest."""
        with self._connection() as conn:
            rows = conn.execute("SELECT * FROM jobs ORDER BY submission_time DESC LIMIT ?", (limit,)).fetchall()
            return [JobRecord(**dict(r)) for r in rows]

    def get_audit_summary(self) -> Dict[str, Any]:
        """Computes aggregate operational statistics across all jobs."""
        with self._connection() as conn:
            row = conn.execute("""
                SELECT 
                    COUNT(*) as total_jobs,
                    SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as succeeded_jobs,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
                    COALESCE(SUM(processed_records), 0) as total_processed_records,
                    COALESCE(SUM(failed_records), 0) as total_rejected_records,
                    COALESCE(AVG(CASE WHEN status = 'succeeded' THEN duration_seconds END), 0.0) as avg_duration,
                    COALESCE(AVG(CASE WHEN status = 'succeeded' AND throughput > 0 THEN throughput END), 0.0) as avg_throughput
                FROM jobs
            """).fetchone()

            return {
                "total_jobs": row["total_jobs"] or 0,
                "succeeded_jobs": row["succeeded_jobs"] or 0,
                "failed_jobs": row["failed_jobs"] or 0,
                "total_processed_records": row["total_processed_records"] or 0,
                "total_rejected_records": row["total_rejected_records"] or 0,
                "avg_duration_sec": round(float(row["avg_duration"]), 2),
                "avg_throughput_art_per_sec": round(float(row["avg_throughput"]), 1)
            }


# Global repository instance
job_repo = JobRepository()
