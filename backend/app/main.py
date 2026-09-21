"""FastAPI application entrypoint for Tabber Guitar Tab Manager."""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import ALLOWED_ORIGINS, API_V1_STR, PROJECT_NAME
from app.db import init_db
from app.routers import health, tabs


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize SQLite database and seed starter guitar tabs on startup."""
    init_db()
    yield


app = FastAPI(
    title="Tabber - Guitar Tab API",
    description="Backend API for finding, storing, and practicing guitar tabs",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers under /api prefix
app.include_router(health.router, prefix=API_V1_STR)
app.include_router(tabs.router, prefix=API_V1_STR)


@app.get("/", tags=["root"])
async def root_status():
    """Root info endpoint."""
    return {
        "message": "Welcome to Tabber - Guitar Tab Manager & Finder API",
        "docs": "/docs",
        "health": f"{API_V1_STR}/health",
        "tabs": f"{API_V1_STR}/tabs",
    }


# Optional: In production, serve the built frontend SPA from frontend/dist
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")
