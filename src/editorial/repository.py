"""
NewsPulse AI — Editorial Selections Repository
Provides durable SQLite persistence for editor selections, lead story designations,
saved-for-later bookmarks, dismissal queues, and publication section ordering.
"""

from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
import sqlite3
import contextlib
from pathlib import Path

from src.config import settings
from src.logging_config import logger


@dataclass
class EditorialSelectionRecord:
    story_id: str
    lead_article_id: str
    headline: str
    category: str
    status: str = "selected"  # "selected" | "saved" | "dismissed"
    is_lead: bool = False
    edition_order: int = 0
    publication_section: str = "Front Page"
    editor_notes: Optional[str] = ""
    editorial_score: float = 0.0
    article_ids_json: str = "[]"
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        try:
            d["article_ids"] = json.loads(self.article_ids_json)
        except Exception:
            d["article_ids"] = []
        return d


class EditorialRepository:
    """Manages SQLite-backed persistence for editorial selections and actions."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = str(db_path or settings.jobs_db_path)
        self._init_db()

    @contextlib.contextmanager
    def _connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self):
        """Initializes editorial selections table and indexes."""
        with self._connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS editorial_selections (
                    story_id TEXT PRIMARY KEY,
                    lead_article_id TEXT NOT NULL,
                    headline TEXT NOT NULL,
                    category TEXT NOT NULL,
                    status TEXT NOT NULL,
                    is_lead INTEGER DEFAULT 0,
                    edition_order INTEGER DEFAULT 0,
                    publication_section TEXT DEFAULT 'Front Page',
                    editor_notes TEXT,
                    editorial_score REAL NOT NULL,
                    article_ids_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ed_status ON editorial_selections(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ed_order ON editorial_selections(edition_order ASC)")
            conn.commit()

    def select_story(
        self,
        story_id: str,
        lead_article_id: str,
        headline: str,
        category: str,
        editorial_score: float,
        article_ids: List[str],
        is_lead: bool = False,
        edition_order: Optional[int] = None,
        publication_section: str = "Front Page",
        editor_notes: str = ""
    ) -> EditorialSelectionRecord:
        """Selects a story for the daily edition or updates its status."""
        now = datetime.utcnow().isoformat() + "Z"

        with self._connection() as conn:
            # If marked as lead, clear any existing lead story
            if is_lead:
                conn.execute("UPDATE editorial_selections SET is_lead = 0 WHERE is_lead = 1")

            # Determine edition order if not provided
            if edition_order is None:
                cursor = conn.execute("SELECT COALESCE(MAX(edition_order), 0) + 1 FROM editorial_selections WHERE status = 'selected'")
                edition_order = cursor.fetchone()[0]

            conn.execute("""
                INSERT INTO editorial_selections (
                    story_id, lead_article_id, headline, category, status,
                    is_lead, edition_order, publication_section, editor_notes,
                    editorial_score, article_ids_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'selected', ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(story_id) DO UPDATE SET
                    status = 'selected',
                    is_lead = excluded.is_lead,
                    edition_order = excluded.edition_order,
                    publication_section = excluded.publication_section,
                    editor_notes = excluded.editor_notes,
                    editorial_score = excluded.editorial_score,
                    updated_at = excluded.updated_at
            """, (
                story_id, lead_article_id, headline, category,
                1 if is_lead else 0, edition_order, publication_section, editor_notes,
                editorial_score, json.dumps(article_ids), now, now
            ))
            conn.commit()

        return self.get_selection(story_id)

    def deselect_story(self, story_id: str) -> bool:
        """Removes a story from current selections without deleting its article."""
        with self._connection() as conn:
            cursor = conn.execute("DELETE FROM editorial_selections WHERE story_id = ?", (story_id,))
            conn.commit()
            return cursor.rowcount > 0

    def set_lead_story(self, story_id: str) -> Optional[EditorialSelectionRecord]:
        """Designates a story as the edition's lead headline."""
        now = datetime.utcnow().isoformat() + "Z"
        with self._connection() as conn:
            conn.execute("UPDATE editorial_selections SET is_lead = 0")
            cursor = conn.execute("UPDATE editorial_selections SET is_lead = 1, status = 'selected', updated_at = ? WHERE story_id = ?", (now, story_id))
            conn.commit()
            if cursor.rowcount == 0:
                return None
        return self.get_selection(story_id)

    def save_story_later(
        self,
        story_id: str,
        lead_article_id: str,
        headline: str,
        category: str,
        editorial_score: float,
        article_ids: List[str],
        editor_notes: str = ""
    ) -> EditorialSelectionRecord:
        """Bookmarks a story for future review."""
        now = datetime.utcnow().isoformat() + "Z"
        with self._connection() as conn:
            conn.execute("""
                INSERT INTO editorial_selections (
                    story_id, lead_article_id, headline, category, status,
                    is_lead, edition_order, publication_section, editor_notes,
                    editorial_score, article_ids_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'saved', 0, 0, 'Saved', ?, ?, ?, ?, ?)
                ON CONFLICT(story_id) DO UPDATE SET
                    status = 'saved',
                    is_lead = 0,
                    editor_notes = excluded.editor_notes,
                    updated_at = excluded.updated_at
            """, (
                story_id, lead_article_id, headline, category,
                editor_notes, editorial_score, json.dumps(article_ids), now, now
            ))
            conn.commit()
        return self.get_selection(story_id)

    def dismiss_story(
        self,
        story_id: str,
        lead_article_id: str,
        headline: str,
        category: str,
        editorial_score: float,
        article_ids: List[str]
    ) -> EditorialSelectionRecord:
        """Dismisses a story from active recommendations without deleting the article."""
        now = datetime.utcnow().isoformat() + "Z"
        with self._connection() as conn:
            conn.execute("""
                INSERT INTO editorial_selections (
                    story_id, lead_article_id, headline, category, status,
                    is_lead, edition_order, publication_section, editor_notes,
                    editorial_score, article_ids_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'dismissed', 0, 0, 'Dismissed', '', ?, ?, ?, ?)
                ON CONFLICT(story_id) DO UPDATE SET
                    status = 'dismissed',
                    is_lead = 0,
                    updated_at = excluded.updated_at
            """, (
                story_id, lead_article_id, headline, category,
                editorial_score, json.dumps(article_ids), now, now
            ))
            conn.commit()
        return self.get_selection(story_id)

    def restore_story(self, story_id: str) -> bool:
        """Restores a dismissed or saved story back to default uncurated state."""
        with self._connection() as conn:
            cursor = conn.execute("DELETE FROM editorial_selections WHERE story_id = ?", (story_id,))
            conn.commit()
            return cursor.rowcount > 0

    def reorder_selections(self, story_orders: List[Dict[str, Any]]) -> bool:
        """Reorders the selected stories lineup (e.g. [{'story_id': '...', 'edition_order': 1}])."""
        now = datetime.utcnow().isoformat() + "Z"
        with self._connection() as conn:
            for item in story_orders:
                sid = item.get("story_id")
                ord_val = item.get("edition_order", 0)
                if sid:
                    conn.execute("""
                        UPDATE editorial_selections
                        SET edition_order = ?, updated_at = ?
                        WHERE story_id = ?
                    """, (ord_val, now, sid))
            conn.commit()
        return True

    def update_publication_section(self, story_id: str, section: str) -> Optional[EditorialSelectionRecord]:
        """Assigns story to a specific publication section."""
        now = datetime.utcnow().isoformat() + "Z"
        with self._connection() as conn:
            conn.execute("""
                UPDATE editorial_selections
                SET publication_section = ?, updated_at = ?
                WHERE story_id = ?
            """, (section, now, story_id))
            conn.commit()
        return self.get_selection(story_id)

    def get_selection(self, story_id: str) -> Optional[EditorialSelectionRecord]:
        """Fetches a single selection record."""
        with self._connection() as conn:
            cursor = conn.execute("SELECT * FROM editorial_selections WHERE story_id = ?", (story_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return EditorialSelectionRecord(
                story_id=row["story_id"],
                lead_article_id=row["lead_article_id"],
                headline=row["headline"],
                category=row["category"],
                status=row["status"],
                is_lead=bool(row["is_lead"]),
                edition_order=row["edition_order"],
                publication_section=row["publication_section"],
                editor_notes=row["editor_notes"],
                editorial_score=row["editorial_score"],
                article_ids_json=row["article_ids_json"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

    def list_selections(self, status: Optional[str] = None) -> List[EditorialSelectionRecord]:
        """Lists selections, optionally filtered by status."""
        query = "SELECT * FROM editorial_selections"
        params = []
        if status:
            query += " WHERE status = ?"
            params.append(status)
        query += " ORDER BY is_lead DESC, edition_order ASC, updated_at DESC"

        with self._connection() as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            return [
                EditorialSelectionRecord(
                    story_id=r["story_id"],
                    lead_article_id=r["lead_article_id"],
                    headline=r["headline"],
                    category=r["category"],
                    status=r["status"],
                    is_lead=bool(r["is_lead"]),
                    edition_order=r["edition_order"],
                    publication_section=r["publication_section"],
                    editor_notes=r["editor_notes"],
                    editorial_score=r["editorial_score"],
                    article_ids_json=r["article_ids_json"],
                    created_at=r["created_at"],
                    updated_at=r["updated_at"]
                ) for r in rows
            ]


editorial_repo = EditorialRepository()
