"""
NewsPulse AI — Reusable Editorial UI Components
Constructs consistent, accessible components adhering to editorial design principles.
"""

from typing import Optional, List
import streamlit as st
from src.config import settings, CATEGORY_MAP, CATEGORY_COLORS
from src.spark.session import get_spark_diagnostics


def render_section_header(title: str, subtitle: Optional[str] = None):
    """Renders an editorial page header with clean serif typography."""
    sub_html = f"<div style='font-size:0.9rem; color:#4B5563; margin-top:0.25rem; line-height:1.4;'>{subtitle}</div>" if subtitle else ""
    st.markdown(
        f"""
        <div style="margin-bottom: 1.15rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.65rem;">
            <h1 class="editorial-heading" style="font-size: 1.75rem; margin: 0; line-height:1.2;">{title}</h1>
            {sub_html}
        </div>
        """,
        unsafe_allow_html=True
    )


def render_topbar(page_title: str):
    """Renders the top application context bar with real status indicators."""
    spark_info = get_spark_diagnostics()
    is_cloud = settings.execution_mode == "aws" and settings.is_aws_configured()
    
    cloud_badge_class = "status-badge-cloud" if is_cloud else "status-badge-local"
    cloud_badge_text = "AWS Cloud (EC2/S3)" if is_cloud else "Local Environment"

    spark_ver = spark_info.get('spark_version', '4.2.0')
    spark_badge_text = f"PySpark {spark_ver} Active"

    st.markdown(
        f"""
        <div class="editorial-topbar" style="margin-bottom: 1rem; padding: 0.65rem 1rem;">
            <div class="topbar-breadcrumbs" style="display:flex; align-items:center; gap:0.4rem;">
                <span style="font-weight:700; color:#111827; letter-spacing:0.02em;">NEWSPULSE AI</span>
                <span style="color:#D1D5DB;">/</span>
                <span style="color:#6B7280; font-weight:500;">{page_title}</span>
            </div>
            <div class="topbar-badge-container">
                <span class="status-badge {cloud_badge_class}">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color:{'#059669' if is_cloud else '#6B7280'};"></span>
                    {cloud_badge_text}
                </span>
                <span class="status-badge status-badge-spark">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color:#2563EB;"></span>
                    {spark_badge_text}
                </span>
                <span class="status-badge" style="background-color:#F3F4F6; color:#4B5563; border:1px solid #E5E7EB;">
                    {settings.active_model_version}
                </span>
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )


def render_category_badge(category: str) -> str:
    """Returns HTML for an editorial category badge."""
    c_lower = category.lower().replace("/", "")
    css_class = f"cat-{c_lower}" if c_lower in ["world", "sports", "business", "scitech"] else "cat-world"
    return f'<span class="category-pill {css_class}">{category}</span>'


def render_metric_card(label: str, value: str, subtext: str = ""):
    """Renders a styled editorial metric card with tabular numerals."""
    st.markdown(
        f"""
        <div class="editorial-card">
            <div class="card-label">{label}</div>
            <div class="card-value">{value}</div>
            <div class="card-subtext">{subtext}</div>
        </div>
        """,
        unsafe_allow_html=True
    )


def render_alert_box(message: str, level: str = "info"):
    """Renders a restrained alert box."""
    colors = {
        "info": ("#EFF6FF", "#1E40AF", "#BFDBFE"),
        "success": ("#ECFDF5", "#065F46", "#A7F3D0"),
        "warning": ("#FFFBEB", "#92400E", "#FDE68A"),
        "error": ("#FEF2F2", "#991B1B", "#FECACA")
    }
    bg, fg, border = colors.get(level, colors["info"])
    st.markdown(
        f"""
        <div style="background-color:{bg}; color:{fg}; border:1px solid {border}; border-radius:4px; padding:0.75rem 1rem; font-size:0.875rem; margin-bottom:1rem;">
            {message}
        </div>
        """,
        unsafe_allow_html=True
    )
