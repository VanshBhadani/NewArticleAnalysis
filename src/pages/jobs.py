"""
NewsPulse AI — Jobs & Audit History Page
Persistent, inspectable log of batch processing executions with execution modes, timings, and failure forensics.
"""

from pathlib import Path
import streamlit as st
import pandas as pd

from src.config import settings
from src.ui.styles import inject_custom_styles
from src.ui.components import render_topbar, render_section_header, render_metric_card, render_alert_box
from src.jobs.repository import job_repo


def render_jobs_page():
    inject_custom_styles()
    render_topbar("Jobs & Audit History")
    render_section_header(
        "Job Audit & Execution History",
        "Persistent, inspectable operational log of distributed Spark batch processing runs and cloud storage dispatch."
    )

    # 1. Summary Metrics
    audit = job_repo.get_audit_summary()

    m1, m2, m3, m4 = st.columns(4)
    with m1:
        render_metric_card("Total Jobs", f"{audit['total_jobs']:,}")
    with m2:
        render_metric_card("Succeeded Runs", f"{audit['succeeded_jobs']:,}")
    with m3:
        render_metric_card("Failed Runs", f"{audit['failed_jobs']:,}")
    with m4:
        render_metric_card("Mean Duration", f"{audit['avg_duration_sec']}s", f"Throughput: {audit['avg_throughput_art_per_sec']} art/s")

    st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)

    # 2. Filter Bar
    status_filter = st.selectbox(
        "Filter by Execution Status",
        ["All Jobs", "Succeeded", "Failed", "Running", "Queued"]
    )

    jobs = job_repo.list_jobs(limit=100)

    if status_filter != "All Jobs":
        jobs = [j for j in jobs if j.status.lower() == status_filter.lower()]

    if not jobs:
        st.info("No processing jobs match the selected filter.")
        return

    # 3. Jobs Table
    st.subheader("Job Ledger")
    ledger_data = []
    for j in jobs:
        ledger_data.append({
            "Job ID": j.job_id,
            "Submitted": j.submission_time,
            "Execution Mode": j.execution_mode.upper(),
            "Dataset": j.dataset_name,
            "Input": j.input_records,
            "Processed": j.processed_records,
            "Status": j.status.upper(),
            "Duration": f"{j.duration_seconds}s",
            "Throughput": f"{j.throughput} art/s",
            "Storage": j.storage_backend
        })

    ledger_df = pd.DataFrame(ledger_data)
    st.dataframe(ledger_df, use_container_width=True, hide_index=True)

    # 4. Job Forensics & Details Inspector
    st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)
    st.subheader("Job Forensics Inspector")

    job_ids = [j.job_id for j in jobs]
    selected_job_id = st.selectbox("Select Job to Inspect", job_ids)
    selected_job = next((j for j in jobs if j.job_id == selected_job_id), None)

    if selected_job:
        with st.container():
            st.markdown(
                f"""
                <div class="editorial-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem;">
                        <span style="font-size:1.1rem; font-weight:600; color:#111827;">Job ID: <code>{selected_job.job_id}</code></span>
                        <span style="font-size:0.8rem; font-weight:600; padding:0.25rem 0.65rem; border-radius:4px; background-color:{'#ECFDF5' if selected_job.status=='succeeded' else '#FEF2F2'}; color:{'#065F46' if selected_job.status=='succeeded' else '#991B1B'};">
                            {selected_job.status.upper()}
                        </span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; font-size:0.85rem; color:#374151;">
                        <div><strong>Submission Time:</strong> {selected_job.submission_time}</div>
                        <div><strong>Start Time:</strong> {selected_job.start_time or 'N/A'}</div>
                        <div><strong>Completion Time:</strong> {selected_job.completion_time or 'N/A'}</div>
                        <div><strong>Execution Mode:</strong> {selected_job.execution_mode.upper()}</div>
                        <div><strong>Input Records:</strong> {selected_job.input_records:,}</div>
                        <div><strong>Successfully Processed:</strong> {selected_job.processed_records:,}</div>
                        <div><strong>Rejected / Invalid:</strong> {selected_job.failed_records:,}</div>
                        <div><strong>Model Version:</strong> <code>{selected_job.model_version}</code></div>
                        <div><strong>Processing Duration:</strong> {selected_job.duration_seconds}s</div>
                        <div><strong>Throughput:</strong> {selected_job.throughput} articles/sec</div>
                    </div>
                    <div style="font-size:0.85rem; color:#4B5563; margin-top:0.75rem; border-top:1px solid #F3F4F6; padding-top:0.6rem;">
                        <strong>Storage Location:</strong> <code>{selected_job.output_location or 'N/A'}</code> ({selected_job.storage_backend})
                    </div>
                </div>
                """,
                unsafe_allow_html=True
            )

            # Error diagnosis if failed
            if selected_job.status == "failed" and selected_job.error_summary:
                st.error(f"Error Diagnostic: {selected_job.error_summary}")
                if st.button("Rerun Failed Job", key=f"rerun_{selected_job.job_id}"):
                    st.info("Re-queueing job for execution...")
