"""
NewsPulse AI — Cloud Storage (Amazon S3) & Local Fallback Adapter
Provides robust object persistence, diagnostics, and transparent mode handling via Boto3.
"""

from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import json
import time
import pandas as pd
from botocore.exceptions import ClientError, NoCredentialsError, EndpointConnectionError
import boto3

from src.config import settings
from src.logging_config import logger


class S3StorageAdapter:
    """
    Unified storage manager handling S3 operations with local development fallback.
    Never misrepresents local filesystem writes as AWS cloud operations.
    """

    def __init__(self):
        self.bucket_name = settings.aws_s3_bucket
        self.region = settings.aws_region
        self.is_configured = settings.is_aws_configured()
        self._s3_client = None

    def _get_client(self):
        """Initializes or returns cached boto3 S3 client."""
        if self._s3_client is not None:
            return self._s3_client

        if settings.aws_access_key_id and settings.aws_secret_access_key:
            self._s3_client = boto3.client(
                "s3",
                region_name=self.region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key
            )
        else:
            # Resolves from IAM role / standard credential chain
            self._s3_client = boto3.client("s3", region_name=self.region)
        return self._s3_client

    def test_connectivity(self) -> Dict[str, Any]:
        """
        Executes a real diagnostic ping against AWS S3.
        Reports latency, bucket existence, or specific failure reasons.
        """
        start = time.time()
        if not self.is_configured:
            return {
                "status": "UNCONFIGURED",
                "message": "AWS credentials not detected. System operating in local development mode.",
                "bucket": self.bucket_name,
                "region": self.region,
                "latency_ms": 0.0,
                "is_cloud_active": False
            }

        try:
            client = self._get_client()
            # Test bucket accessibility using head_bucket
            client.head_bucket(Bucket=self.bucket_name)
            latency = round((time.time() - start) * 1000, 2)
            return {
                "status": "VERIFIED",
                "message": f"Successfully connected to Amazon S3 bucket '{self.bucket_name}' in {self.region}.",
                "bucket": self.bucket_name,
                "region": self.region,
                "latency_ms": latency,
                "is_cloud_active": True
            }
        except NoCredentialsError:
            return {
                "status": "AUTH_ERROR",
                "message": "AWS credentials could not be found by the credential provider chain.",
                "bucket": self.bucket_name,
                "region": self.region,
                "latency_ms": round((time.time() - start) * 1000, 2),
                "is_cloud_active": False
            }
        except ClientError as e:
            err_code = e.response.get("Error", {}).get("Code", "Unknown")
            err_msg = e.response.get("Error", {}).get("Message", str(e))
            return {
                "status": f"CLIENT_ERROR_{err_code}",
                "message": f"AWS S3 returned {err_code}: {err_msg}",
                "bucket": self.bucket_name,
                "region": self.region,
                "latency_ms": round((time.time() - start) * 1000, 2),
                "is_cloud_active": False
            }
        except EndpointConnectionError:
            return {
                "status": "NETWORK_ERROR",
                "message": f"Network error: Unable to reach AWS S3 endpoint in {self.region}.",
                "bucket": self.bucket_name,
                "region": self.region,
                "latency_ms": round((time.time() - start) * 1000, 2),
                "is_cloud_active": False
            }
        except Exception as e:
            return {
                "status": "ERROR",
                "message": f"Unexpected error during S3 connectivity test: {str(e)}",
                "bucket": self.bucket_name,
                "region": self.region,
                "latency_ms": round((time.time() - start) * 1000, 2),
                "is_cloud_active": False
            }

    def save_predictions_csv(
        self,
        df: pd.DataFrame,
        job_id: str,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Persists batch prediction output to S3 (if cloud active) or local processed dir.
        Always returns accurate metadata showing exact storage location.
        """
        filename = filename or f"predictions_{job_id}.csv"
        s3_key = f"predictions/{filename}"
        local_path = settings.processed_data_dir / filename

        # Always save local copy for immediate web download & inspection
        df.to_csv(local_path, index=False)

        if settings.execution_mode == "aws" and self.is_configured:
            try:
                client = self._get_client()
                client.upload_file(str(local_path), self.bucket_name, s3_key)
                s3_uri = f"s3://{self.bucket_name}/{s3_key}"
                logger.info(f"Persisted predictions to Amazon S3: {s3_uri}")
                return {
                    "storage_backend": "Amazon S3",
                    "location": s3_uri,
                    "s3_bucket": self.bucket_name,
                    "s3_key": s3_key,
                    "local_path": str(local_path),
                    "bytes": local_path.stat().st_size
                }
            except Exception as e:
                logger.warning(f"S3 upload failed ({e}); falling back to local persistence.")
                return {
                    "storage_backend": "Local Storage (S3 Upload Failed)",
                    "location": str(local_path),
                    "local_path": str(local_path),
                    "s3_error": str(e),
                    "bytes": local_path.stat().st_size
                }

        # Local mode persistence
        return {
            "storage_backend": "Local Storage (Development Mode)",
            "location": str(local_path),
            "local_path": str(local_path),
            "bytes": local_path.stat().st_size
        }

    def save_job_metadata(self, job_metadata: Dict[str, Any]) -> str:
        """Saves job audit record as JSON."""
        job_id = job_metadata.get("job_id", "unknown")
        filename = f"job_{job_id}.json"
        local_path = settings.data_dir / "jobs" / filename
        local_path.parent.mkdir(parents=True, exist_ok=True)

        with open(local_path, "w", encoding="utf-8") as f:
            json.dump(job_metadata, f, indent=2)

        if settings.execution_mode == "aws" and self.is_configured:
            try:
                s3_key = f"job-metadata/{filename}"
                client = self._get_client()
                client.upload_file(str(local_path), self.bucket_name, s3_key)
                return f"s3://{self.bucket_name}/{s3_key}"
            except Exception as e:
                logger.warning(f"Could not upload job metadata to S3: {e}")

        return str(local_path)


# Global storage adapter instance
storage = S3StorageAdapter()
