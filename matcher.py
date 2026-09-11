# filepath: c:\Users\PMLS\Documents\gtc360-ai\matcher.py
"""
GTC360 AI — High-Speed Semantic Vector Matching Engine
Loads Hugging Face SentenceTransformer (all-MiniLM-L6-v2).
Maintains an in-memory hot vector matrix cache for sub-10ms similarity scoring
across federal and California state funding opportunities.
"""

import logging
import threading
from typing import Any
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

import db

logger = logging.getLogger(__name__)

# ─── Model Loading ────────────────────────────────────────────────────────────

logger.info("Initializing SentenceTransformer (all-MiniLM-L6-v2)...")
_model: SentenceTransformer | None = None
_model_lock = threading.Lock()


def get_model() -> SentenceTransformer:
    """Return the singleton SentenceTransformer model, loading if needed."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                logger.info("Loading SentenceTransformer model weights...")
                _model = SentenceTransformer("all-MiniLM-L6-v2")
                # Warm-up pass
                _model.encode(["GTC360 grant intelligence engine warm-up"])
                logger.info("SentenceTransformer model loaded and warmed up.")
    return _model


# ─── In-Memory Hot Vector Matrix Cache ────────────────────────────────────────

_cache_lock = threading.Lock()
_cached_grants_metadata: list[dict[str, Any]] = []
_cached_embeddings_matrix: np.ndarray | None = None  # Shape (N, 384), normalized


def refresh_grants_cache() -> int:
    """
    Load all grants with precomputed embeddings from MongoDB into in-memory NumPy matrix.
    Enables instant vector dot-product scoring without querying the database per match.
    """
    global _cached_grants_metadata, _cached_embeddings_matrix

    logger.info("Refreshing in-memory grants vector cache from MongoDB...")
    grants_data = db.get_all_grants_with_embeddings()

    if not grants_data:
        logger.warning("No grants with embeddings found in MongoDB. Hot cache is empty.")
        with _cache_lock:
            _cached_grants_metadata = []
            _cached_embeddings_matrix = None
        return 0

    metadata: list[dict[str, Any]] = []
    vectors: list[list[float]] = []

    for g in grants_data:
        emb = g.get("embedding")
        if emb and len(emb) == 384:
            vectors.append(emb)
            # Copy all fields except the large raw embedding array
            meta = {k: v for k, v in g.items() if k != "embedding"}
            metadata.append(meta)

    if vectors:
        matrix = np.array(vectors, dtype=np.float32)
        # Normalize matrix rows so dot product equals cosine similarity
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1e-10
        matrix_normalized = matrix / norms

        with _cache_lock:
            _cached_grants_metadata = metadata
            _cached_embeddings_matrix = matrix_normalized

        logger.info(
            "In-memory hot cache refreshed successfully with %d grant vectors (384-d).",
            len(metadata),
        )
        return len(metadata)

    return 0


def get_cached_grants_count() -> int:
    """Return total number of grants currently held in hot memory."""
    with _cache_lock:
        return len(_cached_grants_metadata)


# ─── Text Vector Encoding ─────────────────────────────────────────────────────


def encode_text(text: str) -> list[float]:
    """Encode a single text string into a 384-dimensional normalized vector."""
    model = get_model()
    emb = model.encode([text], normalize_embeddings=True)[0]
    return emb.tolist()


def encode_batch(texts: list[str]) -> list[list[float]]:
    """Encode a batch of text strings into 384-dimensional normalized vectors."""
    if not texts:
        return []
    model = get_model()
    embeddings = model.encode(texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True)
    return embeddings.tolist()


# ─── High-Speed Vector Matching ───────────────────────────────────────────────

AGENCY_MATCH_BOOST = 0.12  # +12% boost if issuing agency matches user target agencies
MIN_SCORE_THRESHOLD = 0.0  # Allow full catalog browsing across all opportunities

CATEGORY_LOOKUP_MAP: dict[str, str] = {
    "agriculture-farming": "Agriculture & Farming",
    "performing-arts-culture": "Performing Arts & Culture",
    "small-business": "Small Business",
    "community-services-economic-development-municipal": "Community Services & Municipal",
    "consumer-protection": "Consumer Protection",
    "disaster-relief-ems-homeland-security": "Disaster Relief & EMS",
    "education-services": "Education Services",
    "employment-labor-and-training": "Employment & Training",
    "energy": "Energy",
    "environment": "Environment",
    "food-and-nutrition": "Food and Nutrition",
    "health": "Health",
    "housing": "Housing",
    "humanities": "Humanities",
    "income-security-and-social-services": "Income Security & Social Services",
    "information-and-statistics": "Information and Statistics",
    "infrastructure-investment-and-jobs-act": "Infrastructure - IIJA",
    "law-justice-and-legal-services": "Law, Justice & Legal Services",
    "natural-resources": "Natural Resources",
    "opportunity-zone-benefits": "Opportunity Zone Benefits",
    "regional-development": "Regional Development",
    "science-and-technology": "Science and Technology",
    "transportation": "Transportation",
}

AGENCY_ALIAS_MAP: dict[str, list[str]] = {
    "ca-state": ["california", "ca-state", "state of california", "ca "],
    "denali": ["denali"],
    "usda": ["usda", "agriculture", "forest service", "nifa", "fns", "fsa"],
    "doc": ["commerce", "doc", "noaa", "nist", "eda", "census", "ntia"],
    "dod": ["defense", "dod", "army", "navy", "air force", "darpa", "dhaca", "dla"],
    "ed": ["education", " ed ", "department of education", "ies"],
    "doe": ["energy", "doe", "arpa-e", "nnsa"],
    "doe-sc": ["office of science", "doe-sc", "science"],
    "hhs": ["hhs", "health and human services", "nih", "cdc", "fda", "hrsa", "samhsa", "acl", "cms", "acf"],
    "dhs": ["homeland security", "dhs", "fema", "cisa", "tsa", "uscg"],
    "hud": ["housing and urban development", "hud"],
    "doj": ["justice", "doj", "bja", "ojp", "fbi", "dea", "ovw", "bjs"],
    "dol": ["labor", "dol", "eta", "osha", "msha", "bls"],
    "state": ["state department", "dos", "department of state", "usaid"],
    "doi": ["interior", "doi", "usgs", "fish and wildlife", "fws", "blm", "nps", "bor"],
    "treasury": ["treasury", "treas", "irs", "cdfi"],
    "dot": ["transportation", "dot", "faa", "fhwa", "fta", "fra", "fmcsa", "nhtsa"],
    "va": ["veterans affairs", "va "],
    "epa": ["epa", "environmental protection"],
    "imls": ["imls", "museum and library"],
    "mcc": ["mcc", "millennium challenge"],
    "nasa": ["nasa", "national aeronautics and space"],
    "nara": ["nara", "national archives"],
    "neh": ["neh", "national endowment for the humanities"],
    "ondcp": ["ondcp", "drug control policy"],
    "nsf": ["nsf", "national science foundation"],
}


def rank_grants(
    user_preferences: dict[str, Any],
    top_k: int = 5000,
    min_score: float = MIN_SCORE_THRESHOLD,
) -> list[dict[str, Any]]:
    """
    Perform sub-10ms semantic similarity ranking of all active grants against user profile.
    1. Encodes user's target categories and organization type into a single 384-d query vector.
    2. Performs instant vectorized matrix dot-product against in-memory hot cache.
    3. Applies target agency boosts (+12%).
    4. Returns ranked list of grant opportunities with detailed match breakdown.
    """
    with _cache_lock:
        matrix = _cached_embeddings_matrix
        metadata = _cached_grants_metadata

    if matrix is None or len(metadata) == 0:
        logger.warning("Grant vector cache is empty. Attempting live refresh...")
        count = refresh_grants_cache()
        if count == 0:
            return []
        with _cache_lock:
            matrix = _cached_embeddings_matrix
            metadata = _cached_grants_metadata

    # Extract user matching preferences
    target_categories: list[str] = user_preferences.get("targetCategories") or []
    target_agencies: list[str] = [a.lower().strip() for a in (user_preferences.get("targetAgencies") or [])]
    organization_type: str = user_preferences.get("organizationType", "")
    custom_keywords: str = user_preferences.get("customKeywords", "")

    has_criteria = bool(target_categories or target_agencies or custom_keywords.strip())

    if not has_criteria:
        # User has not saved/configured any matching preferences:
        # Return catalog grants with NO fabricated match score
        results: list[dict[str, Any]] = []
        for grant in metadata:
            results.append(
                {
                    "grant_id": grant.get("grant_id"),
                    "opp_number": grant.get("opp_number", ""),
                    "title": grant.get("title", ""),
                    "agency": grant.get("agency", ""),
                    "agency_code": grant.get("agency_code", ""),
                    "open_date": grant.get("open_date", ""),
                    "close_date": grant.get("close_date", ""),
                    "opp_status": grant.get("opp_status", "posted"),
                    "description": grant.get("description", ""),
                    "grant_url": grant.get("grant_url", ""),
                    "source": grant.get("source", "federal"),
                    "score": None,
                    "breakdown": None,
                }
            )
        if top_k > 0:
            return results[:top_k]
        return results

    # Build semantic search intent query string from actual user preferences
    intent_parts = []
    if target_categories:
        resolved_categories = [
            CATEGORY_LOOKUP_MAP.get(c.lower().strip(), c) for c in target_categories
        ]
        intent_parts.append("Focus areas: " + ", ".join(resolved_categories) + ".")
    if organization_type:
        intent_parts.append(f"Eligible applicant organization: {organization_type}.")
    if custom_keywords:
        intent_parts.append(f"Target terms: {custom_keywords}.")

    query_text = " ".join(intent_parts) if intent_parts else ""

    # Encode query vector (~10-20ms)
    model = get_model()
    query_vector = model.encode([query_text], normalize_embeddings=True)[0]  # Shape: (384,)

    # Instant matrix dot product across all grants (< 3ms)
    raw_scores = np.dot(matrix, query_vector)  # Values between -1.0 and 1.0

    results: list[dict[str, Any]] = []

    for idx, raw_score in enumerate(raw_scores):
        grant = metadata[idx]

        # Base semantic similarity normalized to 0.0 - 1.0 range
        base_sim = float(max(0.0, raw_score))

        # Check for agency affinity match boost
        grant_agency = (grant.get("agency") or "").lower()
        grant_code = (grant.get("agency_code") or "").lower()

        agency_boost_applied = False
        boost_amount = 0.0

        if target_agencies:
            for ta in target_agencies:
                ta_clean = ta.lower().strip()
                # Check direct California jurisdiction
                if ta_clean in ("ca-state", "california", "ca") and grant.get("source") == "california":
                    agency_boost_applied = True
                    boost_amount = AGENCY_MATCH_BOOST
                    break

                aliases = AGENCY_ALIAS_MAP.get(ta_clean)
                if not aliases:
                    # Check if ta_clean matches any alias value or key
                    for k, vals in AGENCY_ALIAS_MAP.items():
                        if ta_clean == k or ta_clean in vals or any(v in ta_clean for v in vals):
                            aliases = vals
                            break
                    if not aliases:
                        aliases = [ta_clean]

                if any(alias in grant_agency or alias in grant_code or grant_code in alias for alias in aliases):
                    agency_boost_applied = True
                    boost_amount = AGENCY_MATCH_BOOST
                    break

        # Final blended score capped at 1.0 (100%)
        final_score_float = min(1.0, base_sim + boost_amount)
        score_pct = round(final_score_float * 100.0, 1)

        if score_pct >= min_score:
            results.append(
                {
                    "grant_id": grant.get("grant_id"),
                    "opp_number": grant.get("opp_number", ""),
                    "title": grant.get("title", ""),
                    "agency": grant.get("agency", ""),
                    "agency_code": grant.get("agency_code", ""),
                    "open_date": grant.get("open_date", ""),
                    "close_date": grant.get("close_date", ""),
                    "opp_status": grant.get("opp_status", "posted"),
                    "description": grant.get("description", ""),
                    "grant_url": grant.get("grant_url", ""),
                    "source": grant.get("source", "federal"),
                    "score": score_pct,
                    "breakdown": {
                        "semanticScore": round(base_sim * 100.0, 1),
                        "agencyBoost": round(boost_amount * 100.0, 1),
                        "agencyMatched": agency_boost_applied,
                    },
                }
            )

    # Sort descending by match score
    results.sort(key=lambda r: r["score"], reverse=True)

    if top_k > 0:
        return results[:top_k]
    return results
