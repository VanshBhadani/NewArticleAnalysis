"""
NewsPulse AI — Authoritative Active Dataset Service
Provides explicit, reliable dataset selection and validation.
Prevents temporary test-run prediction files or corrupted artifacts from replacing
legitimate production/demonstration datasets.
"""

from pathlib import Path
from typing import Optional, List
import pandas as pd

from src.config import settings
from src.logging_config import logger
from src.data.ingestion import create_sample_batch_csv
from src.data.validation import validate_and_preprocess_dataframe
from src.jobs.manager import job_manager
from src.jobs.repository import job_repo

REQUIRED_COLUMNS = {"article_id", "title", "combined_text", "predicted_category", "confidence"}


class DatasetService:
    """Manages active dataset resolution and prevents unverified artifact contamination."""

    def __init__(self):
        self._explicit_active_file: Optional[Path] = None

    def set_explicit_dataset(self, file_path: Path):
        """Allows explicitly pinning an active dataset file."""
        if not file_path.exists():
            raise FileNotFoundError(f"Dataset file {file_path} does not exist.")
        df = pd.read_csv(file_path)
        if not self._is_valid_dataset(df):
            raise ValueError(f"File {file_path} does not meet schema requirements.")
        self._explicit_active_file = file_path

    def clear_explicit_dataset(self):
        self._explicit_active_file = None

    def _is_valid_dataset(self, df: pd.DataFrame) -> bool:
        """Verifies dataset has required columns and non-trivial record count."""
        if df is None or df.empty or len(df) < 5:
            return False
        return REQUIRED_COLUMNS.issubset(set(df.columns))

    def get_active_dataframe(self) -> pd.DataFrame:
        """
        Retrieves the active verified predictions DataFrame.
        Guarantees that temporary test-run files (e.g. predictions_test_run_*.csv)
        or unverified scraps cannot hijack the active newsroom dataset.
        """
        # 1. If explicitly set, use that
        if self._explicit_active_file and self._explicit_active_file.exists():
            try:
                df = pd.read_csv(self._explicit_active_file)
                if self._is_valid_dataset(df):
                    return df
            except Exception as e:
                logger.warning(f"Failed to read explicitly set dataset: {e}")

        # 2. Check succeeded jobs recorded in SQLite repository
        try:
            succeeded_jobs = job_repo.list_jobs(status="succeeded", limit=20)
            for job in succeeded_jobs:
                if job.output_location:
                    loc_path = Path(job.output_location)
                    if loc_path.exists() and loc_path.parent.resolve() == settings.processed_data_dir.resolve():
                        try:
                            df = pd.read_csv(loc_path)
                            if self._is_valid_dataset(df):
                                return df
                        except Exception:
                            continue
        except Exception as e:
            logger.debug(f"Job repo lookup during dataset resolution: {e}")

        # 3. Scan processed directory, strictly filtering out test-run artifacts
        processed_files = list(settings.processed_data_dir.glob("predictions_*.csv"))
        # Exclude known test run patterns
        legitimate_files = [
            f for f in processed_files
            if not f.name.startswith("predictions_test_run")
            and not f.name.startswith("predictions_test_")
            and f.stat().st_size > 150  # Must be larger than minimal scrap
        ]

        if legitimate_files:
            latest_file = max(legitimate_files, key=lambda f: f.stat().st_mtime)
            try:
                df = pd.read_csv(latest_file)
                if self._is_valid_dataset(df):
                    return df
            except Exception as e:
                logger.warning(f"Failed to read latest legitimate prediction file {latest_file}: {e}")

        # 4. Bootstrap from sample news batch if no legitimate batch exists
        logger.info("No valid production predictions found. Bootstrapping baseline batch...")
        sample_path = settings.data_dir / "sample_news_batch.csv"
        if not sample_path.exists():
            create_sample_batch_csv(sample_path)

        sample_raw = pd.read_csv(sample_path)
        acc, _, _ = validate_and_preprocess_dataframe(sample_raw)
        _, enriched = job_manager.submit_batch_job(acc, "sample_news_batch.csv")
        return enriched


dataset_service = DatasetService()
