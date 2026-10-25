"""
NewsPulse AI — Infrastructure & Diagnostics Page
Inspects real cloud configuration, PySpark runtime, S3 connectivity, and sanitized system parameters.
"""

import sys
import streamlit as st
import pandas as pd

from src.config import settings
from src.ui.styles import inject_custom_styles
from src.ui.components import render_topbar, render_section_header, render_metric_card, render_alert_box
from src.spark.session import get_spark_diagnostics
from src.storage.s3 import storage


def render_infrastructure_page():
    inject_custom_styles()
    render_topbar("Infrastructure & Settings")
    render_section_header(
        "Infrastructure & Cloud Diagnostics",
        "Inspect real-time execution environments, verify Amazon S3 connectivity, and audit runtime configurations."
    )

    spark_diag = get_spark_diagnostics()
    is_aws = settings.execution_mode == "aws" and settings.is_aws_configured()

    # 1. Environment Status Summary Cards
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        render_metric_card(
            "Execution Mode",
            "AWS EC2" if settings.execution_mode == "aws" else "Local Host",
            "Target Environment"
        )
    with c2:
        render_metric_card(
            "Spark Engine",
            spark_diag.get("spark_version", "4.2.0"),
            "PySpark Runtime"
        )
    with c3:
        render_metric_card(
            "Python Version",
            sys.version.split(" ")[0],
            "Host Interpreter"
        )
    with c4:
        render_metric_card(
            "Storage Engine",
            "Amazon S3" if is_aws else "Local Storage",
            "Durable Persistence"
        )

    st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)

    # 2. Amazon S3 Connectivity Diagnostic Workbench
    st.subheader("1. Amazon Web Services (S3) Connectivity Diagnostic")
    st.markdown(
        f"""
        <div style="font-size:0.875rem; color:#4B5563; margin-bottom:0.75rem;">
            Target Bucket: <code>{settings.aws_s3_bucket}</code> &bull; Region: <code>{settings.aws_region}</code> &bull; 
            Auth State: <strong>{'Configured (Keys/IAM)' if settings.is_aws_configured() else 'Unconfigured (Local Fallback)'}</strong>
        </div>
        """,
        unsafe_allow_html=True
    )

    if st.button("Run Live S3 Connectivity Ping", type="primary"):
        with st.spinner("Executing Boto3 head_bucket ping against AWS endpoint..."):
            diag_result = storage.test_connectivity()
            
            st.session_state["last_s3_diag"] = diag_result

    diag = st.session_state.get("last_s3_diag")
    if diag:
        status_level = "success" if diag["status"] == "VERIFIED" else ("warning" if "UNCONFIGURED" in diag["status"] else "error")
        render_alert_box(f"**Diagnostic Status [{diag['status']}]:** {diag['message']} (Latency: {diag['latency_ms']} ms)", level=status_level)

    # 3. Apache Spark Engine Diagnostics
    st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)
    st.subheader("2. Apache Spark Runtime Diagnostics")

    spark_info_rows = [
        {"Parameter": "Spark Version", "Value": str(spark_diag.get("spark_version"))},
        {"Parameter": "Spark Session Active", "Value": str(spark_diag.get("session_active"))},
        {"Parameter": "Master URL", "Value": str(settings.spark_master)},
        {"Parameter": "Driver Memory", "Value": str(settings.spark_driver_memory)},
        {"Parameter": "Log Level", "Value": str(settings.spark_log_level)},
        {"Parameter": "JVM Runtime Version", "Value": str(spark_diag.get("jvm_version", "Java 17 OpenJDK"))},
        {"Parameter": "Python Executable", "Value": str(sys.executable)}
    ]
    st.table(pd.DataFrame(spark_info_rows))

    # 4. Sanitized Configuration Audit (Zero Secret Exposure)
    st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)
    st.subheader("3. Configuration Audit (Sanitized)")

    sanitized = settings.get_sanitized_config()
    cfg_rows = [{"Configuration Key": k, "Configured Value": str(v)} for k, v in sanitized.items()]
    st.table(pd.DataFrame(cfg_rows))

    # 5. Cloud Architecture Security & EC2 Deployment Notes
    st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)
    st.subheader("4. Cloud Architecture & EC2 Deployment Policy")
    st.markdown(
        """
        - **Amazon EC2 Deployment Architecture:** Designed to execute on an Ubuntu 22.04 LTS instance with an attached 
          IAM Instance Profile (least-privilege S3 read/write permissions).
        - **Credential Safety:** AWS access keys and secret tokens are **never** committed to Git, logged to console, 
          or rendered in the browser. In local mode, a transparent local fallback persists data without error.
        - **Memory Guidelines:** For AWS EC2 micro instances (e.g. `t2.micro` or `t3.micro`), PySpark driver memory 
          is capped at 1GB, and shuffle partitions are configured to 2.
        """
    )
