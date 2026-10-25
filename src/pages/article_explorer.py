"""
NewsPulse AI — Article Explorer Page
Interactive editorial library with multi-parameter filtering, search, detail inspection, and CSV export.
"""

import math
from pathlib import Path
import streamlit as st
import pandas as pd

from src.config import settings, CATEGORY_MAP
from src.ui.styles import inject_custom_styles
from src.ui.components import render_topbar, render_section_header, render_category_badge
from src.data.ingestion import create_sample_batch_csv


def render_article_explorer_page():
    inject_custom_styles()
    render_topbar("Article Explorer")
    render_section_header(
        "Editorial Article Library",
        "Search, filter, inspect prediction confidence, and export classified editorial records."
    )

    # 1. Retrieve dataset: active session predictions, or load latest processed file
    df = st.session_state.get("active_batch_results")
    if df is None or df.empty:
        # Check processed directory for recent output
        processed_files = list(settings.processed_data_dir.glob("predictions_*.csv"))
        if processed_files:
            latest_file = max(processed_files, key=lambda f: f.stat().st_mtime)
            df = pd.read_csv(latest_file)
            st.session_state["active_batch_results"] = df
        else:
            # Fallback prompt
            st.info(
                "No articles currently classified in session. Submit a job in "
                "**Batch Processing** or load the sample batch to explore articles."
            )
            if st.button("Load Sample Demonstration Batch"):
                sample_path = settings.data_dir / "sample_news_batch.csv"
                if not sample_path.exists():
                    create_sample_batch_csv()
                from src.data.validation import validate_and_preprocess_dataframe
                from src.jobs.manager import job_manager
                sample_raw = pd.read_csv(sample_path)
                acc, rej, _ = validate_and_preprocess_dataframe(sample_raw)
                with st.spinner("Processing sample demonstration batch with PySpark..."):
                    _, enriched = job_manager.submit_batch_job(acc, "sample_news_batch.csv")
                    st.session_state["active_batch_results"] = enriched
                    st.rerun()
            return

    # 2. Filters & Controls Bar
    f_col1, f_col2, f_col3, f_col4 = st.columns([1.5, 1.0, 1.0, 1.0])

    with f_col1:
        search_query = st.text_input("Search headline or text", placeholder="Type keyword...").strip().lower()

    with f_col2:
        category_options = ["All Categories"] + list(CATEGORY_MAP.values())
        selected_category = st.selectbox("Category Desk", category_options)

    with f_col3:
        status_filter = st.selectbox("Editorial Status", ["All Records", "Decisive (>= 45%)", "Uncertain Review (< 45%)"])

    with f_col4:
        sort_by = st.selectbox("Sort Order", ["Highest Confidence", "Lowest Confidence", "Headline (A-Z)"])

    # Confidence Range slider
    min_conf, max_conf = st.slider("Confidence Range", 0.0, 1.0, (0.0, 1.0), step=0.05)

    # 3. Apply Filtering
    filtered = df.copy()

    if search_query:
        mask = (
            filtered["title"].fillna("").str.lower().str.contains(search_query) |
            filtered["combined_text"].fillna("").str.lower().str.contains(search_query)
        )
        filtered = filtered[mask]

    if selected_category != "All Categories":
        filtered = filtered[filtered["predicted_category"] == selected_category]

    if status_filter == "Decisive (>= 45%)":
        filtered = filtered[filtered["confidence"] >= 0.45]
    elif status_filter == "Uncertain Review (< 45%)":
        filtered = filtered[filtered["confidence"] < 0.45]

    filtered = filtered[(filtered["confidence"] >= min_conf) & (filtered["confidence"] <= max_conf)]

    if sort_by == "Highest Confidence":
        filtered = filtered.sort_values(by="confidence", ascending=False)
    elif sort_by == "Lowest Confidence":
        filtered = filtered.sort_values(by="confidence", ascending=True)
    elif sort_by == "Headline (A-Z)":
        filtered = filtered.sort_values(by="title", ascending=True)

    # Metrics summary of current view
    st.markdown(
        f"<div style='font-size:0.85rem; color:#4B5563; margin-bottom:0.75rem;'>"
        f"Displaying <strong>{len(filtered):,}</strong> of {len(df):,} articles"
        f"</div>",
        unsafe_allow_html=True
    )

    # 4. Pagination
    page_size = 10
    total_pages = max(1, math.ceil(len(filtered) / page_size))
    
    p_col1, p_col2 = st.columns([1, 4])
    with p_col1:
        current_page = st.number_input("Page", min_value=1, max_value=total_pages, value=1, step=1)
    with p_col2:
        st.markdown(f"<div style='margin-top:1.85rem; font-size:0.85rem; color:#6B7280;'>Page {current_page} of {total_pages}</div>", unsafe_allow_html=True)

    start_idx = (current_page - 1) * page_size
    end_idx = start_idx + page_size
    page_records = filtered.iloc[start_idx:end_idx]

    # 5. Render Article Cards
    if page_records.empty:
        st.warning("No articles match the current filter criteria.")
    else:
        for idx, row in page_records.iterrows():
            with st.expander(f"{row['title']} — [{row['predicted_category']}] ({row['confidence']*100:.1f}%)"):
                col_a, col_b = st.columns([1.8, 1.2])
                with col_a:
                    st.markdown(f"**Article ID:** `{row['article_id']}`")
                    st.markdown(f"**Headline:** {row['title']}")
                    st.markdown(f"**Content Excerpt:** {row.get('description', row.get('combined_text', ''))}")
                with col_b:
                    st.markdown(f"**Predicted Desk:** {render_category_badge(row['predicted_category'])}", unsafe_allow_html=True)
                    st.markdown(f"**Confidence:** `{row['confidence']*100:.2f}%`")
                    st.markdown(f"**Status:** {'Uncertain Review' if row.get('is_uncertain') else 'Decisive'}")
                    st.markdown("**Probability Distribution:**")
                    probs = {
                        "World": row.get("prob_world", 0.0),
                        "Sports": row.get("prob_sports", 0.0),
                        "Business": row.get("prob_business", 0.0),
                        "Sci/Tech": row.get("prob_scitech", 0.0)
                    }
                    p_df = pd.DataFrame([{"Desk": k, "Prob %": f"{v*100:.1f}%"} for k, v in probs.items()])
                    st.table(p_df)

    # 6. CSV Export of Filtered Results
    st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)
    csv_bytes = filtered.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="Export Current Filtered View (CSV)",
        data=csv_bytes,
        file_name="newspulse_filtered_articles.csv",
        mime="text/csv",
        use_container_width=False
    )
