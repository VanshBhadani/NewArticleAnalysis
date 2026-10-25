"""
Health and System Status Route
"""

from fastapi import APIRouter
from src.config import settings
from src.spark.session import get_spark_diagnostics
from src.api.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health_status():
    spark_info = get_spark_diagnostics()
    is_cloud = settings.execution_mode == "aws" and settings.is_aws_configured()

    return HealthResponse(
        status="healthy",
        app_name=settings.spark_app_name,
        version=settings.app_version,
        environment=settings.env,
        execution_mode=settings.execution_mode,
        spark_version=str(spark_info.get("spark_version", "4.2.0")),
        storage_mode="Amazon S3" if is_cloud else "Local Fallback"
    )
