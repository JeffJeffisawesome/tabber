"""Application configuration and environment settings."""

import os
from typing import List

PROJECT_NAME: str = "Tabber API"
API_V1_STR: str = "/api"

# Allowed CORS origins for frontend development
ALLOWED_ORIGINS: List[str] = [
    "http://localhost:5173",  # Default Vite dev server port
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Additional origins from environment variable if configured
if env_origins := os.getenv("ALLOWED_ORIGINS"):
    ALLOWED_ORIGINS.extend([origin.strip() for origin in env_origins.split(",")])

