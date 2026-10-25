"""
NewsPulse AI — Batch Processing Page
Full-cycle distributed batch pipeline: upload, schema mapping, validation, Spark execution, and S3 persistence.
"""

from pathlib import Path
import streamlit as st
import pandas as pd

from src.config import settings, CATEGORY_MAP
from src.ui.styles import inject_custom_styles
from src.ui.components import render_topbar, render_section_header, render_metric_card, render_alert_box, render_category_badge
from src.data.validation import validate_and_preprocess_dataframe, auto_detect_columns
from src.data.ingestion import create_sample_batch_csv
from src.jobs.manager import job_manager


def render_batch_processing_page():
    inject_custom_styles()
    render_topbar("Batch Processing")
    render_section_header(
        "Distributed Batch Pipeline",
        "Ingest news archives, validate record integrity, execute Spark MLlib inference, and persist to cloud storage."
    )

    # 1. Downloadable Sample Template Section
    sample_path = settings.data_dir / "sample_news_batch.csv"
    if not sample_path.exists():
        create_sample_batch_csv()

    top_col1, top_col2 = st.columns([2.5, 1.5])
    with top_col1:
        st.markdown(
            """
            Upload a CSV containing journalistic records or press dispatches. 
            The system validates text schemas, filters duplicates, and routes inputs through the distributed Spark engine.
            """
        )
    with top_col2:
        with open(sample_path, "rb") as f:
            st.download_button(
                label="Download Sample CSV Template",
                data=f.read(),
                file_name="sample_news_batch.csv",
                mime="text/csv",
                use_container_width=True
            )

    st.markdown("<div style='height: 0.75rem;'></div>", unsafe_allow_html=True)

    # 2. File Upload
    uploaded_file = st.file_uploader("Select or Drag & Drop News CSV", type=["csv"])

    if uploaded_file is None:
        st.markdown(
            """
            <div style="background-color:#FFFFFF; border:1px dashed #D1D5DB; border-radius:6px; padding:2.5rem; text-align:center; margin-top:1rem;">
                <div style="font-weight:600; color:#1F2937; margin-bottom:0.35rem;">Awaiting Article Archive</div>
                <div style="font-size:0.85rem; color:#6B7280; max-width:460px; margin:0 auto 1rem auto;">
                    Supported columns include <code>title</code>, <code>headline</code>, <code>description</code>, 
                    <code>summary</code>, <code>text</code>, or <code>body</code>. Download the template above for an authentic test batch.
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
        return

    # Read uploaded file
    try:
        raw_df = pd.read_csv(uploaded_file)
    except Exception as e:
        render_alert_box(f"Could not parse uploaded CSV: {str(e)}", level="error")
        return

    st.success(f"Uploaded `{uploaded_file.name}` ({len(raw_df):,} raw records detected).")

    # 3. Schema & Column Mapping Inspection
    st.subheader("1. Schema Inspection & Column Alignment")
    raw_cols = list(raw_df.columns)
    auto_map = auto_detect_columns(raw_cols)

    c_map1, c_map2, c_map3, c_map4 = st.columns(4)
    with c_map1:
        title_options = ["None"] + raw_cols
        def_title = auto_map.get("title", "None")
        title_idx = title_options.index(def_title) if def_title in title_options else 0
        sel_title = st.selectbox("Headline Column", title_options, index=title_idx)

    with c_map2:
        desc_options = ["None"] + raw_cols
        def_desc = auto_map.get("description", "None")
        desc_idx = desc_options.index(def_desc) if def_desc in desc_options else 0
        sel_desc = st.selectbox("Summary / Description Column", desc_options, index=desc_idx)

    with c_map3:
        text_options = ["None"] + raw_cols
        def_text = auto_map.get("text", "None")
        text_idx = text_options.index(def_text) if def_text in text_options else 0
        sel_text = st.selectbox("Body / Content Column", text_options, index=text_idx)

    with c_map4:
        label_options = ["None (Unlabeled Predictions)"] + raw_cols
        def_lbl = auto_map.get("label", "None (Unlabeled Predictions)")
        lbl_idx = label_options.index(def_lbl) if def_lbl in label_options else 0
        sel_label = st.selectbox("Ground Truth Label (Optional)", label_options, index=lbl_idx)

    custom_mapping = {}
    if sel_title != "None": custom_mapping["title"] = sel_title
    if sel_desc != "None": custom_mapping["description"] = sel_desc
    if sel_text != "None": custom_mapping["text"] = sel_text
    if sel_label != "None (Unlabeled Predictions)": custom_mapping["label"] = sel_label

    # 4. Preprocessing & Validation
    st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
    st.subheader("2. Quality Audit & Record Validation")

    dedup = st.checkbox("Deduplicate identical dispatches", value=True)
    
    acc_df, rej_df, val_summary = validate_and_preprocess_dataframe(
        df=raw_df,
        column_mapping=custom_mapping,
        min_text_length=10,
        deduplicate=dedup
    )

    v1, v2, v3, v4 = st.columns(4)
    with v1:
        render_metric_card("Total Submitted", f"{val_summary.total_records:,}")
    with v2:
        render_metric_card("Accepted Records", f"{val_summary.accepted_records:,}", "Validated for Spark")
    with v3:
        render_metric_card("Rejected Records", f"{val_summary.rejected_records:,}", "Malformed / Empty")
    with v4:
        render_metric_card("Duplicates Filtered", f"{val_summary.duplicate_records:,}")

    if val_summary.rejection_reasons:
        with st.expander("Inspect Validation Issues Breakdown"):
            for reason, count in val_summary.rejection_reasons.items():
                st.write(f"- **{reason}**: {count} records")

    # Sample Preview of Accepted Records
    if not acc_df.empty:
        with st.expander("Preview Accepted Article Records (Top 5)", expanded=False):
            st.dataframe(acc_df[["article_id", "title", "combined_text"]].head(5), use_container_width=True)

    # 5. Spark Batch Execution Submission
    st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
    st.subheader("3. Execute Distributed Spark Processing")

    if acc_df.empty:
        render_alert_box("No valid records to process. Adjust column mappings above.", level="warning")
        return

    is_cloud = settings.execution_mode == "aws" and settings.is_aws_configured()
    st.markdown(
        f"<div style='font-size:0.85rem; color:#4B5563; margin-bottom:0.75rem;'>"
        f"Target Execution Engine: <strong>Apache Spark 4.2.0 (local[*])</strong> &bull; "
        f"Storage Target: <strong>{'Amazon S3 (' + settings.aws_s3_bucket + ')' if is_cloud else 'Local Disk'}</strong>"
        f"</div>",
        unsafe_allow_html=True
    )

    if st.button("Submit Batch Processing Job", type="primary", use_container_width=True):
        progress_bar = st.progress(0, text="Initializing Spark cluster context...")
        
        try:
            progress_bar.progress(25, text="Transforming text features (RegexTokenizer -> StopWords -> HashingTF -> IDF)...")
            job_record, results_df = job_manager.submit_batch_job(
                accepted_df=acc_df,
                dataset_name=uploaded_file.name,
                rejected_count=val_summary.rejected_records
            )
            progress_bar.progress(85, text="Persisting prediction artifacts to storage layer...")
            
            # Store in session state for instant multi-page reflection
            st.session_state["active_batch_results"] = results_df
            st.session_state["latest_job_id"] = job_record.job_id
            
            progress_bar.progress(100, text="Spark batch execution completed successfully!")

            st.success(
                f"Job `{job_record.job_id}` finished successfully! "
                f"Processed **{job_record.processed_records:,} articles** in **{job_record.duration_seconds}s** "
                f"({job_record.throughput} art/s). Storage: `{job_record.output_location}`"
            )

            # Results Table Preview
            st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
            st.subheader("Prediction Results Preview")
            
            display_cols = ["article_id", "title", "predicted_category", "confidence"]
            st.dataframe(results_df[display_cols].head(15), use_container_width=True)

            # Export Button
            out_csv = results_df.to_csv(index=False).encode('utf-8')
            st.download_button(
                label="Download Full Prediction Results (CSV)",
                data=out_csv,
                file_name=f"newspulse_predictions_{job_record.job_id}.csv",
                mime="text/csv"
            )

        except Exception as e:
            progress_bar.empty()
            render_alert_box(f"Spark batch job execution failed: {str(e)}", level="error")
