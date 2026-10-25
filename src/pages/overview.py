"""
NewsPulse AI — Overview Page
Operational dashboard reflecting genuine application state, metrics, and distributed jobs.
"""

import streamlit as st
import pandas as pd
from src.config import settings, CATEGORY_MAP
from src.ui.styles import inject_custom_styles
from src.ui.components import render_topbar, render_section_header, render_metric_card
from src.ui.charts import plot_category_distribution
from src.jobs.repository import job_repo
from src.spark.session import get_spark_diagnostics
from src.spark.inference import get_model_metadata


def render_overview_page():
    inject_custom_styles()
    render_topbar("Overview")
    render_section_header(
        "Editorial Intelligence & Telemetry",
        "Operational overview of real-time classification jobs, distributed Spark execution, and cloud storage."
    )

    # 1. Fetch real audit summary from persistent SQLite database
    audit = job_repo.get_audit_summary()
    recent_jobs = job_repo.list_jobs(limit=5)
    model_meta = get_model_metadata()

    # Active dataset records from session state or latest persistent file
    active_dataset = st.session_state.get("active_batch_results")
    if active_dataset is None or active_dataset.empty:
        processed_files = list(settings.processed_data_dir.glob("predictions_*.csv"))
        if processed_files:
            latest_file = max(processed_files, key=lambda f: f.stat().st_mtime)
            try:
                active_dataset = pd.read_csv(latest_file)
                st.session_state["active_batch_results"] = active_dataset
            except Exception:
                active_dataset = None

    active_records_count = len(active_dataset) if active_dataset is not None else 0

    # 2. Metric Cards Row
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        render_metric_card(
            label="Active Session Articles",
            value=f"{active_records_count:,}",
            subtext="Loaded in memory" if active_records_count > 0 else "No active batch loaded"
        )
    with m2:
        render_metric_card(
            label="Cumulative Processed",
            value=f"{audit['total_processed_records']:,}",
            subtext=f"{audit['total_rejected_records']} rejected / invalid"
        )
    with m3:
        render_metric_card(
            label="Batch Jobs Executed",
            value=f"{audit['succeeded_jobs']}/{audit['total_jobs']}",
            subtext=f"Failed runs: {audit['failed_jobs']}"
        )
    with m4:
        render_metric_card(
            label="Spark Throughput",
            value=f"{audit['avg_throughput_art_per_sec']} art/s",
            subtext=f"Avg run: {audit['avg_duration_sec']}s"
        )

    st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)

    # 3. Main Operational Panels
    col_left, col_right = st.columns([1.1, 1.0])

    with col_left:
        st.subheader("Category Distribution (Recent Batch)")
        if active_dataset is not None and not active_dataset.empty and "predicted_category" in active_dataset.columns:
            counts = active_dataset["predicted_category"].value_counts().to_dict()
            for cat in CATEGORY_MAP.values():
                counts.setdefault(cat, 0)
            fig = plot_category_distribution(counts)
            st.plotly_chart(fig, use_container_width=True)
        else:
            # Show benchmark distribution from model metadata
            st.markdown(
                """
                <div style="background-color:#FFFFFF; border:1px solid #E5E7EB; border-radius:6px; padding:1.5rem; text-align:center;">
                    <div style="font-weight:600; color:#111827; margin-bottom:0.35rem;">No Active Prediction Batch</div>
                    <div style="font-size:0.85rem; color:#6B7280; max-width:420px; margin:0 auto 1rem auto;">
                        Upload a news article CSV in <strong>Batch Processing</strong> to visualize editorial distributions and topic clusters across your dispatches.
                    </div>
                </div>
                """,
                unsafe_allow_html=True
            )

        # Cloud & Storage Diagnostics Card
        st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
        st.subheader("Storage & Execution Architecture")
        
        is_cloud = settings.execution_mode == "aws" and settings.is_aws_configured()
        storage_desc = (
            f"Connected to Amazon S3 bucket <code>{settings.aws_s3_bucket}</code> ({settings.aws_region})"
            if is_cloud else
            f"Local Development Mode &mdash; Artifacts saved to <code>{settings.processed_data_dir.name}/</code>"
        )
        
        st.markdown(
            f"""
            <div class="editorial-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                    <span style="font-size:0.8rem; font-weight:600; text-transform:uppercase; color:#6B7280;">Persistence Layer</span>
                    <span style="font-size:0.75rem; font-weight:600; color:{'#065F46' if is_cloud else '#374151'}; background-color:{'#ECFDF5' if is_cloud else '#F3F4F6'}; padding:0.2rem 0.5rem; border-radius:3px;">
                        {'AWS S3 Active' if is_cloud else 'Local Fallback'}
                    </span>
                </div>
                <div style="font-size:0.875rem; color:#1F2937; margin-bottom:0.75rem;">
                    {storage_desc}
                </div>
                <div style="font-size:0.8rem; color:#4B5563; border-top:1px solid #F3F4F6; padding-top:0.6rem;">
                    <strong>Active Model:</strong> <code>{settings.active_model_version}</code> &bull; 
                    <strong>Spark Engine:</strong> <code>PySpark 4.2.0 (local[*])</code>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )

    with col_right:
        st.subheader("Recent Processing Jobs")
        if recent_jobs:
            job_rows = []
            for j in recent_jobs:
                job_rows.append({
                    "Job ID": j.job_id,
                    "Dataset": j.dataset_name[:20],
                    "Processed": f"{j.processed_records:,}",
                    "Status": j.status.upper(),
                    "Throughput": f"{j.throughput} art/s",
                    "Submitted": j.submission_time[11:19] if len(j.submission_time) >= 19 else j.submission_time
                })
            jobs_df = pd.DataFrame(job_rows)
            st.dataframe(jobs_df, use_container_width=True, hide_index=True)
        else:
            st.info("No processing jobs have been submitted yet.")

        # Editorial Overview Summary
        st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
        st.subheader("Model Benchmark Snapshot")
        if model_meta and "metrics" in model_meta:
            m = model_meta["metrics"]
            acc = m.get("accuracy", 0.0) * 100
            f1 = m.get("f1_score", 0.0) * 100
            prec = m.get("weighted_precision", 0.0) * 100
            rec = m.get("weighted_recall", 0.0) * 100
            
            st.markdown(
                f"""
                <div class="editorial-card">
                    <div style="font-size:0.8rem; font-weight:600; text-transform:uppercase; color:#6B7280; margin-bottom:0.5rem;">
                        AG News 4-Class Benchmark
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; font-size:0.85rem;">
                        <div>Test Accuracy: <strong>{acc:.1f}%</strong></div>
                        <div>Weighted F1: <strong>{f1:.1f}%</strong></div>
                        <div>Precision: <strong>{prec:.1f}%</strong></div>
                        <div>Recall: <strong>{rec:.1f}%</strong></div>
                    </div>
                    <div style="font-size:0.75rem; color:#6B7280; margin-top:0.75rem; border-top:1px solid #F3F4F6; padding-top:0.5rem;">
                        Trained with Spark MLlib Pipeline (Tokenizer + StopWords + HashingTF + IDF + LogisticRegression)
                    </div>
                </div>
                """,
                unsafe_allow_html=True
            )
        else:
            st.write("Model benchmark summary available in Model Lab.")
