"""
NewsPulse AI — Central Configuration Module
Provides typed configuration, environment detection, and safe credential handling.
"""

from dataclasses import dataclass, field
from pathlib import Path
import os
import sys

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

# AG News canonical label mappings (0-indexed)
CATEGORY_MAP = {
    0: "World",
    1: "Sports",
    2: "Business",
    3: "Sci/Tech"
}

CATEGORY_TO_ID = {v: k for k, v in CATEGORY_MAP.items()}

# Editorial badge colors (Restrained, accessible palette)
CATEGORY_COLORS = {
    "World": "#1E3A8A",      # Deep Navy
    "Sports": "#047857",     # Forest Emerald
    "Business": "#B45309",   # Warm Amber / Russet
    "Sci/Tech": "#4338CA"    # Deep Indigo
}

CATEGORY_DESCRIPTIONS = {
    "World": "International politics, diplomacy, global conflicts, and foreign affairs.",
    "Sports": "Athletics, competitive tournaments, team leagues, and sporting events.",
    "Business": "Markets, corporate finance, macroeconomic policy, industry developments.",
    "Sci/Tech": "Scientific research, computing hardware, AI, biotechnology, and cybersecurity."
}


@dataclass
class Settings:
    # Environment & Execution Mode
    env: str = os.getenv("NEWSPULSE_ENV", "local")
    execution_mode: str = os.getenv("EXECUTION_MODE", "local")
    app_version: str = "1.0.0"

    # AWS S3 Settings
    aws_region: str = os.getenv("AWS_DEFAULT_REGION", os.getenv("AWS_REGION", "us-east-1"))
    aws_s3_bucket: str = os.getenv("AWS_S3_BUCKET", "newspulse-ai-storage")
    aws_access_key_id: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret_access_key: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")

    # Apache Spark Settings
    spark_app_name: str = os.getenv("SPARK_APP_NAME", "NewsPulse-AI-Engine")
    spark_master: str = os.getenv("SPARK_MASTER", "local[*]")
    spark_driver_memory: str = os.getenv("SPARK_DRIVER_MEMORY", "2g")
    spark_log_level: str = os.getenv("SPARK_LOG_LEVEL", "WARN")

    # Local Directory Paths
    base_dir: Path = BASE_DIR
    data_dir: Path = field(default_factory=lambda: BASE_DIR / "data")
    raw_data_dir: Path = field(default_factory=lambda: BASE_DIR / "data" / "raw")
    processed_data_dir: Path = field(default_factory=lambda: BASE_DIR / "data" / "processed")
    models_dir: Path = field(default_factory=lambda: BASE_DIR / "models")
    jobs_db_path: Path = field(default_factory=lambda: BASE_DIR / "data" / "jobs_audit.db")

    # Active Model Version
    active_model_version: str = os.getenv("ACTIVE_MODEL_VERSION", "v1.0.0-spark-lr")

    def __post_init__(self):
        # Ensure directories exist locally
        for d in [self.data_dir, self.raw_data_dir, self.processed_data_dir, self.models_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def is_aws_configured(self) -> bool:
        """Checks if AWS credentials or instance profile indicators are present."""
        if self.aws_access_key_id and self.aws_secret_access_key:
            return True
        # Check standard boto3 session credentials
        try:
            import boto3
            session = boto3.Session(region_name=self.aws_region)
            creds = session.get_credentials()
            return creds is not None
        except Exception:
            return False

    def get_sanitized_config(self) -> dict:
        """Returns non-sensitive configuration parameters for UI inspection."""
        return {
            "Application Version": self.app_version,
            "Environment": self.env,
            "Execution Mode": self.execution_mode,
            "Spark Master": self.spark_master,
            "Spark Driver Memory": self.spark_driver_memory,
            "Spark Log Level": self.spark_log_level,
            "AWS Region": self.aws_region,
            "AWS S3 Bucket": self.aws_s3_bucket,
            "AWS Auth Status": "Configured (Keys/IAM)" if self.is_aws_configured() else "Local Fallback (Unconfigured)",
            "Active Model Version": self.active_model_version,
            "Data Directory": str(self.data_dir),
            "Models Directory": str(self.models_dir),
            "Jobs Audit DB": str(self.jobs_db_path)
        }


# Global singleton settings instance
settings = Settings()
