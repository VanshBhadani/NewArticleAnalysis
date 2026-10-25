"""
NewsPulse AI — Analytics & Model Evaluation Workspace
Interactive Plotly visualizations for editorial topic proportions, confidence distributions, and MLlib metrics.
"""

import streamlit as st
import pandas as pd

from src.config import settings, CATEGORY_MAP
from src.ui.styles import inject_custom_styles
from src.ui.components import render_topbar, render_section_header, render_metric_card
from src.ui.charts import (
    plot_category_distribution,
    plot_confidence_distribution,
    plot_confusion_matrix,
    plot_per_class_metrics,
    plot_job_duration_history
)
from src.analytics.metrics import compute_confidence_buckets
from src.jobs.repository import job_repo
from src.spark.inference import get_model_metadata


def render_analytics_page():
    inject_custom_styles()
    render_topbar("Analytics")
    render_section_header(
        "Editorial Analytics & Evaluation Intelligence",
        "Deep analytical telemetry across classification distributions, model evaluation benchmarks, and job throughput."
    )

    # Tabs for separation of Operational Predictions vs Model Evaluation
    tab_prod, tab_model = st.tabs(["Production Batch Telemetry", "Model Evaluation & Benchmarks"])

    # TAB 1: PRODUCTION BATCH TELEMETRY
    with tab_prod:
        active_df = st.session_state.get("active_batch_results")
        recent_jobs = job_repo.list_jobs(limit=20)

        if active_df is not None and not active_df.empty:
            st.markdown(
                f"<div style='font-size:0.85rem; color:#4B5563; margin-bottom:1rem;'>"
                f"Analyzing active batch of <strong>{len(active_df):,} records</strong>"
                f"</div>",
                unsafe_allow_html=True
            )

            # Metrics row
            col_m1, col_m2, col_m3 = st.columns(3)
            with col_m1:
                render_metric_card("Classified Records", f"{len(active_df):,}")
            with col_m2:
                render_metric_card("Mean Confidence", f"{active_df['confidence'].mean()*100:.1f}%")
            with col_m3:
                uncertain_cnt = active_df["is_uncertain"].sum() if "is_uncertain" in active_df.columns else 0
                render_metric_card("Uncertain Dispatches", f"{uncertain_cnt:,}", "Flagged for editorial audit")

            st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)

            # Charts Row
            c1, c2 = st.columns(2)
            with c1:
                cat_counts = active_df["predicted_category"].value_counts().to_dict()
                for c in CATEGORY_MAP.values():
                    cat_counts.setdefault(c, 0)
                fig_cat = plot_category_distribution(cat_counts)
                st.plotly_chart(fig_cat, use_container_width=True)

            with c2:
                conf_bins = compute_confidence_buckets(active_df)
                fig_conf = plot_confidence_distribution(conf_bins["labels"], conf_bins["counts"])
                st.plotly_chart(fig_conf, use_container_width=True)
        else:
            st.info("No active batch loaded in current session. Submit a job in Batch Processing to view distribution analytics.")

        # Job Performance History Timeline
        st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)
        st.subheader("Spark Processing Duration & Throughput History")
        fig_jobs = plot_job_duration_history(recent_jobs)
        st.plotly_chart(fig_jobs, use_container_width=True)

    # TAB 2: MODEL EVALUATION & BENCHMARKS
    with tab_model:
        st.markdown(
            """
            <div style="font-size:0.875rem; color:#4B5563; margin-bottom:1rem;">
                Official evaluation metrics computed on the AG News test split using Spark MLlib's 
                <code>MulticlassClassificationEvaluator</code>. Training features were strictly fitted on the train split only.
            </div>
            """,
            unsafe_allow_html=True
        )

        model_meta = get_model_metadata()

        if model_meta and "metrics" in model_meta:
            metrics = model_meta["metrics"]

            # Key Metric Cards
            em1, em2, em3, em4 = st.columns(4)
            with em1:
                render_metric_card("Test Accuracy", f"{metrics.get('accuracy', 0)*100:.1f}%")
            with em2:
                render_metric_card("Weighted F1 Score", f"{metrics.get('f1_score', 0)*100:.1f}%")
            with em3:
                render_metric_card("Weighted Precision", f"{metrics.get('weighted_precision', 0)*100:.1f}%")
            with em4:
                render_metric_card("Weighted Recall", f"{metrics.get('weighted_recall', 0)*100:.1f}%")

            st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)

            # Confusion Matrix and Per-Class Scores
            mc1, mc2 = st.columns([1.1, 1.0])

            with mc1:
                cm = metrics.get("confusion_matrix")
                if cm:
                    fig_cm = plot_confusion_matrix(cm["matrix"], cm["labels"])
                    st.plotly_chart(fig_cm, use_container_width=True)

            with mc2:
                per_class = metrics.get("per_class")
                if per_class:
                    fig_pc = plot_per_class_metrics(per_class)
                    st.plotly_chart(fig_pc, use_container_width=True)

            # Detailed Per-Class Table
            st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
            st.subheader("Per-Desk Statistical Breakdown")
            if per_class:
                rows = []
                for desk, scores in per_class.items():
                    rows.append({
                        "Editorial Desk": desk,
                        "Precision": f"{scores['precision']*100:.2f}%",
                        "Recall": f"{scores['recall']*100:.2f}%",
                        "F1 Score": f"{scores['f1']*100:.2f}%"
                    })
                st.table(pd.DataFrame(rows))
        else:
            st.warning("Model evaluation metrics not yet generated. Please visit Model Lab to train the active model.")
