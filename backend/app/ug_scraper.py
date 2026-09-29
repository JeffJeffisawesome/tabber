"""Ultimate Guitar scraper and search utility for Tabber."""

import html
import json
import logging
import re
import urllib.parse
import urllib.request
from typing import Any, List, Optional

from app.schemas import TabCreate, UGSearchResult

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def clean_tab_content(raw_content: str) -> str:
    """Normalize raw tab content by removing UG tags and standardizing line breaks."""
    if not raw_content:
        return ""

    # Unescape HTML entities
    text = html.unescape(raw_content)

    # Strip Ultimate Guitar markup tags while preserving exact character alignment
    text = re.sub(r"\[\/?(ch|tab)\]", "", text)

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Trim leading/trailing blank lines
    return text.strip()


def normalize_tuning(tuning_val: Optional[str]) -> str:
    """Standardize guitar tuning strings."""
    if not tuning_val:
        return "Standard (E A D G B E)"
    val = tuning_val.strip()
    if val.lower() in ("standard", "e a d g b e"):
        return "Standard (E A D G B E)"
    if "drop d" in val.lower():
        return "Drop D (D A D G B E)"
    return val[:50]


def normalize_difficulty(diff_val: Optional[str]) -> str:
    """Map raw difficulty strings to Beginner, Intermediate, or Advanced."""
    if not diff_val:
        return "Intermediate"
    val = str(diff_val).strip().lower()
    if any(k in val for k in ("novice", "beginner", "easy")):
        return "Beginner"
    if any(k in val for k in ("advanced", "expert", "hard")):
        return "Advanced"
    return "Intermediate"


def normalize_capo(capo_val: Any) -> int:
    """Safely parse capo fret number between 0 and 12."""
    if capo_val is None:
        return 0
    try:
        val = int(capo_val)
        return max(0, min(12, val))
    except (ValueError, TypeError):
        return 0


def fetch_html(url: str, timeout: int = 12) -> str:
    """Fetch raw HTML content from an external web page."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="ignore")


def parse_ug_page(html_doc: str, source_url: str = "") -> TabCreate:
    """Extract guitar tab metadata and content from Ultimate Guitar HTML."""
    match = re.search(r'class="js-store" data-content="([^"]+)"', html_doc)
    if not match:
        raise ValueError(
            "Could not locate tab data store in the page. Ensure the URL is an Ultimate Guitar tab page."
        )

    try:
        raw_json = html.unescape(match.group(1))
        data = json.loads(raw_json)
    except Exception as e:
        raise ValueError(f"Failed to parse tab data JSON: {str(e)}")

    page_data = data.get("store", {}).get("page", {}).get("data", {})
    tab_info = page_data.get("tab", {})
    tab_view = page_data.get("tab_view", {})
    meta = tab_view.get("meta", {})

    # Extract metadata
    title = tab_info.get("song_name") or page_data.get("song_name") or "Untitled Song"
    artist = tab_info.get("artist_name") or page_data.get("artist_name") or "Unknown Artist"

    capo_raw = meta.get("capo") or tab_info.get("capo")
    capo = normalize_capo(capo_raw)

    tuning_raw = meta.get("tuning", {}).get("name") if isinstance(meta.get("tuning"), dict) else meta.get("tuning")
    tuning = normalize_tuning(tuning_raw or tab_info.get("tuning"))

    diff_raw = tab_info.get("difficulty") or meta.get("difficulty")
    difficulty = normalize_difficulty(diff_raw)

    # Version name (e.g. 'Chords (Ver 1)', 'Tabs (Ver 2)')
    raw_type = tab_info.get("type_name") or tab_info.get("type") or "Chords"
    version_num = tab_info.get("version") or 1
    version_name = f"{raw_type} (Ver {version_num})"

    # Tab body
    content_raw = tab_view.get("wiki_tab", {}).get("content", "")
    content = clean_tab_content(content_raw)

    if not content:
        raise ValueError("The tab content appears to be empty or restricted.")

    return TabCreate(
        title=title[:150],
        artist=artist[:150],
        version_name=version_name[:50],
        tuning=tuning,
        capo=capo,
        difficulty=difficulty,
        content=content,
        is_favorite=False,
    )



def scrape_ug_url(url: str) -> TabCreate:
    """Scrape and parse an Ultimate Guitar tab by URL."""
    html_doc = fetch_html(url)
    return parse_ug_page(html_doc, source_url=url)


def search_ug_tabs(query: str, limit: int = 15) -> List[UGSearchResult]:
    """Search Ultimate Guitar for tabs matching query and rank by votes * (rating ^ 2)."""
    clean_query = query.strip()
    if not clean_query:
        return []

    encoded = urllib.parse.quote(clean_query)
    search_url = f"https://www.ultimate-guitar.com/search.php?search_type=title&value={encoded}"

    try:
        html_doc = fetch_html(search_url)
    except Exception as e:
        logger.error(f"Failed to fetch UG search page: {e}")
        return []

    match = re.search(r'class="js-store" data-content="([^"]+)"', html_doc)
    if not match:
        logger.warning("No js-store data found on search page")
        return []

    try:
        raw_json = html.unescape(match.group(1))
        data = json.loads(raw_json)
    except Exception as e:
        logger.error(f"Error parsing UG search JSON: {e}")
        return []

    raw_results = data.get("store", {}).get("page", {}).get("data", {}).get("results", [])
    if not isinstance(raw_results, list):
        return []

    valid_items = []
    for item in raw_results:
        tab_type = item.get("type")
        # Keep playable types
        if tab_type not in ("Chords", "Tabs", "Bass", "Ukulele"):
            continue

        tab_url = item.get("tab_url")
        if not tab_url:
            continue

        try:
            rating = float(item.get("rating", 0) or 0)
        except (ValueError, TypeError):
            rating = 0.0

        try:
            votes = int(item.get("votes", 0) or 0)
        except (ValueError, TypeError):
            votes = 0

        # Composite quality score: votes * (rating ^ 2)
        score = votes * (rating**2) if rating > 0 else float(votes)

        version = 1
        try:
            version = int(item.get("version", 1) or 1)
        except (ValueError, TypeError):
            version = 1

        title = item.get("song_name") or "Unknown"
        artist = item.get("artist_name") or "Unknown"

        valid_items.append({
            "model": UGSearchResult(
                title=title,
                artist=artist,
                type=tab_type,
                rating=round(rating, 2),
                votes=votes,
                url=tab_url,
                version=version,
                is_top_pick=False,
            ),
            "score": score,
            "votes": votes,
            "rating": rating,
        })

    # Sort primarily by composite score, then by votes, then by rating
    valid_items.sort(key=lambda x: (x["score"], x["votes"], x["rating"]), reverse=True)

    if valid_items:
        valid_items[0]["model"].is_top_pick = True

    return [item["model"] for item in valid_items[:limit]]

