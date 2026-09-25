"""Application configuration and environment settings."""

import os
from pathlib import Path
from typing import List, Optional

# Load environment variables from .env if present
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.is_file():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
except ImportError:
    pass

PROJECT_NAME: str = "Tabber - Guitar Tab API"
API_V1_STR: str = "/api"

# Supabase Credentials
SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY")


def is_supabase_configured() -> bool:
    """Return True if both Supabase URL and Key are configured."""
    return bool(SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL.startswith("http"))


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
