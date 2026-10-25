"""
Infrastructure Diagnostics & Cloud Settings API Routes
"""

import sys
import platform
from typing import Dict, Any
from fastapi import APIRouter
from src.config import settings
from src.spark.session import get_spark_diagnostics
from src.storage.s3 import storage
from src.api.schemas import InfrastructureResponse

router = APIRouter(prefix="/infrastructure", tags=["Infrastructure"])


@router.get("", response_model=InfrastructureResponse)
def get_infrastructure_diagnostics():
    """Returns runtime diagnostics across Spark, OS, and cloud persistence."""
    spark_info = get_spark_diagnostics()
    storage_diag = storage.test_connectivity()
    sanitized = settings.get_sanitized_config()

    return InfrastructureResponse(
        execution_mode=settings.execution_mode,
        spark_diagnostics=spark_info,
        storage_diagnostics=storage_diag,
        sanitized_config=sanitized,
        python_version=sys.version.split(" ")[0],
        system_platform=f"{platform.system()} {platform.release()} ({platform.machine()})"
    )


@router.post("/ping-s3", response_model=Dict[str, Any])
def ping_s3():
    """Executes a real Boto3 head_bucket ping against the configured Amazon S3 endpoint."""
    return storage.test_connectivity()
