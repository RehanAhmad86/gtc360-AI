# filepath: c:\Users\PMLS\Documents\gtc360-ai\backfill_embeddings.py
"""
GTC360 AI — Grants Sync & Embedding Backfill CLI
Directly fetches real opportunities from Grants.gov and data.ca.gov,
computes 384-dimensional SentenceTransformer embeddings, and saves into MongoDB Atlas.
Usage:
    python backfill_embeddings.py
"""

import sys
import logging
from dotenv import load_dotenv

load_dotenv()

import db
import matcher
import sync_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger("gtc360.backfill")


def main():
    logger.info("Starting live GTC360 grants sync & embedding backfill (Grants.gov + data.ca.gov)...")

    # Initialize DB indexes
    db.init_indexes()

    # Pre-warm model
    matcher.get_model()

    # Execute sync with real APIs
    result = sync_service.run_sync(federal_limit=2500, california_limit=2500)
    logger.info("Live backfill complete! Result: %s", result)


if __name__ == "__main__":
    main()
