"""Health and status check router."""

from datetime import datetime, timezone
from fastapi import APIRouter
from app.db import get_database_engine
from app.schemas import HealthResponse

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    """Return backend health, readiness, and active database provider."""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        database=get_database_engine(),
        timestamp=datetime.now(timezone.utc),
    )
