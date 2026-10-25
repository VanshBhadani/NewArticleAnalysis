"""
NewsPulse AI — Model Lab Page
Detailed inspectable architecture of the Spark MLlib pipeline, training parameters, evaluation, and retraining.
"""

from pathlib import Path
import streamlit as st
import pandas as pd

from src.config import settings, CATEGORY_MAP
from src.ui.styles import inject_custom_styles
from src.ui.components import render_topbar, render_section_header, render_metric_card, render_alert_box
from src.ui.charts import plot_confusion_matrix, plot_per_class_metrics
from src.spark.inference import get_model_metadata
from src.spark.training import train_and_evaluate_model
from src.data.ingestion import load_ag_news_benchmark


def render_model_lab_page():
    inject_custom_styles()
    render_topbar("Model Lab")
    render_section_header(
        "Model Lab & MLlib Pipeline Governance",
        "Inspect Spark ML feature extraction stages, hyperparameters, benchmark evaluation, and artifact lineage."
    )

    metadata = get_model_metadata()

    # 1. Pipeline Architecture Breakdown
    st.subheader("1. Spark MLlib Distributed Pipeline Architecture")
    st.markdown(
        """
        The classification engine implements an Apache Spark MLlib <code>Pipeline</code> designed for horizontal 
        scalability. Feature transformations are fitted strictly on training data and serialized as an immutable 
        <code>PipelineModel</code> artifact.
        """,
        unsafe_allow_html=True
    )

    stages_data = [
        {"Stage": "1. RegexTokenizer", "Type": "Transformer", "Parameters": "pattern = \\W+, minTokenLength = 3, toLowercase = True"},
        {"Stage": "2. StopWordsRemover", "Type": "Transformer", "Parameters": "English standard editorial stopword lexicon"},
        {"Stage": "3. HashingTF", "Type": "Transformer", "Parameters": "numFeatures = 4,000 (MurmurHash3 term frequency)"},
        {"Stage": "4. IDF", "Type": "Estimator", "Parameters": "Inverse Document Frequency scaling (minDocFreq = 1)"},
        {"Stage": "5. LogisticRegression", "Type": "Estimator", "Parameters": "Multinomial Logit, L2 regularization (regParam = 0.08, maxIter = 30)"}
    ]
    st.table(pd.DataFrame(stages_data))

    # 2. Benchmark Evaluation Metrics
    st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)
    st.subheader("2. AG News Benchmark Evaluation")

    if metadata and "metrics" in metadata:
        metrics = metadata["metrics"]

        em1, em2, em3, em4 = st.columns(4)
        with em1:
            render_metric_card("Test Accuracy", f"{metrics.get('accuracy', 0)*100:.1f}%")
        with em2:
            render_metric_card("Weighted F1", f"{metrics.get('f1_score', 0)*100:.1f}%")
        with em3:
            render_metric_card("Precision", f"{metrics.get('weighted_precision', 0)*100:.1f}%")
        with em4:
            render_metric_card("Recall", f"{metrics.get('weighted_recall', 0)*100:.1f}%")

        # Confusion Matrix and Per Class breakdown
        c1, c2 = st.columns([1.1, 1.0])
        with c1:
            cm = metrics.get("confusion_matrix")
            if cm:
                fig_cm = plot_confusion_matrix(cm["matrix"], cm["labels"])
                st.plotly_chart(fig_cm, use_container_width=True)
        with c2:
            pc = metrics.get("per_class")
            if pc:
                fig_pc = plot_per_class_metrics(pc)
                st.plotly_chart(fig_pc, use_container_width=True)

        st.markdown(
            f"""
            <div style="font-size:0.8rem; color:#4B5563; background-color:#FFFFFF; border:1px solid #E5E7EB; border-radius:4px; padding:0.75rem 1rem;">
                <strong>Dataset:</strong> AG News Corpus ({metadata.get('train_record_count')} train / {metadata.get('test_record_count')} test records) &bull; 
                <strong>Training Duration:</strong> {metadata.get('training_duration_seconds')}s &bull; 
                <strong>Artifact Path:</strong> <code>models/{metadata.get('model_version')}/spark_model</code>
            </div>
            """,
            unsafe_allow_html=True
        )
    else:
        st.warning("No model evaluation metadata found. Run training below.")

    # 3. Model Lineage & Limitations
    st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)
    st.subheader("3. Model Governance & Intended Use")
    st.markdown(
        """
        - **Intended Domain:** Classification of English journalistic press wire releases into four core desks: 
          *World*, *Sports*, *Business*, and *Sci/Tech*.
        - **Out-of-Scope:** Conversational chat, social media acronyms, non-English texts, or automated censorship.
        - **Uncertainty Policy:** Dispatches where top-choice confidence is below 45% or margin between top classes is < 12% 
          are flagged for editorial human-in-the-loop audit.
        """
    )

    # 4. Interactive Retraining Workbench
    st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)
    st.subheader("4. Retrain Model Artifact")

    with st.expander("Configure Hyperparameters & Retrain", expanded=False):
        p_col1, p_col2, p_col3 = st.columns(3)
        with p_col1:
            retrain_features = st.selectbox("Vocabulary Size (HashingTF)", [2000, 4000, 8000], index=1)
        with p_col2:
            retrain_reg = st.slider("L2 Regularization (regParam)", 0.01, 0.5, 0.08, step=0.01)
        with p_col3:
            retrain_iter = st.slider("Max Iterations", 10, 50, 30, step=5)

        if st.button("Train New Spark MLlib Pipeline Model", type="primary"):
            with st.spinner("Loading benchmark dataset and fitting Spark MLlib pipeline..."):
                train_df, test_df = load_ag_news_benchmark()
                try:
                    _, new_meta = train_and_evaluate_model(
                        train_df=train_df,
                        test_df=test_df,
                        model_version="v1.0.0-spark-lr",
                        num_features=retrain_features,
                        reg_param=retrain_reg,
                        max_iter=retrain_iter
                    )
                    st.success(
                        f"Model successfully retrained! New Test Accuracy: "
                        f"{new_meta['metrics']['accuracy']*100:.2f}%, F1: {new_meta['metrics']['f1_score']*100:.2f}%"
                    )
                    st.rerun()
                except Exception as e:
                    render_alert_box(f"Training failed: {str(e)}", level="error")
