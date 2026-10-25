"""
NewsPulse AI — Editorial Plotly Chart Library
Produces restrained, publication-grade analytical charts matching editorial minimalism.
"""

from typing import Dict, List, Any
import plotly.graph_objects as go
import plotly.express as px
from src.config import CATEGORY_COLORS

EDITORIAL_FONT = "Plus Jakarta Sans, sans-serif"
COLOR_SEQUENCE = ["#1E3A8A", "#047857", "#B45309", "#4338CA", "#0D5C3A"]


def _apply_editorial_layout(fig: go.Figure, title: str = "", height: int = 340) -> go.Figure:
    """Applies common editorial typography, restrained borders, and muted grids."""
    fig.update_layout(
        title=dict(
            text=title,
            font=dict(family=EDITORIAL_FONT, size=15, color="#111827"),
            x=0.0,
            y=0.96
        ) if title else None,
        height=height,
        margin=dict(l=35, r=20, t=45 if title else 25, b=35),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family=EDITORIAL_FONT, size=12, color="#4B5563"),
        xaxis=dict(
            gridcolor="#F3F4F6",
            zerolinecolor="#E5E7EB",
            tickfont=dict(size=11, color="#6B7280"),
            linecolor="#E5E7EB"
        ),
        yaxis=dict(
            gridcolor="#F3F4F6",
            zerolinecolor="#E5E7EB",
            tickfont=dict(size=11, color="#6B7280"),
            linecolor="#E5E7EB"
        ),
        legend=dict(
            font=dict(size=11),
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        )
    )
    return fig


def plot_category_distribution(cat_counts: Dict[str, int]) -> go.Figure:
    """Renders a clean horizontal bar chart showing category proportions."""
    categories = list(cat_counts.keys())
    counts = list(cat_counts.values())
    colors = [CATEGORY_COLORS.get(c, "#0D5C3A") for c in categories]

    fig = go.Figure(go.Bar(
        x=counts,
        y=categories,
        orientation='h',
        marker=dict(color=colors, line=dict(color="#D1D5DB", width=1)),
        text=counts,
        textposition="outside",
        hovertemplate="<b>%{y}</b>: %{x} articles<extra></extra>"
    ))

    _apply_editorial_layout(fig, title="Article Category Distribution")
    fig.update_layout(yaxis=dict(autorange="reversed"))
    return fig


def plot_confidence_distribution(labels: List[str], counts: List[int]) -> go.Figure:
    """Renders a histogram of prediction confidence bins."""
    fig = go.Figure(go.Bar(
        x=labels,
        y=counts,
        marker=dict(color="#0D5C3A", line=dict(color="#09472C", width=1)),
        text=counts,
        textposition="auto",
        hovertemplate="<b>Confidence Bin</b>: %{x}<br><b>Count</b>: %{y}<extra></extra>"
    ))

    _apply_editorial_layout(fig, title="Prediction Confidence Distribution")
    fig.update_xaxes(title_text="Confidence Interval")
    fig.update_yaxes(title_text="Article Count")
    return fig


def plot_confusion_matrix(matrix: List[List[int]], labels: List[str]) -> go.Figure:
    """Renders an interactive confusion matrix heatmap."""
    fig = go.Figure(data=go.Heatmap(
        z=matrix,
        x=labels,
        y=labels,
        colorscale=[
            [0.0, "#FBFBF9"],
            [0.2, "#E8F5EE"],
            [0.5, "#6EE7B7"],
            [0.8, "#047857"],
            [1.0, "#0D5C3A"]
        ],
        text=matrix,
        texttemplate="%{text}",
        textfont=dict(family=EDITORIAL_FONT, size=13),
        hovertemplate="<b>Actual</b>: %{y}<br><b>Predicted</b>: %{x}<br><b>Count</b>: %{z}<extra></extra>",
        showscale=False
    ))

    _apply_editorial_layout(fig, title="Model Evaluation — Confusion Matrix", height=380)
    fig.update_xaxes(title_text="Predicted Desk")
    fig.update_yaxes(title_text="True Desk", autorange="reversed")
    return fig


def plot_per_class_metrics(per_class: Dict[str, Dict[str, float]]) -> go.Figure:
    """Renders a grouped bar chart comparing Precision, Recall, and F1 across categories."""
    classes = list(per_class.keys())
    precisions = [per_class[c]["precision"] * 100 for c in classes]
    recalls = [per_class[c]["recall"] * 100 for c in classes]
    f1s = [per_class[c]["f1"] * 100 for c in classes]

    fig = go.Figure()
    fig.add_trace(go.Bar(name="Precision", x=classes, y=precisions, marker_color="#1E3A8A"))
    fig.add_trace(go.Bar(name="Recall", x=classes, y=recalls, marker_color="#047857"))
    fig.add_trace(go.Bar(name="F1 Score", x=classes, y=f1s, marker_color="#B45309"))

    _apply_editorial_layout(fig, title="Per-Class Performance (Precision / Recall / F1 %)")
    fig.update_yaxes(range=[0, 105], title_text="Score (%)")
    fig.update_layout(barmode="group")
    return fig


def plot_job_duration_history(jobs: List[Any]) -> go.Figure:
    """Renders a timeline of recent batch job durations and throughput."""
    if not jobs:
        fig = go.Figure()
        _apply_editorial_layout(fig, title="Job History Timeline")
        return fig

    # Take 15 most recent
    subset = jobs[:15]
    job_ids = [j.job_id for j in subset]
    durations = [j.duration_seconds for j in subset]
    throughputs = [j.throughput for j in subset]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=job_ids,
        y=durations,
        name="Duration (s)",
        marker_color="#0D5C3A",
        hovertemplate="<b>Job</b>: %{x}<br><b>Duration</b>: %{y}s<extra></extra>"
    ))
    fig.add_trace(go.Scatter(
        x=job_ids,
        y=throughputs,
        name="Throughput (art/s)",
        yaxis="y2",
        mode="lines+markers",
        line=dict(color="#B45309", width=2),
        marker=dict(size=6),
        hovertemplate="<b>Job</b>: %{x}<br><b>Throughput</b>: %{y} art/s<extra></extra>"
    ))

    _apply_editorial_layout(fig, title="Recent Job Execution Duration & Throughput")
    fig.update_layout(
        yaxis2=dict(
            title="Throughput (art/s)",
            overlaying="y",
            side="right",
            gridcolor="rgba(0,0,0,0)",
            tickfont=dict(size=10, color="#B45309")
        )
    )
    return fig
