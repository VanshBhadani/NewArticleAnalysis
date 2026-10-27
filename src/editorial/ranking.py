"""
NewsPulse AI — Deterministic Editorial Ranking Engine
Calculates transparent editorial importance scores without generative AI or external LLMs.
Uses normalized, multi-signal scoring across coverage breadth, public impact keywords,
lexical depth, cluster cohesion, and publication recency.
"""

import re
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

# Deterministic lexical impact dictionary across high-consequence journalistic domains
IMPACT_LEXICON = {
    "diplomacy_governance": [
        "treaty", "summit", "accord", "ceasefire", "sanctions", "legislation",
        "parliament", "presidential", "security council", "prime minister",
        "bilateral", "constitution", "diplomatic", "sovereignty", "embassy",
        "ratified", "unanimous", "resolution", "peacekeeper", "envoy", "ambassador"
    ],
    "macroeconomics_markets": [
        "interest rate", "inflation", "central bank", "recession", "gdp",
        "monetary policy", "antitrust", "merger", "acquisition", "fiscal",
        "treasury", "sovereign debt", "unemployment", "tariff", "federal reserve",
        "benchmark rate", "liquidity", "trade deficit", "stagflation", "stimulus", "interest rates"
    ],
    "safety_public_health": [
        "emergency", "outbreak", "disaster", "crisis", "evacuation", "pandemic",
        "casualty", "earthquake", "contamination", "rescue", "death toll",
        "wildfire", "quarantine", "toxic", "warning", "epidemic", "fallout"
    ],
    "scientific_tech_milestone": [
        "breakthrough", "quantum", "clinical trial", "semiconductor", "aerospace",
        "discovery", "fusion", "superconductor", "telescope", "spacecraft",
        "patent", "neural network", "biotechnology", "genome", "qubit", "orbit"
    ],
    "major_sports_championship": [
        "championship", "tournament", "world record", "finals", "trophy",
        "grand slam", "gold medal", "olympic", "title decider", "cup winner"
    ]
}


@dataclass
class EditorialWeights:
    """Configurable weights for editorial score calculation. Must sum to 1.0."""
    coverage_breadth: float = 0.30  # Number of related articles and distinct news sources
    public_impact: float = 0.30     # Deterministic domain impact keywords
    lexical_depth: float = 0.15     # Article detail, context richness, and length
    cluster_cohesion: float = 0.15  # Semantic alignment of related reports
    recency: float = 0.10           # Proximity to current news cycle

    def validate(self):
        total = self.coverage_breadth + self.public_impact + self.lexical_depth + self.cluster_cohesion + self.recency
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"Weights must sum to 1.0, got {total:.3f}")


@dataclass
class EditorialScoreBreakdown:
    total_score: float              # 0.0 - 100.0
    coverage_breadth_score: float   # 0.0 - 100.0
    public_impact_score: float      # 0.0 - 100.0
    lexical_depth_score: float      # 0.0 - 100.0
    cluster_cohesion_score: float   # 0.0 - 100.0
    recency_score: float            # 0.0 - 100.0
    matched_impact_keywords: List[str] = field(default_factory=list)
    distinct_sources_count: int = 1
    related_articles_count: int = 1
    explanation: str = ""
    weights_applied: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def detect_impact_keywords(text: str) -> List[str]:
    """Finds all impact keywords matched in headline/body text."""
    text_lower = text.lower()
    matches = []
    seen = set()
    for domain, terms in IMPACT_LEXICON.items():
        for term in terms:
            pattern = r"\b" + re.escape(term) + r"\b"
            if re.search(pattern, text_lower):
                if term not in seen:
                    seen.add(term)
                    matches.append(term)
    return matches


def calculate_editorial_score(
    headline: str,
    body: str = "",
    related_articles_count: int = 1,
    distinct_sources_count: int = 1,
    cluster_cohesion: float = 0.80,
    published_date_str: Optional[str] = None,
    reference_latest_date: Optional[datetime] = None,
    weights: Optional[EditorialWeights] = None
) -> EditorialScoreBreakdown:
    """
    Computes a deterministic, transparent editorial importance score (0-100).
    Separates classification confidence from editorial importance.
    """
    w = weights or EditorialWeights()
    w.validate()

    combined_text = f"{headline} {body}".strip()

    # 1. Coverage Breadth Score (0 - 100)
    # Rewards multiple independent reports and distinct source wires
    raw_coverage = 40.0 + max(0, related_articles_count - 1) * 25.0 + max(0, distinct_sources_count - 1) * 20.0
    coverage_score = min(100.0, raw_coverage)

    # 2. Public Impact Score (0 - 100)
    # Detects deterministic institutional, economic, policy, and safety terms
    matched_keywords = detect_impact_keywords(combined_text)
    keyword_count = len(matched_keywords)
    public_impact_score = min(100.0, keyword_count * 25.0)

    # 3. Lexical Depth Score (0 - 100)
    # Evaluates informational density and text richness
    text_len = len(combined_text)
    if text_len < 60:
        lexical_depth_score = 30.0
    elif text_len < 160:
        lexical_depth_score = 55.0
    elif text_len < 350:
        lexical_depth_score = 80.0
    else:
        lexical_depth_score = 100.0

    # 4. Cluster Cohesion Score (0 - 100)
    # Measures semantic alignment of the cluster
    cohesion_score = min(100.0, max(0.0, float(cluster_cohesion) * 100.0))

    # 5. Recency Score (0 - 100)
    # Fallback to neutral 70.0 if publication timestamps are unavailable
    recency_score = 70.0
    if published_date_str:
        try:
            pub_dt = datetime.fromisoformat(published_date_str.replace("Z", "+00:00"))
            ref_dt = reference_latest_date or datetime.utcnow()
            diff_hours = abs((ref_dt - pub_dt.replace(tzinfo=None)).total_seconds()) / 3600.0
            if diff_hours <= 12:
                recency_score = 100.0
            elif diff_hours <= 24:
                recency_score = 85.0
            elif diff_hours <= 48:
                recency_score = 70.0
            else:
                recency_score = max(30.0, 70.0 - (diff_hours - 48) * 0.5)
        except Exception:
            recency_score = 70.0

    # Weighted Sum Total
    total_score = (
        coverage_score * w.coverage_breadth +
        public_impact_score * w.public_impact +
        lexical_depth_score * w.lexical_depth +
        cohesion_score * w.cluster_cohesion +
        recency_score * w.recency
    )
    total_score = round(min(100.0, max(0.0, total_score)), 1)

    # Assemble readable explanation
    explanation_parts = []
    if related_articles_count > 1 or distinct_sources_count > 1:
        explanation_parts.append(f"{related_articles_count} dispatches from {distinct_sources_count} source(s) (+{round(coverage_score * w.coverage_breadth, 1)} pts)")
    else:
        explanation_parts.append(f"Single dispatch (+{round(coverage_score * w.coverage_breadth, 1)} pts)")

    if matched_keywords:
        sample_kw = ", ".join(matched_keywords[:3])
        explanation_parts.append(f"Public impact indicators [{sample_kw}] (+{round(public_impact_score * w.public_impact, 1)} pts)")
    else:
        explanation_parts.append("Baseline public impact (+0 pts)")

    explanation_parts.append(f"Lexical depth (+{round(lexical_depth_score * w.lexical_depth, 1)} pts)")
    explanation_parts.append(f"Cohesion (+{round(cohesion_score * w.cluster_cohesion, 1)} pts)")

    explanation = "; ".join(explanation_parts) + f". Total Score: {total_score}/100"

    return EditorialScoreBreakdown(
        total_score=total_score,
        coverage_breadth_score=round(coverage_score, 1),
        public_impact_score=round(public_impact_score, 1),
        lexical_depth_score=round(lexical_depth_score, 1),
        cluster_cohesion_score=round(cohesion_score, 1),
        recency_score=round(recency_score, 1),
        matched_impact_keywords=matched_keywords,
        distinct_sources_count=distinct_sources_count,
        related_articles_count=related_articles_count,
        explanation=explanation,
        weights_applied={
            "coverage_breadth": w.coverage_breadth,
            "public_impact": w.public_impact,
            "lexical_depth": w.lexical_depth,
            "cluster_cohesion": w.cluster_cohesion,
            "recency": w.recency
        }
    )
