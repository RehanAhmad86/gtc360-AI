# filepath: c:\Users\PMLS\Documents\gtc360-ai\sync_service.py
"""
GTC360 AI — Grants Sync & Pre-Vectorization Engine
Exclusively fetches real live grant opportunities from:
  1. Federal Grants.gov API (https://api.grants.gov/v1/api/search2)
  2. State of California Datastore API (https://data.ca.gov)
Unifies records into the MongoDB Atlas `grants` collection with 384-d embeddings.
Zero mock or fallback grants.
"""

import logging
from datetime import datetime, timezone
from typing import Any
import requests

import db
import matcher

logger = logging.getLogger("gtc360.sync")

# ─── Live API Sync Functions (Real Grants Only) ───────────────────────────────


def fetch_federal_grants(limit: int = 2500) -> list[dict[str, Any]]:
    """
    Fetch active federal opportunities from Grants.gov Search2 API.
    Mirrors the payload structure in WordPress snippet 7867.
    """
    url = "https://api.grants.gov/v1/api/search2"
    payload = {
        "rows": limit,
        "oppStatuses": "posted|forecasted",
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "GTC360-GrantSync-Engine/1.0",
    }

    try:
        logger.info("Connecting to Grants.gov API (requesting %d records)...", limit)
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        if resp.status_code != 200:
            logger.error("Grants.gov API returned HTTP status %s", resp.status_code)
            return []

        data = resp.json()
        hits = []
        if "data" in data and isinstance(data["data"], dict):
            hits = data["data"].get("oppHits", [])
        elif "oppHits" in data:
            hits = data.get("oppHits", [])

        grants = []
        for h in hits:
            gid = str(h.get("id") or "").strip()
            title = str(h.get("title") or "").strip()
            if not gid or not title:
                continue

            cfda = ""
            raw_cfda = h.get("cfdaList")
            if isinstance(raw_cfda, list):
                cfda = ", ".join(str(x) for x in raw_cfda)

            opp_num = str(h.get("number") or gid).strip()
            agency = str(h.get("agency") or "Federal Agency").strip()
            agency_code = str(h.get("agencyCode") or "").strip()
            open_date = str(h.get("openDate") or "").strip()
            close_date = str(h.get("closeDate") or "Ongoing").strip()
            opp_status = str(h.get("oppStatus") or "posted").lower().strip()
            doc_type = str(h.get("docType") or "Grant").strip()

            desc = f"Federal grant funding opportunity: {title}. Issuing agency: {agency} ({agency_code}). CFDA: {cfda}. Opportunity #: {opp_num}."

            grants.append(
                {
                    "grant_id": gid,
                    "opp_number": opp_num,
                    "title": title,
                    "agency": agency,
                    "agency_code": agency_code,
                    "open_date": open_date,
                    "close_date": close_date,
                    "opp_status": opp_status,
                    "doc_type": doc_type,
                    "cfda_list": cfda,
                    "description": desc,
                    "grant_url": f"https://www.grants.gov/search-results-detail/{gid}",
                    "source": "federal",
                }
            )

        logger.info("Successfully retrieved %d real federal grants from Grants.gov.", len(grants))
        return grants
    except Exception as e:
        logger.error("Error fetching federal grants from Grants.gov: %s", e)
        return []


def fetch_california_grants(limit: int = 2500) -> list[dict[str, Any]]:
    """
    Fetch active State of California grants from data.ca.gov datastore API.
    Mirrors the endpoint in WordPress snippet 7867.
    """
    url = f"https://data.ca.gov/api/3/action/datastore_search?resource_id=111c8c88-21f6-453c-ae2c-b4785a0624f5&limit={limit}"
    headers = {"User-Agent": "GTC360-GrantSync-Engine/1.0"}

    try:
        logger.info("Connecting to data.ca.gov CKAN API (limit: %d)...", limit)
        resp = requests.get(url, headers=headers, timeout=60)
        if resp.status_code != 200:
            logger.error("data.ca.gov API returned HTTP status %s", resp.status_code)
            return []

        data = resp.json()
        records = data.get("result", {}).get("records", [])

        grants = []
        for r in records:
            portal_id = str(r.get("PortalID") or r.get("_id") or "").strip()
            title = str(r.get("Title") or "").strip()
            if not portal_id or not title:
                continue

            gid = f"CA-{portal_id}"
            opp_num = str(r.get("GrantID") or gid).strip()
            agency = str(r.get("AgencyDept") or "State of California").strip()
            purpose = str(r.get("Purpose") or "").strip()
            desc = str(r.get("Description") or "").strip()
            full_desc = f"{purpose}\n\n{desc}".strip() or title
            url_link = str(r.get("GrantURL") or f"https://www.grants.ca.gov/grants/{portal_id}").strip()

            raw_close = str(r.get("ApplicationDeadline") or "").strip()
            close_date = raw_close if raw_close else "Ongoing"

            raw_open = str(r.get("OpenDate") or "").strip()
            open_date = raw_open[:10] if raw_open else ""

            status_str = str(r.get("Status") or "active").lower().strip()
            opp_status = "posted" if status_str == "active" else status_str
            doc_type = str(r.get("Type") or "State Grant").strip()
            cfda_list = str(r.get("Categories") or "").strip()

            grants.append(
                {
                    "grant_id": gid,
                    "opp_number": opp_num,
                    "title": title,
                    "agency": agency,
                    "agency_code": "CA-STATE",
                    "open_date": open_date,
                    "close_date": close_date,
                    "opp_status": opp_status,
                    "doc_type": doc_type,
                    "cfda_list": cfda_list,
                    "description": full_desc,
                    "grant_url": url_link,
                    "source": "california",
                }
            )

        logger.info("Successfully retrieved %d real California grants from data.ca.gov.", len(grants))
        return grants
    except Exception as e:
        logger.error("Error fetching California grants from data.ca.gov: %s", e)
        return []


# ─── Master Unified Ingestion & Vectorization ─────────────────────────────────


def run_sync(federal_limit: int = 1500, california_limit: int = 1500) -> dict[str, int]:
    """
    Executes full synchronization with zero mock/fallback data:
    1. Fetches real federal grants from Grants.gov.
    2. Fetches real California grants from data.ca.gov.
    3. Merges and deduplicates records by grant_id.
    4. Computes 384-dimensional SentenceTransformer embeddings in batches.
    5. Bulk upserts documents directly into MongoDB Atlas.
    6. Hot-reloads the in-memory vector cache for zero-delay matching.
    """
    logger.info("Starting live grant ingestion from federal and state APIs...")
    all_grants: list[dict[str, Any]] = []

    # 1. Fetch real Federal grants
    fed_grants = fetch_federal_grants(limit=federal_limit)
    all_grants.extend(fed_grants)

    # 2. Fetch real California grants
    cal_grants = fetch_california_grants(limit=california_limit)
    all_grants.extend(cal_grants)

    if not all_grants:
        logger.warning("No grants were returned from live APIs. Skipping database upsert.")
        return {"processed": 0, "upserted": 0, "cached": matcher.get_cached_grants_count()}

    # 3. Deduplicate by unique grant_id
    deduped: dict[str, dict[str, Any]] = {}
    for g in all_grants:
        gid = g.get("grant_id")
        if gid and gid not in deduped:
            deduped[gid] = g

    grants_to_process = list(deduped.values())
    total_count = len(grants_to_process)
    logger.info("Total unique live grants to vectorize and cache: %d", total_count)

    # 4. Construct semantic representation text for embedding
    text_representations: list[str] = []
    for g in grants_to_process:
        rep = f"{g.get('title', '')}. Issuing agency: {g.get('agency', '')}. {g.get('description', '')[:500]}"
        text_representations.append(rep)

    # 5. Batch vectorization using SentenceTransformer
    logger.info("Generating 384-d embeddings in batches of 64...")
    embeddings = matcher.encode_batch(text_representations)

    for idx, g in enumerate(grants_to_process):
        g["embedding"] = embeddings[idx]

    # 6. Bulk upsert into MongoDB Atlas
    logger.info("Saving unified grants to MongoDB Atlas 'grants' collection...")
    upserted_count = db.upsert_grants_batch(grants_to_process)
    logger.info("Bulk upsert complete: %d records processed in database.", upserted_count)

    # 7. Hot-reload in-memory vector matrix
    cached_count = matcher.refresh_grants_cache()

    return {
        "processed": total_count,
        "upserted": upserted_count,
        "cached": cached_count,
    }
