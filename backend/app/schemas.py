"""Pydantic validation models for guitar tabs and system health."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """System health status response schema."""
    status: str = Field(..., description="Service status indicator, typically 'ok'")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(..., description="Current server UTC timestamp")


class TabBase(BaseModel):
    """Base schema for a guitar tablature."""
    title: str = Field(..., min_length=1, max_length=150, description="Song title")
    artist: str = Field(..., min_length=1, max_length=150, description="Artist or band name")
    tuning: str = Field(default="Standard (E A D G B E)", max_length=50, description="Guitar tuning")
    capo: int = Field(default=0, ge=0, le=12, description="Capo fret position (0 = no capo)")
    difficulty: str = Field(default="Intermediate", max_length=20, description="Beginner, Intermediate, or Advanced")
    content: str = Field(..., min_length=1, description="Monospaced ASCII guitar tab and/or chord text")
    is_favorite: bool = Field(default=False, description="Whether marked as favorite")


class TabCreate(TabBase):
    """Payload schema for creating a new guitar tab."""
    pass


class TabUpdate(BaseModel):
    """Payload schema for updating an existing guitar tab."""
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    artist: Optional[str] = Field(None, min_length=1, max_length=150)
    tuning: Optional[str] = Field(None, max_length=50)
    capo: Optional[int] = Field(None, ge=0, le=12)
    difficulty: Optional[str] = Field(None, max_length=20)
    content: Optional[str] = Field(None, min_length=1)
    is_favorite: Optional[bool] = None


class Tab(TabBase):
    """Full guitar tab returned to clients."""
    id: int = Field(..., description="Unique integer ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True
