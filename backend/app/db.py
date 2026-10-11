"""Unified database repository: Supabase (Cloud PostgreSQL) with automatic local SQLite fallback."""

import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import SUPABASE_KEY, SUPABASE_URL, is_supabase_configured
from app.schemas import Tab, TabCreate, TabUpdate, UserBase

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
    """Initialize SQLite database (fallback) and check Supabase connection."""
    now = datetime.now(timezone.utc).isoformat()

    # Initialize SQLite fallback
    with get_sqlite_connection() as conn:
        cursor = conn.cursor()

        # 1. Create users table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT,
                name TEXT,
                avatar_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )

        # 2. Create tabs table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS tabs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT REFERENCES users(id),
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                version_name TEXT DEFAULT 'Chords',
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

        # Automatic SQLite migration: ensure version_name and user_id columns exist
        cursor.execute("PRAGMA table_info(tabs);")
        existing_cols = [col[1] for col in cursor.fetchall()]
        if "version_name" not in existing_cols:
            cursor.execute("ALTER TABLE tabs ADD COLUMN version_name TEXT DEFAULT 'Chords';")
        if "user_id" not in existing_cols:
            cursor.execute("ALTER TABLE tabs ADD COLUMN user_id TEXT REFERENCES users(id);")

        # 3. Seed initial primary author if users table is empty
        cursor.execute("SELECT COUNT(*) as count FROM users;")
        if cursor.fetchone()["count"] == 0:
            cursor.execute(
                """
                INSERT INTO users (id, email, name, avatar_url, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?);
                """,
                (
                    "user-jeffrey-zhu",
                    "jeffrey@tabber.local",
                    "Jeffrey Zhu",
                    "",
                    now,
                    now,
                ),
            )

        # Retrieve first user
        cursor.execute("SELECT id FROM users ORDER BY created_at ASC LIMIT 1;")
        first_user = cursor.fetchone()
        first_user_id = first_user["id"] if first_user else "user-jeffrey-zhu"

        # 4. Backfill any existing tabs where user_id IS NULL to this first user
        cursor.execute("UPDATE tabs SET user_id = ? WHERE user_id IS NULL;", (first_user_id,))

        cursor.execute("SELECT COUNT(*) as count FROM tabs;")
        if cursor.fetchone()["count"] == 0:
            seed_sqlite_tabs(cursor, first_user_id)

        conn.commit()


def seed_sqlite_tabs(cursor: sqlite3.Cursor, author_id: str = "user-jeffrey-zhu") -> None:
    """Seed the SQLite database with well-formatted classic guitar tabs."""
    now = datetime.now(timezone.utc).isoformat()
    starter_tabs = [
        (
            author_id,
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
""",
            1,
            now,
            now,
        ),
        (
            author_id,
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
""",
            1,
            now,
            now,
        ),
    ]

    cursor.executemany(
        """
        INSERT INTO tabs (user_id, title, artist, tuning, capo, difficulty, content, is_favorite, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """,
        starter_tabs,
    )


def sqlite_row_to_tab(row) -> Tab:
    """Convert an SQLite Row to Tab schema including author profile."""
    version_name = "Chords"
    try:
        if "version_name" in row.keys() and row["version_name"]:
            version_name = str(row["version_name"])
    except Exception:
        pass

    user_id = None
    try:
        if "user_id" in row.keys() and row["user_id"]:
            user_id = str(row["user_id"])
    except Exception:
        pass

    author = None
    if user_id:
        author_name = None
        author_email = None
        author_avatar = None
        if "author_name" in row.keys() and row["author_name"]:
            author_name = row["author_name"]
            author_email = row["author_email"] if "author_email" in row.keys() else None
            author_avatar = row["author_avatar_url"] if "author_avatar_url" in row.keys() else None
        else:
            # Look up author from users table if not already joined
            try:
                with get_sqlite_connection() as conn:
                    u_cursor = conn.cursor()
                    u_cursor.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
                    u_row = u_cursor.fetchone()
                    if u_row:
                        author_name = u_row["name"]
                        author_email = u_row["email"]
                        author_avatar = u_row["avatar_url"]
            except Exception:
                pass

        if author_name or author_email:
            author = UserBase(
                id=user_id,
                name=author_name or "Guitarist",
                email=author_email or "",
                avatar_url=author_avatar or "",
            )

    return Tab(
        id=row["id"],
        user_id=user_id,
        author=author,
        title=row["title"],
        artist=row["artist"],
        version_name=version_name,
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
            try:
                query = client.table("tabs").select("*, author:users(id, email, name, avatar_url)")
            except Exception:
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

    # SQLite fallback with author LEFT JOIN
    conditions = []
    params = []
    if q and q.strip():
        pat = f"%{q.strip()}%"
        conditions.append("(t.title LIKE ? OR t.artist LIKE ? OR t.content LIKE ?)")
        params.extend([pat, pat, pat])
    if difficulty and difficulty != "All":
        conditions.append("t.difficulty = ?")
        params.append(difficulty)
    if favorite is not None:
        conditions.append("t.is_favorite = ?")
        params.append(1 if favorite else 0)
    if tuning and tuning != "All":
        conditions.append("t.tuning = ?")
        params.append(tuning)

    sql = """
        SELECT t.*, u.name as author_name, u.email as author_email, u.avatar_url as author_avatar_url
        FROM tabs t
        LEFT JOIN users u ON t.user_id = u.id
    """
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY t.is_favorite DESC, t.updated_at DESC"

    with get_sqlite_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return [sqlite_row_to_tab(r) for r in cursor.fetchall()]


def get_tab_db(tab_id: int) -> Optional[Tab]:
    """Retrieve a single tab by ID."""
    client = get_supabase_client()
    if client is not None:
        try:
            try:
                res = client.table("tabs").select("*, author:users(id, email, name, avatar_url)").eq("id", tab_id).execute()
            except Exception:
                res = client.table("tabs").select("*").eq("id", tab_id).execute()

            if res.data and len(res.data) > 0:
                return Tab(**res.data[0])
            return None
        except Exception as e:
            logger.error(f"Supabase get_tab error: {e}. Falling back to SQLite.")

    with get_sqlite_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT t.*, u.name as author_name, u.email as author_email, u.avatar_url as author_avatar_url
            FROM tabs t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = ?;
            """,
            (tab_id,),
        )
        row = cursor.fetchone()
        return sqlite_row_to_tab(row) if row else None


def create_tab_db(payload: TabCreate, author_id: Optional[str] = None) -> Tab:
    """Insert a new tab into the active database."""
    now = datetime.now(timezone.utc).isoformat()
    user_id = author_id or payload.user_id

    client = get_supabase_client()
    if client is not None:
        try:
            record = {
                "user_id": user_id,
                "title": payload.title.strip(),
                "artist": payload.artist.strip(),
                "version_name": payload.version_name or "Chords",
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
            logger.warning(f"Supabase insert failed: {e}. Retrying without version_name/user_id...")
            try:
                compat_record = {k: v for k, v in record.items() if k not in ("version_name", "user_id")}
                res = client.table("tabs").insert(compat_record).execute()
                if res.data and len(res.data) > 0:
                    d = dict(res.data[0])
                    d["version_name"] = payload.version_name or "Chords"
                    d["user_id"] = user_id
                    return Tab(**d)
            except Exception as e2:
                logger.error(f"Supabase insert fallback failed: {e2}. Falling back to SQLite.")

    with get_sqlite_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO tabs (user_id, title, artist, version_name, tuning, capo, difficulty, content, is_favorite, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                user_id,
                payload.title.strip(),
                payload.artist.strip(),
                payload.version_name or "Chords",
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
        return get_tab_db(tab_id)


def update_tab_db(tab_id: int, payload: TabUpdate, current_user_id: Optional[str] = None) -> Optional[Tab]:
    """Update an existing tab, enforcing that only the author who created it can edit it."""
    existing = get_tab_db(tab_id)
    if not existing:
        return None

    # Enforce author permissions: only creator can edit
    if current_user_id and existing.user_id and existing.user_id != current_user_id:
        raise PermissionError("Only the author who created this tab can edit it.")

    now = datetime.now(timezone.utc).isoformat()
    update_data: Dict[str, Any] = {"updated_at": now}
    if payload.title is not None:
        update_data["title"] = payload.title.strip()
    if payload.artist is not None:
        update_data["artist"] = payload.artist.strip()
    if payload.version_name is not None:
        update_data["version_name"] = payload.version_name.strip()
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
        return get_tab_db(tab_id)


def delete_tab_db(tab_id: int, current_user_id: Optional[str] = None) -> bool:
    """Delete a tab from the active database, enforcing that only the author can delete it."""
    existing = get_tab_db(tab_id)
    if not existing:
        return False

    # Enforce author permissions: only creator can delete
    if current_user_id and existing.user_id and existing.user_id != current_user_id:
        raise PermissionError("Only the author who created this tab can delete it.")

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
