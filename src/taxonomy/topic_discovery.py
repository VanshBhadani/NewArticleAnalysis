"""
NewsPulse AI — Deterministic Topic Discovery Engine
Uses conventional TF-IDF vectorization, cosine similarity, and agglomerative clustering
to discover subcategories, related article graph connections, and emerging topic candidates.
Strictly relies on statistical NLP without LLMs, external APIs, or generative AI.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import AgglomerativeClustering

from src.logging_config import logger
from src.taxonomy.registry import category_registry, CategoryMetadata


@dataclass
class TopicClusterEvidence:
    cluster_id: str
    suggested_name: str
    parent_category: Optional[str]
    size: int
    cohesion_score: float
    separation_score: float
    top_keywords: List[str]
    sample_article_ids: List[str]
    is_emerging_candidate: bool
    status: str = "candidate"  # "active" | "candidate" | "review"


@dataclass
class GalaxyGraphNode:
    article_id: str
    title: str
    description: str
    predicted_category: str
    subcategory: str
    confidence: float
    is_uncertain: bool
    requires_review: bool
    x: float
    y: float
    cluster_id: str
    top_keywords: List[str]
    source: Optional[str] = "Editorial Wire"
    published_date: Optional[str] = "Recent Dispatch"


@dataclass
class GalaxyGraphEdge:
    source: str
    target: str
    similarity: float


@dataclass
class GalaxyGraphData:
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    clusters: List[Dict[str, Any]]
    emerging_candidates: List[Dict[str, Any]]


class TopicDiscoveryEngine:
    """
    Conventional statistical discovery engine.
    Analyzes active article corpus, generates 2D spatial galaxy coordinates,
    builds high-similarity connections, and discovers subcategories/emerging topics.
    """

    def __init__(
        self,
        min_cluster_size: int = 3,
        min_cohesion: float = 0.32,
        similarity_threshold: float = 0.48,
        uncertainty_threshold: float = 0.45
    ):
        self.min_cluster_size = min_cluster_size
        self.min_cohesion = min_cohesion
        self.similarity_threshold = similarity_threshold
        self.uncertainty_threshold = uncertainty_threshold

    def analyze_corpus(self, df: pd.DataFrame) -> GalaxyGraphData:
        """Runs end-to-end TF-IDF similarity, clustering, and galaxy layout calculation."""
        if df.empty:
            return GalaxyGraphData(nodes=[], edges=[], clusters=[], emerging_candidates=[])

        # Prepare text representation
        texts = []
        for _, row in df.iterrows():
            t = str(row.get("title", ""))
            d = str(row.get("description", ""))
            c = str(row.get("combined_text", ""))
            text = f"{t} {d} {c}".strip()
            texts.append(text if text else "news dispatch")

        # 1. TF-IDF Projection
        vectorizer = TfidfVectorizer(
            max_features=2500,
            stop_words="english",
            ngram_range=(1, 2),
            min_df=1
        )
        tfidf_matrix = vectorizer.fit_transform(texts)
        feature_names = vectorizer.get_feature_names_out()

        # 2. Pairwise Cosine Similarity
        sim_matrix = cosine_similarity(tfidf_matrix)

        # 3. Clustering per category to find subcategories
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []
        clusters_meta: List[Dict[str, Any]] = []
        emerging_candidates_meta: List[Dict[str, Any]] = []

        # Find significant edges (similarity >= similarity_threshold)
        n = len(df)
        article_ids = df["article_id"].astype(str).tolist()
        for i in range(n):
            for j in range(i + 1, n):
                sim = float(sim_matrix[i, j])
                if sim >= self.similarity_threshold:
                    edges.append({
                        "source": article_ids[i],
                        "target": article_ids[j],
                        "similarity": round(sim, 3)
                    })

        # Category Centers in 2D Galaxy plane
        category_centers = {
            "world": (-400.0, -320.0),
            "sports": (400.0, -320.0),
            "business": (-400.0, 320.0),
            "scitech": (400.0, 320.0),
            "emerging": (0.0, 0.0),
        }

        # Cluster articles within each predicted category
        categories_found = df["predicted_category"].unique()
        cluster_counter = 0

        # Also isolate uncertain articles
        uncertain_mask = (df["confidence"] < self.uncertainty_threshold) | (df.get("is_uncertain", False) == True)
        uncertain_indices = df[uncertain_mask].index.tolist()

        # Check if uncertain articles form an emerging topic cluster
        if len(uncertain_indices) >= self.min_cluster_size:
            unc_sim = sim_matrix[np.ix_(uncertain_indices, uncertain_indices)]
            unc_cohesion = float(np.mean(unc_sim))
            if unc_cohesion >= self.min_cohesion:
                # Top keywords for uncertain cluster
                unc_tfidf = tfidf_matrix[uncertain_indices].mean(axis=0)
                top_unc_term_indices = np.argsort(np.asarray(unc_tfidf).ravel())[::-1][:4]
                unc_terms = [feature_names[idx].title() for idx in top_unc_term_indices]
                emerging_name = " & ".join(unc_terms[:2])

                # Register emerging candidate in category registry
                registered = category_registry.register_candidate(
                    name=emerging_name,
                    parent_id=None,
                    description=f"Emerging topic cluster detected with {len(uncertain_indices)} stories and cohesion {unc_cohesion:.2f}.",
                    cohesion_score=round(unc_cohesion, 3),
                    keywords=unc_terms,
                    article_count=len(uncertain_indices)
                )

                emerging_candidates_meta.append({
                    "id": registered.id,
                    "name": registered.name,
                    "size": len(uncertain_indices),
                    "cohesion": round(unc_cohesion, 3),
                    "keywords": unc_terms,
                    "color": registered.color,
                    "status": registered.status,
                    "sample_titles": df.loc[uncertain_indices, "title"].head(3).tolist()
                })

        # Process each category partition for subtopics and 2D spatial layout
        np.random.seed(42)  # Deterministic spatial stability

        for cat in categories_found:
            cat_norm = str(cat).lower().replace("/", "")
            center_x, center_y = category_centers.get(cat_norm, (0.0, 0.0))
            cat_df = df[df["predicted_category"] == cat]
            cat_indices = cat_df.index.tolist()
            cat_count = len(cat_indices)

            if cat_count == 0:
                continue

            # Determine number of sub-clusters
            n_clusters = max(1, min(cat_count // 3, 5))
            if cat_count > 1 and n_clusters > 1:
                cat_dist = 1.0 - sim_matrix[np.ix_(cat_indices, cat_indices)]
                cat_dist = np.clip(cat_dist, 0.0, 1.0)
                np.fill_diagonal(cat_dist, 0.0)
                try:
                    clustering = AgglomerativeClustering(
                        n_clusters=n_clusters,
                        metric="precomputed",
                        linkage="average"
                    )
                    sub_labels = clustering.fit_predict(cat_dist)
                except Exception:
                    sub_labels = np.zeros(cat_count, dtype=int)
            else:
                sub_labels = np.zeros(cat_count, dtype=int)

            # Analyze each sub-cluster
            for sub_id in range(n_clusters):
                sub_mask = sub_labels == sub_id
                sub_indices = [cat_indices[idx] for idx, m in enumerate(sub_mask) if m]
                if not sub_indices:
                    continue

                cluster_counter += 1
                cluster_key = f"cluster-{cat_norm}-{sub_id}"

                # Calculate keywords for this subtopic
                sub_tfidf = tfidf_matrix[sub_indices].mean(axis=0)
                top_term_indices = np.argsort(np.asarray(sub_tfidf).ravel())[::-1][:3]
                sub_keywords = [feature_names[k].title() for k in top_term_indices]
                subcategory_name = " ".join(sub_keywords[:2]) if sub_keywords else f"{cat} Desk"

                # Subcluster spatial centroid
                angle = (sub_id / max(1, n_clusters)) * 2 * np.pi
                sub_centroid_x = center_x + np.cos(angle) * 120.0
                sub_centroid_y = center_y + np.sin(angle) * 120.0

                # Compute subcluster cohesion
                if len(sub_indices) > 1:
                    sub_sims = sim_matrix[np.ix_(sub_indices, sub_indices)]
                    cohesion = float(np.mean(sub_sims))
                else:
                    cohesion = 1.0

                clusters_meta.append({
                    "cluster_id": cluster_key,
                    "parent_category": cat,
                    "name": subcategory_name,
                    "keywords": sub_keywords,
                    "size": len(sub_indices),
                    "cohesion": round(cohesion, 3),
                    "centroid_x": round(sub_centroid_x, 1),
                    "centroid_y": round(sub_centroid_y, 1),
                    "color": category_registry.get_category(cat_norm).color if category_registry.get_category(cat_norm) else "#0F766E"
                })

                # Position nodes around subcluster centroid with collision avoidance
                for idx_in_sub, global_idx in enumerate(sub_indices):
                    row = df.iloc[global_idx]
                    local_angle = (idx_in_sub / max(1, len(sub_indices))) * 2 * np.pi + np.random.uniform(-0.2, 0.2)
                    local_radius = 35.0 + (idx_in_sub % 3) * 25.0 + np.random.uniform(-10, 10)

                    node_x = sub_centroid_x + np.cos(local_angle) * local_radius
                    node_y = sub_centroid_y + np.sin(local_angle) * local_radius

                    conf = float(row.get("confidence", 0.5))
                    is_unc = bool(row.get("is_uncertain", False)) or (conf < self.uncertainty_threshold)

                    nodes.append({
                        "article_id": str(row.get("article_id", f"art-{global_idx}")),
                        "title": str(row.get("title", "")),
                        "description": str(row.get("description", ""))[:200],
                        "combined_text": str(row.get("combined_text", ""))[:300],
                        "predicted_category": str(row.get("predicted_category", cat)),
                        "subcategory": subcategory_name,
                        "confidence": round(conf, 4),
                        "is_uncertain": is_unc,
                        "requires_review": is_unc and (len(sub_indices) < self.min_cluster_size),
                        "x": round(node_x, 1),
                        "y": round(node_y, 1),
                        "cluster_id": cluster_key,
                        "top_keywords": sub_keywords,
                        "source": str(row.get("source", "Editorial Dispatch")),
                        "published_date": str(row.get("published_date", "Today"))
                    })

        # Update article counts in registry
        cat_counts = df["predicted_category"].value_counts().to_dict()
        category_registry.update_article_counts({k: int(v) for k, v in cat_counts.items()})

        return GalaxyGraphData(
            nodes=nodes,
            edges=edges,
            clusters=clusters_meta,
            emerging_candidates=emerging_candidates_meta
        )


topic_discovery = TopicDiscoveryEngine()
