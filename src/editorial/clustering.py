"""
NewsPulse AI — Deterministic Story Grouping & Clustering
Groups related news articles covering the same event using TF-IDF vectorization
and cosine similarity. Extracts representative headlines, counts distinct sources,
and maintains in-memory clustering cache.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple, Any
import hashlib
import re
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import AgglomerativeClustering

from src.logging_config import logger
from src.taxonomy.registry import category_registry


@dataclass
class StoryArticleRef:
    article_id: str
    title: str
    description: str
    combined_text: str
    predicted_category: str
    confidence: float
    is_uncertain: bool
    source: str = "Editorial Wire"
    published_date: str = "Recent Dispatch"


@dataclass
class StoryGroup:
    story_id: str
    representative_headline: str
    lead_article_id: str
    main_category: str
    subcategory: str
    excerpt: str
    articles: List[StoryArticleRef] = field(default_factory=list)
    article_ids: List[str] = field(default_factory=list)
    distinct_sources: List[str] = field(default_factory=list)
    distinct_sources_count: int = 1
    related_articles_count: int = 1
    cluster_cohesion: float = 0.80
    top_keywords: List[str] = field(default_factory=list)
    published_date: str = "Recent Dispatch"
    lead_source: str = "Editorial Wire"
    lead_confidence: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        return d


KNOWN_SOURCES = [
    "Reuters", "Associated Press", "AP Wire", "AFP", "Agence France-Presse",
    "Bloomberg", "Financial Times", "Wall Street Journal", "BBC News",
    "NewsPulse Wire", "Editorial Wire", "Dow Jones", "Xinhua", "Kyodo News",
    "UPI", "TechCrunch", "Wired", "Nature", "ESPN", "Sports Illustrated"
]


def extract_source_from_text(title: str, body: str) -> str:
    """Extracts known source attributions or defaults to Editorial Wire."""
    combined = f"{title} {body}"
    for src in KNOWN_SOURCES:
        if re.search(r"\b" + re.escape(src) + r"\b", combined, re.IGNORECASE):
            return src
    if "Reuters" in combined or "(Reuters)" in combined:
        return "Reuters"
    if "AP" in combined or "(AP)" in combined:
        return "AP Wire"
    if "AFP" in combined:
        return "AFP"
    return "Editorial Wire"


class StoryClusteringEngine:
    """
    Deterministic TF-IDF story clustering engine.
    Caches results keyed on dataset signature to prevent re-clustering on every render.
    """

    def __init__(self, similarity_threshold: float = 0.25):
        self.similarity_threshold = similarity_threshold
        self._cache_signature: Optional[str] = None
        self._cached_stories: List[StoryGroup] = []

    def _compute_dataset_signature(self, df: pd.DataFrame) -> str:
        """Computes a lightweight hash from article count and sample IDs."""
        if df.empty:
            return "empty"
        count = len(df)
        head_ids = "-".join(df["article_id"].astype(str).head(5).tolist())
        tail_ids = "-".join(df["article_id"].astype(str).tail(5).tolist())
        return f"{count}_{head_ids}_{tail_ids}"

    def group_articles(self, df: pd.DataFrame, force_recompute: bool = False) -> List[StoryGroup]:
        """
        Groups articles into coherent story clusters.
        Reuses TF-IDF vectorization and cosine similarity.
        """
        if df.empty:
            return []

        sig = self._compute_dataset_signature(df)
        if not force_recompute and self._cache_signature == sig and self._cached_stories:
            return self._cached_stories

        # Clean text list
        texts = []
        clean_df = df.copy().reset_index(drop=True)
        for _, row in clean_df.iterrows():
            t = str(row.get("title", ""))
            d = str(row.get("description", ""))
            c = str(row.get("combined_text", ""))
            txt = f"{t} {d} {c}".strip()
            texts.append(txt if txt else "news dispatch")

        # 1. TF-IDF Representation
        vectorizer = TfidfVectorizer(
            max_features=2500,
            stop_words="english",
            ngram_range=(1, 1),
            sublinear_tf=True,
            min_df=1
        )
        tfidf_matrix = vectorizer.fit_transform(texts)
        feature_names = vectorizer.get_feature_names_out()

        # 2. Pairwise Cosine Similarity
        sim_matrix = cosine_similarity(tfidf_matrix)

        # 3. Partition articles by category first to prevent cross-category conflation
        n = len(clean_df)
        categories = clean_df["predicted_category"].unique()
        story_groups: List[StoryGroup] = []
        cluster_id_counter = 1

        for cat in categories:
            cat_indices = clean_df[clean_df["predicted_category"] == cat].index.tolist()
            if not cat_indices:
                continue

            # Connected components / Agglomerative clustering within category
            visited = set()
            for idx in cat_indices:
                if idx in visited:
                    continue

                # Find all articles with similarity >= threshold to this article or its cluster
                cluster_members = [idx]
                visited.add(idx)

                for other_idx in cat_indices:
                    if other_idx not in visited:
                        # Check similarity to cluster seed
                        sim_to_seed = sim_matrix[idx, other_idx]
                        if sim_to_seed >= self.similarity_threshold:
                            cluster_members.append(other_idx)
                            visited.add(other_idx)

                # Now build the StoryGroup
                cluster_sub_df = clean_df.iloc[cluster_members]
                cluster_article_refs = []
                distinct_sources = set()

                for _, a_row in cluster_sub_df.iterrows():
                    art_id = str(a_row.get("article_id", ""))
                    t = str(a_row.get("title", ""))
                    d = str(a_row.get("description", "")) if pd.notna(a_row.get("description")) else ""
                    comb = str(a_row.get("combined_text", ""))
                    pred_cat = str(a_row.get("predicted_category", cat))
                    conf = float(a_row.get("confidence", 0.0))
                    unc = bool(a_row.get("is_uncertain", False))
                    src = extract_source_from_text(t, comb)
                    distinct_sources.add(src)

                    cluster_article_refs.append(StoryArticleRef(
                        article_id=art_id,
                        title=t,
                        description=d,
                        combined_text=comb,
                        predicted_category=pred_cat,
                        confidence=conf,
                        is_uncertain=unc,
                        source=src,
                        published_date="Recent Dispatch"
                    ))

                # Cohesion: mean intra-cluster similarity
                if len(cluster_members) > 1:
                    sub_sim = sim_matrix[np.ix_(cluster_members, cluster_members)]
                    cohesion = float(np.mean(sub_sim))
                else:
                    cohesion = 0.85

                # Extract top keywords for cluster
                sub_tfidf = tfidf_matrix[cluster_members].mean(axis=0)
                top_term_indices = np.argsort(np.asarray(sub_tfidf).ravel())[::-1][:4]
                keywords = [feature_names[k].title() for k in top_term_indices]
                subcategory = " ".join(keywords[:2]) if keywords else f"{cat} Desk"

                # Pick representative lead article:
                # Rank members by highest confidence and complete title length
                lead_ref = max(cluster_article_refs, key=lambda a: (a.confidence, len(a.title)))

                # Formulate excerpt
                excerpt = lead_ref.description if lead_ref.description else (
                    lead_ref.combined_text[:160] + "..." if len(lead_ref.combined_text) > 160 else lead_ref.combined_text
                )

                story_id = f"story-{cat.lower()[:4]}-{cluster_id_counter:03d}"
                cluster_id_counter += 1

                story_group = StoryGroup(
                    story_id=story_id,
                    representative_headline=lead_ref.title,
                    lead_article_id=lead_ref.article_id,
                    main_category=cat,
                    subcategory=subcategory,
                    excerpt=excerpt,
                    articles=cluster_article_refs,
                    article_ids=[a.article_id for a in cluster_article_refs],
                    distinct_sources=sorted(list(distinct_sources)),
                    distinct_sources_count=len(distinct_sources),
                    related_articles_count=len(cluster_article_refs),
                    cluster_cohesion=round(cohesion, 3),
                    top_keywords=keywords,
                    published_date=lead_ref.published_date,
                    lead_source=lead_ref.source,
                    lead_confidence=lead_ref.confidence
                )
                story_groups.append(story_group)

        self._cache_signature = sig
        self._cached_stories = story_groups
        logger.info(f"Grouped {n} articles into {len(story_groups)} story clusters.")
        return story_groups


story_clustering_engine = StoryClusteringEngine(similarity_threshold=0.25)
