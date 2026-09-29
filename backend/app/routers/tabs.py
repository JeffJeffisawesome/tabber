import logging
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
from app.schemas import (
    Tab,
    TabCreate,
    TabImportRequest,
    TabImportResponse,
    TabUpdate,
    UGSearchResult,
)
from app.ug_scraper import scrape_ug_url, search_ug_tabs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tabs", tags=["tabs"])


@router.get("/search-ug", response_model=List[UGSearchResult])
async def search_ultimate_guitar(
    q: str = Query(..., min_length=1, description="Song title or artist to search on Ultimate Guitar"),
    limit: Optional[int] = Query(15, ge=1, le=50, description="Max results to return"),
) -> List[UGSearchResult]:
    """Search Ultimate Guitar tabs ranked by popularity (votes * rating^2)."""
    try:
        return search_ug_tabs(query=q, limit=limit or 15)
    except Exception as e:
        logger.error(f"Error searching Ultimate Guitar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search Ultimate Guitar: {str(e)}",
        )


@router.post("/import-url", response_model=TabImportResponse)
async def import_tab_from_url(payload: TabImportRequest) -> TabImportResponse:
    """Scrape and parse an Ultimate Guitar tab, optionally saving directly to database."""
    try:
        parsed_tab = scrape_ug_url(payload.url)
    except Exception as e:
        logger.error(f"Failed to scrape tab from {payload.url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not import tab: {str(e)}",
        )

    saved_tab = None
    if payload.save:
        try:
            saved_tab = create_tab_db(parsed_tab)
        except Exception as e:
            logger.error(f"Failed to save imported tab: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save imported tab to database: {str(e)}",
            )

    return TabImportResponse(tab=parsed_tab, saved_tab=saved_tab)


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
