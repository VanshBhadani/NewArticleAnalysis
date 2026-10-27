"""
NewsPulse AI — Daily News Desk Streamlit Page
Provides deterministic editorial ranking, story cluster exploration, and daily curation.
"""

import streamlit as st
from datetime import datetime

from src.editorial.service import editorial_service
from src.editorial.ranking import EditorialWeights


def render_daily_news_desk_page():
    st.markdown('<div class="editorial-header">Daily News Desk & Edition Lineup</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="editorial-subheader">'
        'Deterministic importance scoring, story cluster grouping, and human-in-the-loop edition curation.'
        '</div>',
        unsafe_allow_html=True
    )

    # Top Control Bar
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        balanced_mode = st.toggle("Category Balanced Desks", value=True, help="Prevents one category from monopolizing top slots")
    with col2:
        recompute = st.button("Rescan & Recluster")
    with col3:
        st.markdown(f"**Date:** {datetime.utcnow().strftime('%B %d, %Y')}")

    try:
        payload = editorial_service.get_daily_news_desk_payload(balance_categories=balanced_mode)
    except Exception as e:
        st.error(f"Error loading Daily News Desk: {e}")
        return

    stats = payload.get("stats", {})
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Ingested Articles", stats.get("total_articles_ingested", 0))
    m2.metric("Story Clusters", stats.get("total_stories_clustered", 0))
    m3.metric("Selected in Edition", stats.get("total_selected", 0))
    m4.metric("Saved for Later", stats.get("total_saved", 0))

    st.markdown("---")

    # Lead Story Hero
    lead = payload.get("lead_story")
    if lead:
        st.subheader("⭐ Primary Lead Candidate")
        with st.container(border=True):
            st.caption(f"{lead['main_category']} • {lead['subcategory']} • {lead['source']}")
            st.markdown(f"### {lead['headline']}")
            st.write(lead['excerpt'])
            st.info(f"**Score Rationale ({lead['editorial_score']}/100):** {lead['score_explanation']}")

            c_act1, c_act2, c_act3 = st.columns([1, 1, 2])
            with c_act1:
                if lead['status'] != 'selected':
                    if st.button("Select for Edition", key="lead_select"):
                        editorial_service.repo.select_story(
                            story_id=lead['story_id'],
                            lead_article_id=lead['lead_article_id'],
                            headline=lead['headline'],
                            category=lead['main_category'],
                            editorial_score=lead['editorial_score'],
                            article_ids=lead['article_ids'],
                            is_lead=True
                        )
                        st.rerun()
                else:
                    st.success("Selected in Edition")
            with c_act2:
                if st.button("Save for Later", key="lead_save"):
                    editorial_service.repo.save_story_later(
                        story_id=lead['story_id'],
                        lead_article_id=lead['lead_article_id'],
                        headline=lead['headline'],
                        category=lead['main_category'],
                        editorial_score=lead['editorial_score'],
                        article_ids=lead['article_ids']
                    )
                    st.rerun()

    # Top Stories Tabs
    tab_curate, tab_edition, tab_highlights = st.tabs([
        "Top Recommended Stories",
        f"Today's Curated Edition ({len(payload.get('selected_edition', []))})",
        "Dynamic Category Highlights"
    ])

    with tab_curate:
        top_stories = payload.get("top_stories", [])
        for story in top_stories:
            with st.expander(f"[{story['main_category']}] {story['headline']} (Score: {story['editorial_score']}/100, ML: {story['classification_confidence']}%)"):
                st.write(story['excerpt'])
                st.caption(f"Signals: {story['score_explanation']}")
                b1, b2, b3 = st.columns([1, 1, 3])
                with b1:
                    if story['status'] != 'selected':
                        if st.button("Select", key=f"sel_{story['story_id']}"):
                            editorial_service.repo.select_story(
                                story_id=story['story_id'],
                                lead_article_id=story['lead_article_id'],
                                headline=story['headline'],
                                category=story['main_category'],
                                editorial_score=story['editorial_score'],
                                article_ids=story['article_ids']
                            )
                            st.rerun()
                    else:
                        if st.button("Deselect", key=f"desel_{story['story_id']}"):
                            editorial_service.repo.deselect_story(story['story_id'])
                            st.rerun()
                with b2:
                    if st.button("Save", key=f"sav_{story['story_id']}"):
                        editorial_service.repo.save_story_later(
                            story_id=story['story_id'],
                            lead_article_id=story['lead_article_id'],
                            headline=story['headline'],
                            category=story['main_category'],
                            editorial_score=story['editorial_score'],
                            article_ids=story['article_ids']
                        )
                        st.rerun()

    with tab_edition:
        edition = payload.get("selected_edition", [])
        if not edition:
            st.info("No stories selected for today's edition yet.")
        else:
            for idx, story in enumerate(edition, 1):
                st.markdown(f"**#{idx} [{story['main_category']}] {story['headline']}** (Score: {story['editorial_score']})")
                st.caption(f"Section: {story['publication_section']}")
                if st.button("Remove from Edition", key=f"rem_{story['story_id']}"):
                    editorial_service.repo.deselect_story(story['story_id'])
                    st.rerun()

    with tab_highlights:
        for cat_highlight in payload.get("category_highlights", []):
            st.markdown(f"### {cat_highlight['category_name']} Desk ({cat_highlight['total_stories']} stories)")
            for s in cat_highlight.get("stories", []):
                st.markdown(f"- **{s['headline']}** (Score: {s['editorial_score']}/100)")
