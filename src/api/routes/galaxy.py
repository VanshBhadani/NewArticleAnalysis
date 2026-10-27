"""
NewsPulse AI — News Galaxy Visualization API Routes
Provides synchronized spatial nodes, similarity edges, cluster centroids,
and filterable news graph coordinates for Tile, Galaxy, and Table views.
"""

from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Query
from pydantic import BaseModel

from src.data.dataset_service import dataset_service
from src.taxonomy.topic_discovery import topic_discovery, GalaxyGraphData

router = APIRouter(prefix="/galaxy", tags=["News Galaxy"])

# In-memory cache for graph layout to avoid full recomputation on every filter/pan
_CACHED_GRAPH: Optional[GalaxyGraphData] = None
_CACHED_DATASET_HASH: Optional[str] = None


def _get_or_compute_galaxy(df) -> GalaxyGraphData:
    global _CACHED_GRAPH, _CACHED_DATASET_HASH
    # Hash dataset fingerprint (length + first/last ids)
    if df.empty:
        return GalaxyGraphData(nodes=[], edges=[], clusters=[], emerging_candidates=[])

    fingerprint = f"{len(df)}_{df['article_id'].iloc[0]}_{df['article_id'].iloc[-1]}"
    if _CACHED_GRAPH is not None and _CACHED_DATASET_HASH == fingerprint:
        return _CACHED_GRAPH

    computed = topic_discovery.analyze_corpus(df)
    _CACHED_GRAPH = computed
    _CACHED_DATASET_HASH = fingerprint
    return computed


class GalaxyResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    clusters: List[Dict[str, Any]]
    emerging_candidates: List[Dict[str, Any]]
    total_nodes: int
    total_clusters: int


@router.get("", response_model=GalaxyResponse)
def get_galaxy_graph(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    max_confidence: float = Query(1.0, ge=0.0, le=1.0),
):
    """
    Returns filtered 2D spatial graph, similarity edges, and topic clusters
    for the News Galaxy visualization.
    """
    df = dataset_service.get_active_dataframe()
    graph_data = _get_or_compute_galaxy(df)

    filtered_nodes = graph_data.nodes

    # Apply search filter
    if search and search.strip():
        q = search.strip().lower()
        filtered_nodes = [
            n for n in filtered_nodes
            if q in n["title"].lower() or q in n["description"].lower() or any(q in kw.lower() for kw in n["top_keywords"])
        ]

    # Apply category filter
    if category and category.lower() not in ("all", "all categories"):
        filtered_nodes = [
            n for n in filtered_nodes
            if n["predicted_category"].lower() == category.lower()
        ]

    # Apply subcategory filter
    if subcategory and subcategory.lower() not in ("all", "all subcategories"):
        filtered_nodes = [
            n for n in filtered_nodes
            if n["subcategory"].lower() == subcategory.lower()
        ]

    # Apply confidence filter
    filtered_nodes = [
        n for n in filtered_nodes
        if min_confidence <= n["confidence"] <= max_confidence
    ]

    # Apply status filter
    if status:
        st = status.lower()
        if "decisive" in st:
            filtered_nodes = [n for n in filtered_nodes if not n["is_uncertain"]]
        elif "uncertain" in st:
            filtered_nodes = [n for n in filtered_nodes if n["is_uncertain"]]

    # Filter edges to only include links between retained nodes
    valid_ids = {n["article_id"] for n in filtered_nodes}
    filtered_edges = [
        e for e in graph_data.edges
        if e["source"] in valid_ids and e["target"] in valid_ids
    ]

    # Compute retained clusters
    retained_cluster_ids = {n["cluster_id"] for n in filtered_nodes}
    filtered_clusters = [
        c for c in graph_data.clusters
        if c["cluster_id"] in retained_cluster_ids
    ]

    return GalaxyResponse(
        nodes=filtered_nodes,
        edges=filtered_edges,
        clusters=filtered_clusters,
        emerging_candidates=graph_data.emerging_candidates,
        total_nodes=len(filtered_nodes),
        total_clusters=len(filtered_clusters)
    )
