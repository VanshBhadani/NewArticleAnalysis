"""
NewsPulse AI — Authoritative Dynamic Category Registry
Provides a single unified source of truth for categories and subcategories across backend and frontend.
Supports candidate, active, and archived statuses, hierarchical parent/child relations,
and deterministic accessible color assignment.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
from pathlib import Path
from typing import Dict, List, Optional
import hashlib

from src.config import settings

# Curated accessible editorial color palette for dynamic categories
EDITORIAL_PALETTE = [
    "#1E3A8A",  # Deep Navy
    "#047857",  # Forest Emerald
    "#B45309",  # Warm Amber
    "#4338CA",  # Deep Indigo
    "#7C3AED",  # Royal Violet
    "#B91C1C",  # Crimson
    "#0F766E",  # Dark Teal
    "#0E7490",  # Cerulean
    "#BE123C",  # Rose Madder
    "#92400E",  # Burnt Bronze
    "#475569",  # Slate
    "#D97706",  # Ochre
    "#2563EB",  # Electric Cobalt
    "#059669",  # Sea Green
]

CANONICAL_COLORS = {
    "world": "#1E3A8A",
    "sports": "#047857",
    "business": "#B45309",
    "scitech": "#4338CA",
    "sci/tech": "#4338CA",
}


def get_deterministic_color(category_id: str) -> str:
    """Computes a deterministic, stable color for any category identifier."""
    norm_id = category_id.lower().replace(" ", "").replace("_", "").replace("/", "")
    if norm_id in CANONICAL_COLORS:
        return CANONICAL_COLORS[norm_id]
    
    # Hash-based selection ensures stability across runs
    h = int(hashlib.md5(norm_id.encode("utf-8")).hexdigest(), 16)
    return EDITORIAL_PALETTE[h % len(EDITORIAL_PALETTE)]


@dataclass
class CategoryMetadata:
    id: str
    name: str
    parent_id: Optional[str] = None
    status: str = "active"  # "active" | "candidate" | "archived"
    color: str = ""
    description: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    taxonomy_version: str = "v1.0"
    article_count: int = 0
    cohesion_score: Optional[float] = None
    keywords: List[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.color:
            self.color = get_deterministic_color(self.id)


class CategoryRegistry:
    """Authoritative category taxonomy registry."""

    def __init__(self, persistence_file: Optional[Path] = None):
        self.persistence_file = persistence_file or (settings.data_dir / "taxonomy_registry.json")
        self.categories: Dict[str, CategoryMetadata] = {}
        self._init_defaults()
        self.load()

    def _init_defaults(self):
        """Initializes canonical AG News desks."""
        canonical = [
            CategoryMetadata(
                id="world",
                name="World",
                status="active",
                color="#1E3A8A",
                description="International politics, diplomacy, global conflicts, and foreign affairs.",
                taxonomy_version="v1.0"
            ),
            CategoryMetadata(
                id="sports",
                name="Sports",
                status="active",
                color="#047857",
                description="Athletics, competitive tournaments, team leagues, and sporting events.",
                taxonomy_version="v1.0"
            ),
            CategoryMetadata(
                id="business",
                name="Business",
                status="active",
                color="#B45309",
                description="Markets, corporate finance, macroeconomic policy, industry developments.",
                taxonomy_version="v1.0"
            ),
            CategoryMetadata(
                id="scitech",
                name="Sci/Tech",
                status="active",
                color="#4338CA",
                description="Scientific research, computing hardware, AI, biotechnology, and cybersecurity.",
                taxonomy_version="v1.0"
            ),
        ]
        for c in canonical:
            self.categories[c.id] = c

    def get_category(self, cat_id: str) -> Optional[CategoryMetadata]:
        norm = self._normalize_id(cat_id)
        return self.categories.get(norm)

    def get_by_name(self, name: str) -> Optional[CategoryMetadata]:
        for c in self.categories.values():
            if c.name.lower() == name.lower():
                return c
        return None

    def list_categories(self, status: Optional[str] = None, include_archived: bool = False) -> List[CategoryMetadata]:
        cats = list(self.categories.values())
        if status:
            return [c for c in cats if c.status == status]
        if not include_archived:
            return [c for c in cats if c.status != "archived"]
        return cats

    def register_candidate(
        self,
        name: str,
        parent_id: Optional[str] = None,
        description: str = "",
        cohesion_score: Optional[float] = None,
        keywords: Optional[List[str]] = None,
        article_count: int = 0
    ) -> CategoryMetadata:
        """Registers an emerging topic candidate."""
        cat_id = self._normalize_id(name)
        if cat_id in self.categories:
            existing = self.categories[cat_id]
            if existing.status == "candidate":
                existing.article_count = max(existing.article_count, article_count)
                if cohesion_score is not None:
                    existing.cohesion_score = cohesion_score
                if keywords:
                    existing.keywords = keywords
            return existing

        color = get_deterministic_color(cat_id)
        meta = CategoryMetadata(
            id=cat_id,
            name=name,
            parent_id=self._normalize_id(parent_id) if parent_id else None,
            status="candidate",
            color=color,
            description=description or f"Candidate topic discovered via TF-IDF cohesion ({', '.join(keywords or [])})",
            taxonomy_version="v1.1",
            article_count=article_count,
            cohesion_score=cohesion_score,
            keywords=keywords or []
        )
        self.categories[cat_id] = meta
        self.save()
        return meta

    def promote_candidate(self, cat_id: str) -> CategoryMetadata:
        """Promotes a candidate category to active status."""
        norm = self._normalize_id(cat_id)
        if norm not in self.categories:
            raise ValueError(f"Category '{cat_id}' not found in registry.")
        cat = self.categories[norm]
        cat.status = "active"
        self.save()
        return cat

    def reject_candidate(self, cat_id: str) -> CategoryMetadata:
        """Rejects a candidate category, marking it archived."""
        norm = self._normalize_id(cat_id)
        if norm not in self.categories:
            raise ValueError(f"Category '{cat_id}' not found in registry.")
        cat = self.categories[norm]
        cat.status = "archived"
        self.save()
        return cat

    def update_article_counts(self, counts: Dict[str, int]):
        """Updates article count statistics for categories."""
        for cat_name_or_id, count in counts.items():
            cat = self.get_category(cat_name_or_id) or self.get_by_name(cat_name_or_id)
            if cat:
                cat.article_count = count

    def save(self):
        """Persists custom taxonomy state to JSON."""
        try:
            data = [asdict(c) for c in self.categories.values()]
            self.persistence_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.persistence_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    def load(self):
        """Loads persisted taxonomy if available."""
        if not self.persistence_file.exists():
            return
        try:
            with open(self.persistence_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            for item in data:
                cat = CategoryMetadata(**item)
                self.categories[cat.id] = cat
        except Exception:
            pass

    def _normalize_id(self, raw_id: Optional[str]) -> str:
        if not raw_id:
            return ""
        norm = raw_id.strip().lower()
        if norm in ("sci/tech", "scitech", "sci-tech", "sci tech"):
            return "scitech"
        return norm.replace(" ", "_").replace("-", "_").replace("/", "_")


category_registry = CategoryRegistry()
