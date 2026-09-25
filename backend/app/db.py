"""Unified database repository: Supabase (Cloud PostgreSQL) with automatic local SQLite fallback."""

import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import SUPABASE_KEY, SUPABASE_URL, is_supabase_configured
from app.schemas import Tab, TabCreate, TabUpdate

logger = logging.getLogger("tabber.db")

# Path for local SQLite fallback
DB_PATH = Path(__file__).resolve().parent.parent / "tabs.db"

# Global Supabase client instance
_supabase_client = None


def get_supabase_client():
    """Lazily initialize and return the Supabase client if configured."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if is_supabase_configured():
        try:
            from supabase import Client, create_client
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Connected to Supabase cloud database.")
            return _supabase_client
        except Exception as e:
            logger.warning(f"Failed to initialize Supabase client: {e}. Falling back to SQLite.")
            return None
    return None


def get_database_engine() -> str:
    """Return the name of the active database engine."""
    return "supabase" if get_supabase_client() is not None else "sqlite"


# =====================================================================
# SQLite Helpers & Initialization
# =====================================================================

def get_sqlite_connection() -> sqlite3.Connection:
    """Return an SQLite connection with dictionary-like row access."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize the database. If Supabase is connected, checks connection. Otherwise initializes SQLite."""
    client = get_supabase_client()
    if client is not None:
        logger.info("Using Supabase as primary database.")
        return

    # Initialize SQLite fallback
    with get_sqlite_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS tabs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                tuning TEXT NOT NULL DEFAULT 'Standard (E A D G B E)',
                capo INTEGER DEFAULT 0,
                difficulty TEXT NOT NULL DEFAULT 'Intermediate',
                content TEXT NOT NULL,
                is_favorite BOOLEAN NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        cursor.execute("SELECT COUNT(*) as count FROM tabs;")
        if cursor.fetchone()["count"] == 0:
            seed_sqlite_tabs(cursor)
        conn.commit()


def seed_sqlite_tabs(cursor: sqlite3.Cursor) -> None:
    """Seed the SQLite database with well-formatted classic guitar tabs."""
    now = datetime.now(timezone.utc).isoformat()
    starter_tabs = [
        (
            "Take Me Home, Country Roads",
            "John Denver",
            "Standard (E A D G B E)",
            2,
            "Beginner",
            """[Verse 1]
[G]Almost heaven, [Em]West Virginia
[D]Blue Ridge Mountains, [C]Shenandoah [G]River
[G]Life is old there, [Em]older than the trees
[D]Younger than the mountains, [C]growin' like a [G]breeze

[Chorus]
Country [G]roads, take me [D]home
To the [Em]place I be[C]long
West Vir[G]ginia, mountain [D]mama
Take me [C]home, country [G]roads

[Verse 2]
[G]All my memories [Em]gather 'round her
[D]Miner's lady, [C]stranger to blue [G]water
[G]Dark and dusty, [Em]painted on the sky
[D]Misty taste of moonshine, [C]teardrop in my [G]eye

[Bridge]
[Em]I hear her [D]voice in the [G]mornin' hour, she calls me
The [C]radio re[G]minds me of my [D]home far away
And [Em]drivin' down the [F]road, I get a [C]feelin'
That I [G]should have been home [D]yesterday, yester[D7]day
""",
            1,
            now,
            now,
        ),
        (
            "Knockin' on Heaven's Door",
            "Bob Dylan",
            "Standard (E A D G B E)",
            0,
            "Beginner",
            """[Intro]
[G]   [D]   [Am]
[G]   [D]   [C]

[Verse 1]
[G]Mama, take this [D]badge off of [Am]me
[G]I can't [D]use it any[C]more
[G]It's gettin' [D]dark, too dark to [Am]see
[G]I feel I'm [D]knockin' on heaven's [C]door

[Chorus]
[G]Knock, knock, [D]knockin' on heaven's [Am]door
[G]Knock, knock, [D]knockin' on heaven's [C]door
[G]Knock, knock, [D]knockin' on heaven's [Am]door
[G]Knock, knock, [D]knockin' on heaven's [C]door
""",
            1,
            now,
            now,
        ),
        (
            "Wish You Were Here (Intro)",
            "Pink Floyd",
            "Standard (E A D G B E)",
            0,
            "Beginner",
            """[Intro Acoustic Riff]

   Em7                  G
e|-------------------|-------------------|
B|-------3-----------|-------3-----------|
G|-------0-----------|-------0-----------|
D|---0h2---2p0-------|---0h2---2p0-------|
A|-------------2-----|-------------2-----|
E|-------------------|---------------3---|

   Em7                  A7sus4
e|-------------------|-------------------|
B|-------3-----------|-------3-----------|
G|-------0-----------|-------0-----------|
D|---0h2---2p0-------|---0h2---2p0-------|
A|-------------2-----|-------------0-----|
E|-------------------|-------------------|

   Em7                  G
e|-------------------|-------------------|
B|-------3-----------|-------3-----------|
G|-------0-----------|-------0-----------|
D|---0h2---2p0-------|---0h2---2p0-------|
A|-------------2-----|-------------------|
E|-------------------|---3---------------|

[Verse]
So, [C]so you think you can [D]tell
Heaven from [Am]hell, blue skies from [G]pain
Can you tell a green [D]field from a cold steel [C]rail?
A smile from a [Am]veil? Do you think you can [G]tell?
""",
            1,
            now,
            now,
        ),
        (
            "Blackbird (Intro)",
            "The Beatles",
            "Standard (E A D G B E)",
            0,
            "Intermediate",
            """[Intro - Fingerstyle]

   G                 Am7               G/B
e|-------|---------|-------|---------|-------|---------|
B|---0---|-----0---|---1---|-----1---|---3---|-----3---|
G|-------|---0-----|-------|---0-----|-------|---0-----|
D|-------|---------|-------|---------|-------|---------|
A|-------|---------|---0---|---------|---2---|---------|
E|---3---|---------|-------|---------|-------|---------|

   G                     C
e|-------|-------------|-------|---------|
B|--12---|------12-----|---5---|-----5---|
G|-------|---0---------|-------|---0-----|
D|-------|-------------|-------|---------|
A|--10---|-------------|---3---|---------|
E|-------|-------------|-------|---------|
""",
            1,
            now,
            now,
        ),
    ]

    cursor.executemany(
        """
        INSERT INTO tabs (title, artist, tuning, capo, difficulty, content, is_favorite, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """,
        starter_tabs,
    )


def sqlite_row_to_tab(row) -> Tab:
    """Convert an SQLite Row to Tab schema."""
    return Tab(
        id=row["id"],
        title=row["title"],
        artist=row["artist"],
        tuning=row["tuning"],
        capo=row["capo"],
        difficulty=row["difficulty"],
        content=row["content"],
        is_favorite=bool(row["is_favorite"]),
        created_at=str(row["created_at"]),
        updated_at=str(row["updated_at"]),
    )


# =====================================================================
# Unified Database Repository Methods (Supabase + SQLite Fallback)
# =====================================================================

def list_tabs_db(
    q: Optional[str] = None,
    difficulty: Optional[str] = None,
    favorite: Optional[bool] = None,
    tuning: Optional[str] = None,
) -> List[Tab]:
    """Retrieve tabs matching search and filter parameters."""
    client = get_supabase_client()
    if client is not None:
        try:
            query = client.table("tabs").select("*")
            if difficulty and difficulty != "All":
                query = query.eq("difficulty", difficulty)
            if favorite is not None:
                query = query.eq("is_favorite", favorite)
            if tuning and tuning != "All":
                query = query.eq("tuning", tuning)

            # Order by favorites then updated timestamp
            query = query.order("is_favorite", desc=True).order("updated_at", desc=True)
            res = query.execute()
            data = res.data or []

            # Client-side filtering for text search query if provided
            if q and q.strip():
                term = q.strip().lower()
                data = [
                    row for row in data
                    if term in row.get("title", "").lower()
                    or term in row.get("artist", "").lower()
                    or term in row.get("content", "").lower()
                ]

            return [Tab(**row) for row in data]
        except Exception as e:
            logger.error(f"Supabase list_tabs error: {e}. Falling back to SQLite.")

    # SQLite fallback
    conditions = []
    params = []
    if q and q.strip():
        pat = f"%{q.strip()}%"
        conditions.append("(title LIKE ? OR artist LIKE ? OR content LIKE ?)")
        params.extend([pat, pat, pat])
    if difficulty and difficulty != "All":
        conditions.append("difficulty = ?")
        params.append(difficulty)
    if favorite is not None:
        conditions.append("is_favorite = ?")
        params.append(1 if favorite else 0)
    if tuning and tuning != "All":
        conditions.append("tuning = ?")
        params.append(tuning)

    sql = "SELECT * FROM tabs"
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY is_favorite DESC, updated_at DESC"

    with get_sqlite_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return [sqlite_row_to_tab(r) for r in cursor.fetchall()]


def get_tab_db(tab_id: int) -> Optional[Tab]:
    """Retrieve a single tab by ID."""
    client = get_supabase_client()
    if client is not None:
        try:
            res = client.table("tabs").select("*").eq("id", tab_id).execute()
            if res.data and len(res.data) > 0:
                return Tab(**res.data[0])
            return None
        except Exception as e:
            logger.error(f"Supabase get_tab error: {e}. Falling back to SQLite.")

    with get_sqlite_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tabs WHERE id = ?;", (tab_id,))
        row = cursor.fetchone()
        return sqlite_row_to_tab(row) if row else None


def create_tab_db(payload: TabCreate) -> Tab:
    """Insert a new tab into the active database."""
    now = datetime.now(timezone.utc).isoformat()
    client = get_supabase_client()
    if client is not None:
        try:
            record = {
                "title": payload.title.strip(),
                "artist": payload.artist.strip(),
                "tuning": payload.tuning,
                "capo": payload.capo,
                "difficulty": payload.difficulty,
                "content": payload.content,
                "is_favorite": payload.is_favorite,
                "created_at": now,
                "updated_at": now,
            }
            res = client.table("tabs").insert(record).execute()
            if res.data and len(res.data) > 0:
                return Tab(**res.data[0])
        except Exception as e:
            logger.error(f"Supabase create_tab error: {e}. Falling back to SQLite.")

    with get_sqlite_connection() as conn:
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
        return sqlite_row_to_tab(cursor.fetchone())


def update_tab_db(tab_id: int, payload: TabUpdate) -> Optional[Tab]:
    """Update an existing tab."""
    existing = get_tab_db(tab_id)
    if not existing:
        return None

    now = datetime.now(timezone.utc).isoformat()
    update_data: Dict[str, Any] = {"updated_at": now}
    if payload.title is not None:
        update_data["title"] = payload.title.strip()
    if payload.artist is not None:
        update_data["artist"] = payload.artist.strip()
    if payload.tuning is not None:
        update_data["tuning"] = payload.tuning
    if payload.capo is not None:
        update_data["capo"] = payload.capo
    if payload.difficulty is not None:
        update_data["difficulty"] = payload.difficulty
    if payload.content is not None:
        update_data["content"] = payload.content
    if payload.is_favorite is not None:
        update_data["is_favorite"] = payload.is_favorite

    client = get_supabase_client()
    if client is not None:
        try:
            res = client.table("tabs").update(update_data).eq("id", tab_id).execute()
            if res.data and len(res.data) > 0:
                return Tab(**res.data[0])
        except Exception as e:
            logger.error(f"Supabase update_tab error: {e}. Falling back to SQLite.")

    # SQLite fallback
    set_clauses = [f"{k} = ?" for k in update_data.keys()]
    values = list(update_data.values()) + [tab_id]
    with get_sqlite_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE tabs SET {', '.join(set_clauses)} WHERE id = ?;", values)
        conn.commit()
        cursor.execute("SELECT * FROM tabs WHERE id = ?;", (tab_id,))
        return sqlite_row_to_tab(cursor.fetchone())


def delete_tab_db(tab_id: int) -> bool:
    """Delete a tab from the active database."""
    client = get_supabase_client()
    if client is not None:
        try:
            res = client.table("tabs").delete().eq("id", tab_id).execute()
            return bool(res.data and len(res.data) > 0)
        except Exception as e:
            logger.error(f"Supabase delete_tab error: {e}. Falling back to SQLite.")

    with get_sqlite_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tabs WHERE id = ?;", (tab_id,))
        conn.commit()
        return cursor.rowcount > 0


def toggle_favorite_db(tab_id: int) -> Optional[Tab]:
    """Toggle the favorite status of a tab."""
    existing = get_tab_db(tab_id)
    if not existing:
        return None

    new_fav = not existing.is_favorite
    return update_tab_db(tab_id, TabUpdate(is_favorite=new_fav))
