"""Guitar tabs API router with Supabase and SQLite persistence."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.db import (
    create_tab_db,
    delete_tab_db,
    get_tab_db,
    list_tabs_db,
    toggle_favorite_db,
    update_tab_db,
)
from app.schemas import Tab, TabCreate, TabUpdate

router = APIRouter(prefix="/tabs", tags=["tabs"])


@router.get("", response_model=List[Tab])
async def list_tabs(
    q: Optional[str] = Query(None, description="Search query matching title, artist, or content"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    favorite: Optional[bool] = Query(None, description="Filter favorites only"),
    tuning: Optional[str] = Query(None, description="Filter by tuning"),
) -> List[Tab]:
    """Search and filter saved guitar tabs."""
    return list_tabs_db(q=q, difficulty=difficulty, favorite=favorite, tuning=tuning)


@router.get("/{tab_id}", response_model=Tab)
async def get_tab(tab_id: int) -> Tab:
    """Retrieve a specific guitar tab by ID."""
    tab = get_tab_db(tab_id)
    if not tab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guitar tab with ID {tab_id} not found",
        )
    return tab


@router.post("", response_model=Tab, status_code=status.HTTP_201_CREATED)
async def create_tab(payload: TabCreate) -> Tab:
    """Save a new guitar tab to the library."""
    return create_tab_db(payload)


@router.put("/{tab_id}", response_model=Tab)
async def update_tab(tab_id: int, payload: TabUpdate) -> Tab:
    """Update an existing guitar tab."""
    updated = update_tab_db(tab_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guitar tab with ID {tab_id} not found",
        )
    return updated


@router.patch("/{tab_id}/favorite", response_model=Tab)
async def toggle_favorite(tab_id: int) -> Tab:
    """Toggle the favorite status of a guitar tab."""
    updated = toggle_favorite_db(tab_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guitar tab with ID {tab_id} not found",
        )
    return updated


@router.delete("/{tab_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tab(tab_id: int) -> None:
    """Delete a guitar tab from the library."""
    success = delete_tab_db(tab_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guitar tab with ID {tab_id} not found",
        )
