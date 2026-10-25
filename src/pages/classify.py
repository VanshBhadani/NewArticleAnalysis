"""
NewsPulse AI — Single Article Classification Page
High-fidelity real-time classification interface with probability distributions and editorial rationales.
"""

import streamlit as st
import pandas as pd
from src.config import settings, CATEGORY_MAP, CATEGORY_COLORS, CATEGORY_DESCRIPTIONS
from src.ui.styles import inject_custom_styles
from src.ui.components import render_topbar, render_section_header, render_category_badge, render_alert_box
from src.spark.inference import predict_single_article, load_model

PRESET_SAMPLES = {
    "World (Diplomacy)": {
        "title": "UN General Assembly Adopts Historic Non-Proliferation Treaty in Geneva",
        "body": "Delegations from 120 member states ratified the strategic nuclear oversight agreement, establishing international verification protocols and bilateral disarmament checkpoints."
    },
    "Sports (Championship)": {
        "title": "Stoppage-Time Header Clinches Champions League Victory in Thrilling Final",
        "body": "In front of 75,000 electric supporters, the star striker rose above two defenders in the 94th minute to power home the decisive goal, sealing a dramatic 2-1 title comeback."
    },
    "Business (Monetary Policy)": {
        "title": "Central Bank Holds Benchmark Interest Rates Steady Amid Cooling Inflation Data",
        "body": "Federal policymakers cited stabilizing wholesale producer prices and sustainable corporate earnings, signaling potential rate reductions during the fourth quarter fiscal deliberations."
    },
    "Sci/Tech (Quantum Computing)": {
        "title": "Research Consortium Demonstrates Fault-Tolerant Quantum Logic Gates",
        "body": "Physicists integrated 100 superconducting qubits with real-time syndrome extraction, suppressing hardware gate error rates below the fault-tolerant threshold."
    }
}


def render_classify_page():
    inject_custom_styles()
    render_topbar("Classify Wire")
    render_section_header(
        "Single Article Intelligence",
        "Submit headlines and article dispatches for immediate distributed inference via Spark MLlib."
    )

    # 1. Preset Newsroom Samples
    st.markdown("<div style='font-size:0.85rem; font-weight:600; color:#4B5563; margin-bottom:0.35rem;'>Pre-fill Editorial Wire Samples:</div>", unsafe_allow_html=True)
    cols = st.columns(len(PRESET_SAMPLES))
    for idx, (label, sample) in enumerate(PRESET_SAMPLES.items()):
        with cols[idx]:
            if st.button(label, key=f"preset_{idx}", use_container_width=True):
                st.session_state["classify_title"] = sample["title"]
                st.session_state["classify_body"] = sample["body"]

    # 2. Input Fields
    title_val = st.session_state.get("classify_title", "")
    body_val = st.session_state.get("classify_body", "")

    headline = st.text_input(
        "Headline",
        value=title_val,
        placeholder="Enter headline (e.g., Global trade talks stall in Brussels...)"
    )
    
    article_body = st.text_area(
        "Article Body / Lead Paragraph",
        value=body_val,
        height=140,
        placeholder="Enter article text, summary, or full journalistic dispatch..."
    )

    classify_btn = st.button("Run Spark MLlib Classification", type="primary")

    if classify_btn:
        if not headline.strip() and not article_body.strip():
            render_alert_box("Please enter at least a headline or article body text to classify.", level="warning")
            return

        with st.spinner("Analyzing text with Spark MLlib pipeline..."):
            try:
                res = predict_single_article(title=headline, body=article_body)
            except Exception as e:
                render_alert_box(f"Inference error: {str(e)}", level="error")
                return

        # 3. Prediction Results Display
        st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)
        pred_cat = res["predicted_category"]
        conf = res["confidence"]
        latency = res["latency_ms"]
        is_uncertain = res["is_uncertain"]

        res_col1, res_col2 = st.columns([1.2, 1.0])

        with res_col1:
            st.markdown(
                f"""
                <div class="editorial-card">
                    <div style="font-size:0.775rem; font-weight:600; text-transform:uppercase; color:#6B7280; margin-bottom:0.4rem;">
                        Classification Outcome
                    </div>
                    <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                        <span style="font-size:1.75rem; font-weight:600; color:#111827;">{pred_cat}</span>
                        {render_category_badge(pred_cat)}
                    </div>
                    <div style="font-size:0.9rem; color:#374151; margin-bottom:0.75rem; line-height:1.45;">
                        {res['explanation']}
                    </div>
                    <div style="font-size:0.8rem; color:#6B7280; border-top:1px solid #F3F4F6; padding-top:0.6rem; display:flex; justify-content:space-between;">
                        <span>Confidence: <strong>{conf*100:.1f}%</strong></span>
                        <span>Latency: <strong>{latency} ms</strong></span>
                        <span>Model: <code>{res['model_version']}</code></span>
                    </div>
                </div>
                """,
                unsafe_allow_html=True
            )

        with res_col2:
            st.markdown(
                """
                <div class="editorial-card">
                    <div style="font-size:0.775rem; font-weight:600; text-transform:uppercase; color:#6B7280; margin-bottom:0.5rem;">
                        Class Probability Spectrum
                    </div>
                """,
                unsafe_allow_html=True
            )
            for cat_name, prob in res["class_scores"].items():
                pct = prob * 100
                st.markdown(
                    f"""
                    <div style="margin-bottom:0.6rem;">
                        <div style="display:flex; justify-content:space-between; font-size:0.825rem; font-weight:500; margin-bottom:0.2rem;">
                            <span>{cat_name}</span>
                            <span class="tabular-nums">{pct:.1f}%</span>
                        </div>
                        <div style="width:100%; height:6px; background-color:#F3F4F6; border-radius:3px; overflow:hidden;">
                            <div style="width:{pct}%; height:100%; background-color:{CATEGORY_COLORS.get(cat_name, '#0D5C3A')};"></div>
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True
                )
            st.markdown("</div>", unsafe_allow_html=True)
