# filepath: c:\Users\PMLS\Documents\gtc360-ai\fetch_and_unify_grants.py
"""
GTC360 AI — Unified Grant Fetching & Embedding Pipeline
Directly connects to:
  1. Grants.gov Search2 API (Federal)
  2. data.ca.gov CKAN API (State of California)
Extracts, normalizes, vectorizes (384-d embeddings), and bulk-upserts
all records into MongoDB Atlas (gtc3608686.grants).
"""

import os
import sys
import time
import logging
from datetime import datetime, timezone
from typing import Any
import requests
from dotenv import load_dotenv

load_dotenv()

from pymongo import MongoClient, UpdateOne, ASCENDING, TEXT
from pymongo.server_api import ServerApi
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger("gtc360.fetcher")

# MongoDB connection
RAW_URI = os.getenv("MONGODB_URI", "mongodb+srv://gtc3608686:gtc3608686%40@cluster0.xyncruv.mongodb.net/?appName=Cluster0")
# Ensure password @ is escaped
if "@cluster0" in RAW_URI and "%40" not in RAW_URI:
    RAW_URI = RAW_URI.replace("gtc3608686@", "gtc3608686%40@")

DB_NAME = os.getenv("DB_NAME", "gtc3608686")

logger.info("Connecting to MongoDB Atlas (%s)...", DB_NAME)
client = MongoClient(RAW_URI, server_api=ServerApi("1"), connectTimeoutMS=15000)
db = client[DB_NAME]

# ─── Ensure Database Indexes ──────────────────────────────────────────────────

logger.info("Verifying collection indexes...")
db.grants.create_index([("grant_id", ASCENDING)], unique=True)
db.grants.create_index([("title", TEXT), ("description", TEXT)], name="grant_text_idx")
db.grants.create_index([("source", ASCENDING)])
db.grants.create_index([("agency_code", ASCENDING)])
db.grants.create_index([("opp_status", ASCENDING)])


# ─── 1. Fetch Federal Grants (Grants.gov) ─────────────────────────────────────


def fetch_all_federal_grants(rows: int = 2500) -> list[dict[str, Any]]:
    """Fetch live opportunities from Grants.gov API."""
    url = "https://api.grants.gov/v1/api/search2"
    payload = {
        "rows": rows,
        "oppStatuses": "posted|forecasted",
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "GTC360-IngestionEngine/1.0",
    }

    logger.info("Fetching Federal Grants from Grants.gov (requesting %d rows)...", rows)
    start_t = time.time()
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=90)
        resp.raise_for_status()
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

            opp_number = str(h.get("number") or gid).strip()
            agency = str(h.get("agency") or "Federal Agency").strip()
            agency_code = str(h.get("agencyCode") or "").strip()
            open_date = str(h.get("openDate") or "").strip()
            close_date = str(h.get("closeDate") or "Ongoing").strip()
            opp_status = str(h.get("oppStatus") or "posted").lower().strip()
            doc_type = str(h.get("docType") or "Grant").strip()
            grant_url = f"https://www.grants.gov/search-results-detail/{gid}"

            description = (
                f"Federal grant funding opportunity: {title}. "
                f"Issuing agency: {agency} ({agency_code}). "
                f"Assistance Listing / CFDA: {cfda}. "
                f"Opportunity number: {opp_number}."
            )

            grants.append(
                {
                    "grant_id": gid,
                    "opp_number": opp_number,
                    "title": title,
                    "agency_code": agency_code,
                    "agency": agency,
                    "open_date": open_date,
                    "close_date": close_date,
                    "opp_status": opp_status,
                    "doc_type": doc_type,
                    "cfda_list": cfda,
                    "description": description,
                    "grant_url": grant_url,
                    "source": "federal",
                }
            )

        elapsed = time.time() - start_t
        logger.info("Retrieved %d Federal grants in %.2f seconds.", len(grants), elapsed)
        return grants
    except Exception as e:
        logger.error("Failed to fetch Federal grants: %s", e)
        return []


# ─── 2. Fetch State of California Grants (data.ca.gov) ────────────────────────


def fetch_all_california_grants(limit: int = 50000) -> list[dict[str, Any]]:
    """Fetch active grants from California Grants Portal via data.ca.gov CKAN API."""
    url = f"https://data.ca.gov/api/3/action/datastore_search?resource_id=111c8c88-21f6-453c-ae2c-b4785a0624f5&limit={limit}"
    headers = {"User-Agent": "GTC360-IngestionEngine/1.0"}

    logger.info("Fetching California State Grants from data.ca.gov (limit %d)...", limit)
    start_t = time.time()
    try:
        resp = requests.get(url, headers=headers, timeout=90)
        resp.raise_for_status()
        data = resp.json()
        records = data.get("result", {}).get("records", [])

        grants = []
        for r in records:
            portal_id = str(r.get("PortalID") or r.get("_id") or "").strip()
            title = str(r.get("Title") or "").strip()
            if not portal_id or not title:
                continue

            gid = f"CA-{portal_id}"
            opp_number = str(r.get("GrantID") or gid).strip()
            agency = str(r.get("AgencyDept") or "State of California").strip()
            agency_code = "CA-STATE"

            purpose = str(r.get("Purpose") or "").strip()
            desc = str(r.get("Description") or "").strip()
            applicant_type = str(r.get("ApplicantType") or "").strip()
            categories = str(r.get("Categories") or "").strip()

            desc_parts = []
            if purpose:
                desc_parts.append(purpose)
            if desc:
                desc_parts.append(desc)
            if applicant_type:
                desc_parts.append(f"Eligible Applicants: {applicant_type}.")
            full_desc = "\n\n".join(desc_parts) if desc_parts else title

            raw_open = str(r.get("OpenDate") or "").strip()
            open_date = raw_open[:10] if raw_open else ""

            raw_close = str(r.get("ApplicationDeadline") or "").strip()
            close_date = raw_close[:10] if raw_close else "Ongoing"

            raw_status = str(r.get("Status") or "active").lower().strip()
            opp_status = "posted" if raw_status == "active" else raw_status
            doc_type = str(r.get("Type") or "State Grant").strip()
            grant_url = str(r.get("GrantURL") or f"https://www.grants.ca.gov/grants/{portal_id}").strip()

            grants.append(
                {
                    "grant_id": gid,
                    "opp_number": opp_number,
                    "title": title,
                    "agency_code": agency_code,
                    "agency": agency,
                    "open_date": open_date,
                    "close_date": close_date,
                    "opp_status": opp_status,
                    "doc_type": doc_type,
                    "cfda_list": categories,
                    "description": full_desc,
                    "grant_url": grant_url,
                    "source": "california",
                }
            )

        elapsed = time.time() - start_t
        logger.info("Retrieved %d California grants in %.2f seconds.", len(grants), elapsed)
        return grants
    except Exception as e:
        logger.error("Failed to fetch California grants: %s", e)
        return []


# ─── 3. Vectorize & Upsert Pipeline ───────────────────────────────────────────


def main():
    logger.info("=========================================================")
    logger.info(" GTC360 AI: Real Federal & California Grant Pipeline     ")
    logger.info("=========================================================")

    # 1. Fetch from live APIs
    fed = fetch_all_federal_grants(rows=2000)
    cal = fetch_all_california_grants(limit=50000)

    combined = fed + cal
    logger.info("Combined raw records fetched: %d", len(combined))

    # 2. Deduplicate
    unique_grants: dict[str, dict[str, Any]] = {}
    for g in combined:
        gid = g["grant_id"]
        if gid not in unique_grants:
            unique_grants[gid] = g

    grant_list = list(unique_grants.values())
    total = len(grant_list)
    logger.info("Unique grants to process and vectorize: %d", total)

    if total == 0:
        logger.error("No grants retrieved from APIs. Aborting.")
        return

    # 3. Load SentenceTransformer model
    logger.info("Loading SentenceTransformer ('all-MiniLM-L6-v2')...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # 4. Batch Vectorization
    batch_size = 128
    logger.info("Vectorizing grants in batches of %d...", batch_size)
    start_v = time.time()

    # Pre-build representation texts
    representations = []
    for g in grant_list:
        rep = f"{g['title']}. Issuing Agency: {g['agency']}. {g['description'][:500]}"
        representations.append(rep)

    embeddings = model.encode(
        representations,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
    )

    logger.info("Vectorization completed in %.2f seconds.", time.time() - start_v)

    # Attach embeddings and timestamps
    now = datetime.now(timezone.utc)
    for idx, g in enumerate(grant_list):
        g["embedding"] = embeddings[idx].tolist()
        g["updated_at"] = now

    # 5. Bulk Upsert to MongoDB Atlas
    logger.info("Writing records to MongoDB Atlas 'grants' collection...")
    start_db = time.time()

    bulk_ops = []
    for g in grant_list:
        bulk_ops.append(
            UpdateOne({"grant_id": g["grant_id"]}, {"$set": g}, upsert=True)
        )

    # Execute in chunks of 500
    chunk_size = 500
    total_upserted = 0
    for i in range(0, len(bulk_ops), chunk_size):
        chunk = bulk_ops[i : i + chunk_size]
        res = db.grants.bulk_write(chunk, ordered=False)
        total_upserted += (res.upserted_count or 0) + (res.modified_count or 0)
        logger.info(
            "Saved chunk %d/%d (%d ops)...",
            min(i + chunk_size, len(bulk_ops)),
            len(bulk_ops),
            total_upserted,
        )

    logger.info("Database write completed in %.2f seconds.", time.time() - start_db)

    # 6. Verify total in database
    db_count = db.grants.count_documents({})
    fed_count = db.grants.count_documents({"source": "federal"})
    cal_count = db.grants.count_documents({"source": "california"})

    logger.info("=========================================================")
    logger.info(" SYNC & UNIFICATION COMPLETE!                            ")
    logger.info(" Total Opportunities in MongoDB:  %d", db_count)
    logger.info("   - Federal (Grants.gov):        %d", fed_count)
    logger.info("   - California State:            %d", cal_count)
    logger.info("=========================================================")


if __name__ == "__main__":
    main()
