"""Tests for Ultimate Guitar tab import and search endpoints using standard library unittest."""

import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.ug_scraper import (
    clean_tab_content,
    normalize_capo,
    normalize_difficulty,
    normalize_tuning,
)

client = TestClient(app)


class TestTabImportAndSearch(unittest.TestCase):
    def test_clean_tab_content(self):
        """Verify that [tab] and [ch] tags are stripped while preserving character column alignment."""
        raw = (
            "[tab][Intro]\n"
            "   [ch]G[/ch]       | [ch]Fmaj7[/ch]                   [ch]G6[/ch]\n"
            "e|---0-----|---------------0-----------0-----|\n"
            "B|-3---3-1-|-----1-------------------3---3-1-|[/tab]"
        )
        cleaned = clean_tab_content(raw)
        self.assertNotIn("[tab]", cleaned)
        self.assertNotIn("[/tab]", cleaned)
        self.assertNotIn("[ch]", cleaned)
        self.assertNotIn("[/ch]", cleaned)
        lines = cleaned.splitlines()
        self.assertEqual(lines[0], "[Intro]")
        self.assertTrue(lines[1].startswith("   G       | Fmaj7"))
        # Verify the vertical measure bar aligns with the tab staff
        self.assertEqual(lines[1].index("|"), lines[2].index("|", 2))


    def test_normalizers(self):
        """Test metadata normalization utilities."""
        self.assertEqual(normalize_capo(7), 7)
        self.assertEqual(normalize_capo("3"), 3)
        self.assertEqual(normalize_capo(99), 12)  # Clamped to 12
        self.assertEqual(normalize_capo(-2), 0)  # Clamped to 0
        self.assertEqual(normalize_capo(None), 0)

        self.assertEqual(normalize_difficulty("novice"), "Beginner")
        self.assertEqual(normalize_difficulty("intermediate"), "Intermediate")
        self.assertEqual(normalize_difficulty("advanced"), "Advanced")
        self.assertEqual(normalize_difficulty(None), "Intermediate")

        self.assertEqual(normalize_tuning("Standard"), "Standard (E A D G B E)")
        self.assertEqual(normalize_tuning("Drop D"), "Drop D (D A D G B E)")

    def test_search_endpoint(self):
        """Test searching Ultimate Guitar tabs."""
        response = client.get("/api/tabs/search-ug?q=Let+Her+Go+Passenger")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

        # Ensure the top pick has high votes and rating
        top_pick = data[0]
        self.assertTrue(top_pick["is_top_pick"])
        self.assertIn("Passenger", top_pick["artist"])
        self.assertGreater(top_pick["votes"], 1000)
        self.assertGreaterEqual(top_pick["rating"], 4.0)
        self.assertIn("tabs.ultimate-guitar.com", top_pick["url"])

    def test_import_url_endpoint(self):
        """Test importing a tab from an Ultimate Guitar link."""
        test_url = "https://tabs.ultimate-guitar.com/tab/passenger/let-her-go-chords-1137467"

        # Test preview mode (save = False)
        resp = client.post("/api/tabs/import-url", json={"url": test_url, "save": False})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIsNone(body["saved_tab"])
        tab_data = body["tab"]
        self.assertEqual(tab_data["title"], "Let Her Go")
        self.assertEqual(tab_data["artist"], "Passenger")
        self.assertEqual(tab_data["capo"], 7)
        self.assertGreater(len(tab_data["content"]), 100)

        # Test persist mode (save = True)
        resp_save = client.post("/api/tabs/import-url", json={"url": test_url, "save": True})
        self.assertEqual(resp_save.status_code, 200)
        body_save = resp_save.json()
        self.assertIsNotNone(body_save["saved_tab"])
        saved_id = body_save["saved_tab"]["id"]

        # Verify tab exists in database
        get_resp = client.get(f"/api/tabs/{saved_id}")
        self.assertEqual(get_resp.status_code, 200)
        self.assertEqual(get_resp.json()["id"], saved_id)
        self.assertEqual(get_resp.json()["title"], "Let Her Go")


if __name__ == "__main__":
    unittest.main()
