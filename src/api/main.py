"""
NewsPulse AI — FastAPI Application Entry Point
Exposes versioned REST APIs and mounts production static assets.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from src.config import settings
from src.logging_config import logger
from src.spark.session import stop_spark_session

# Import Route Modules
from src.api.routes import (
    health,
    overview,
    classify,
    batches,
    articles,
    jobs,
    analytics,
    model,
    infrastructure,
    categories,
    galaxy,
    editorial
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("NewsPulse AI FastAPI backend starting up...")
    yield
    logger.info("NewsPulse AI FastAPI backend shutting down...")
    stop_spark_session()


app = FastAPI(
    title="NewsPulse AI — Editorial Intelligence API",
    description="Cloud-native news classification, distributed Spark ML batch processing, and analytical telemetry API.",
    version=settings.app_version,
    lifespan=lifespan
)

# CORS Configuration for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api/v1
API_PREFIX = "/api/v1"
app.include_router(health.router, prefix=API_PREFIX)
app.include_router(overview.router, prefix=API_PREFIX)
app.include_router(classify.router, prefix=API_PREFIX)
app.include_router(batches.router, prefix=API_PREFIX)
app.include_router(articles.router, prefix=API_PREFIX)
app.include_router(jobs.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(model.router, prefix=API_PREFIX)
app.include_router(infrastructure.router, prefix=API_PREFIX)
app.include_router(categories.router, prefix=API_PREFIX)
app.include_router(galaxy.router, prefix=API_PREFIX)
app.include_router(editorial.router, prefix=API_PREFIX)

# Serve built frontend static files if distribution exists
FRONTEND_DIST = settings.base_dir / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
