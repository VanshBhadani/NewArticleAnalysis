"""
NewsPulse AI — UI Styling & Theme Injector
Injects the editorial design system CSS into the Streamlit session.
"""

from pathlib import Path
import streamlit as st
from src.config import settings

CSS_PATH = Path(__file__).resolve().parent.parent.parent / "assets" / "style.css"


def inject_custom_styles():
    """Reads assets/style.css and injects it into the Streamlit head."""
    if CSS_PATH.exists():
        with open(CSS_PATH, "r", encoding="utf-8") as f:
            css = f.read()
            st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)
    else:
        # Fallback inline basic styles
        st.markdown(
            """
            <style>
            html, body, [data-testid="stAppViewContainer"] {
                background-color: #FBFBF9 !important;
                color: #111827 !important;
            }
            </style>
            """,
            unsafe_allow_html=True
        )
