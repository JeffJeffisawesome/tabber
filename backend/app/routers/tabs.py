"""Guitar tabs API router with SQLite persistence and search."""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.db import get_db_connection
from app.schemas import Tab, TabCreate, TabUpdate

router = APIRouter(prefix="/tabs", tags=["tabs"])


def row_to_tab(row) -> Tab:
    """Helper to convert a sqlite3.Row to a Tab Pydantic model."""
    return Tab(
        id=row["id"],
        title=row["title"],
        artist=row["artist"],
        tuning=row["tuning"],
        capo=row["capo"],
        difficulty=row["difficulty"],
        content=row["content"],
        is_favorite=bool(row["is_favorite"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("", response_model=List[Tab])
async def list_tabs(
    q: Optional[str] = Query(None, description="Search query matching title, artist, or content"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    favorite: Optional[bool] = Query(None, description="Filter favorites only"),
    tuning: Optional[str] = Query(None, description="Filter by tuning"),
) -> List[Tab]:
    """Search and filter saved guitar tabs."""
    conditions = []
    params = []

    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        conditions.append("(title LIKE ? OR artist LIKE ? OR content LIKE ?)")
        params.extend([search_pattern, search_pattern, search_pattern])

    if difficulty and difficulty != "All":
        conditions.append("difficulty = ?")
        params.append(difficulty)

    if favorite is not None:
        conditions.append("is_favorite = ?")
        params.append(1 if favorite else 0)

    if tuning and tuning != "All":
        conditions.append("tuning = ?")
        params.append(tuning)

    query = "SELECT * FROM tabs"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY is_favorite DESC, updated_at DESC"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [row_to_tab(row) for row in rows]


@router.get("/{tab_id}", response_model=Tab)
async def get_tab(tab_id: int) -> Tab:
    """Retrieve a specific guitar tab by ID."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tabs WHERE id = ?;", (tab_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Guitar tab with ID {tab_id} not found",
            )
        return row_to_tab(row)


@router.post("", response_model=Tab, status_code=status.HTTP_201_CREATED)
async def create_tab(payload: TabCreate) -> Tab:
    """Save a new guitar tab to the library."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO tabs (title, artist, tuning, capo, difficulty, content, is_favorite, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                payload.title.strip(),
                payload.artist.strip(),
                payload.tuning,
                payload.capo,
                payload.difficulty,
                payload.content,
                1 if payload.is_favorite else 0,
                now,
                now,
            ),
        )
        conn.commit()
        tab_id = cursor.lastrowid

        cursor.execute("SELECT * FROM tabs WHERE id = ?;", (tab_id,))
        new_row = cursor.fetchone()
        return row_to_tab(new_row)


@router.put("/{tab_id}", response_model=Tab)
async def update_tab(tab_id: int, payload: TabUpdate) -> Tab:
    """Update an existing guitar tab."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tabs WHERE id = ?;", (tab_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Guitar tab with ID {tab_id} not found",
            )

        # Merge updates with existing values
        title = payload.title.strip() if payload.title is not None else existing["title"]
        artist = payload.artist.strip() if payload.artist is not None else existing["artist"]
        tuning = payload.tuning if payload.tuning is not None else existing["tuning"]
        capo = payload.capo if payload.capo is not None else existing["capo"]
        difficulty = payload.difficulty if payload.difficulty is not None else existing["difficulty"]
        content = payload.content if payload.content is not None else existing["content"]
        is_favorite = (
            (1 if payload.is_favorite else 0)
            if payload.is_favorite is not None
            else existing["is_favorite"]
        )
        updated_at = datetime.now(timezone.utc).isoformat()

        cursor.execute(
            """
            UPDATE tabs
            SET title = ?, artist = ?, tuning = ?, capo = ?, difficulty = ?, content = ?, is_favorite = ?, updated_at = ?
            WHERE id = ?;
            """,
            (title, artist, tuning, capo, difficulty, content, is_favorite, updated_at, tab_id),
        )
        conn.commit()

        cursor.execute("SELECT * FROM tabs WHERE id = ?;", (tab_id,))
        updated_row = cursor.fetchone()
        return row_to_tab(updated_row)


@router.patch("/{tab_id}/favorite", response_model=Tab)
async def toggle_favorite(tab_id: int) -> Tab:
    """Toggle the favorite status of a guitar tab."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT is_favorite FROM tabs WHERE id = ?;", (tab_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Guitar tab with ID {tab_id} not found",
            )

        new_fav = 0 if existing["is_favorite"] else 1
        updated_at = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "UPDATE tabs SET is_favorite = ?, updated_at = ? WHERE id = ?;",
            (new_fav, updated_at, tab_id),
        )
        conn.commit()

        cursor.execute("SELECT * FROM tabs WHERE id = ?;", (tab_id,))
        return row_to_tab(cursor.fetchone())


@router.delete("/{tab_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tab(tab_id: int) -> None:
    """Delete a guitar tab from the library."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tabs WHERE id = ?;", (tab_id,))
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Guitar tab with ID {tab_id} not found",
            )
        conn.commit()

