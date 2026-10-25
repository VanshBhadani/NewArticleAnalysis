"""
NewsPulse AI — Cloud-Native News Intelligence & Classification Platform
Entry point for the Streamlit editorial intelligence SaaS platform.
"""

import streamlit as st

# 1. Primary Page Configuration
st.set_page_config(
    page_title="NewsPulse AI — Editorial Intelligence Platform",
    page_icon="📰",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 2. Import Page Renderers
from src.pages.overview import render_overview_page
from src.pages.article_explorer import render_article_explorer_page
from src.pages.classify import render_classify_page
from src.pages.batch_processing import render_batch_processing_page
from src.pages.analytics import render_analytics_page
from src.pages.jobs import render_jobs_page
from src.pages.model_lab import render_model_lab_page
from src.pages.infrastructure import render_infrastructure_page
from src.ui.styles import inject_custom_styles
from src.config import settings

# 3. Inject Editorial Minimalism Styling
inject_custom_styles()

# 4. Render Brand Sidebar Header
with st.sidebar:
    st.markdown(
        f"""
        <div class="newspulse-sidebar-brand">
            <div class="newspulse-brand-title">NewsPulse AI</div>
            <div class="newspulse-brand-subtitle">Editorial Intelligence Platform</div>
            <div style="font-size:0.7rem; color:#6B7280; margin-top:0.35rem;">
                v{settings.app_version} &bull; Spark MLlib &bull; {'AWS S3' if (settings.execution_mode == 'aws' and settings.is_aws_configured()) else 'Local Mode'}
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )

# 5. Define Structured Navigation
nav_pages = {
    "Editorial Operations": [
        st.Page(render_overview_page, title="Overview", icon="📰", default=True),
        st.Page(render_article_explorer_page, title="Article Explorer", icon="🔍"),
        st.Page(render_classify_page, title="Classify Wire", icon="⚡"),
    ],
    "Distributed Data Engine": [
        st.Page(render_batch_processing_page, title="Batch Processing", icon="⚙️"),
        st.Page(render_analytics_page, title="Analytics", icon="📊"),
        st.Page(render_jobs_page, title="Jobs & Audit", icon="📜"),
    ],
    "Governance & Infrastructure": [
        st.Page(render_model_lab_page, title="Model Lab", icon="🧪"),
        st.Page(render_infrastructure_page, title="Infrastructure & Cloud", icon="☁️"),
    ]
}

nav = st.navigation(nav_pages)

# 6. Execute Active Route
nav.run()
