# filepath: c:\Users\PMLS\Documents\gtc360-ai\db.py
"""
GTC360 AI — MongoDB Atlas Database Layer
Connects to MongoDB Atlas (database: gtc3608686).
Provides secure user credential management, Bcrypt hashing, JWT generation,
and high-speed cached grant vector operations.
"""

import os
import re
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from dotenv import load_dotenv
import bcrypt
from pymongo import MongoClient, ASCENDING, TEXT
from pymongo.server_api import ServerApi
from jose import jwt, JWTError

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Auth & Crypto Configurations ─────────────────────────────────────────────

SECRET_KEY = os.getenv("SECRET_KEY", "gtc360-default-insecure-secret-key-change-in-env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    """Return a salted Bcrypt hash of the password using native bcrypt."""
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the stored Bcrypt hash."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception as e:
        logger.error("Password verification error: %s", e)
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Generate a signed JWT token containing the provided payload data."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a signed JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.debug("JWT decode failed: %s", e)
        return None


# ─── MongoDB Singleton Connection ─────────────────────────────────────────────

_client: MongoClient | None = None


def _normalize_mongo_uri(uri: str) -> str:
    """
    Safely handle passwords containing unencoded '@' characters.
    e.g., 'mongodb+srv://gtc3608686:gtc3608686@@cluster0...' -> escapes to '%40@'
    """
    if not uri:
        return ""
    # Look for mongodb+srv://username:password@hostname pattern
    pattern = r"^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.*)$"
    match = re.match(pattern, uri)
    if match:
        prefix, user, raw_pass, host = match.groups()
        # If password contains '@' but not '%40', url-encode it
        if "@" in raw_pass and "%40" not in raw_pass:
            safe_pass = raw_pass.replace("@", "%40")
            return f"{prefix}{user}:{safe_pass}@{host}"
    return uri


def get_client() -> MongoClient:
    """Return a cached singleton MongoClient instance."""
    global _client
    if _client is None:
        raw_uri = os.getenv("MONGODB_URI")
        if not raw_uri:
            raise RuntimeError("MONGODB_URI environment variable is not configured")
        clean_uri = _normalize_mongo_uri(raw_uri)
        _client = MongoClient(clean_uri, server_api=ServerApi("1"), connectTimeoutMS=10000)
    return _client


def get_database():
    """Return the designated database instance (default: gtc3608686)."""
    db_name = os.getenv("DB_NAME", "gtc3608686")
    return get_client()[db_name]


def ping() -> bool:
    """Ping MongoDB Atlas to confirm connection health."""
    try:
        get_client().admin.command("ping")
        return True
    except Exception as e:
        logger.warning("MongoDB ping failed: %s", e)
        return False


def init_indexes() -> None:
    """Ensure all required indexes exist across users and grants collections."""
    try:
        db = get_database()

        # Users indexes: unique on email
        db.users.create_index([("email", ASCENDING)], unique=True)

        # Grants indexes: unique on grant_id, text search on title & description
        db.grants.create_index([("grant_id", ASCENDING)], unique=True)
        db.grants.create_index([("title", TEXT), ("description", TEXT)], name="grant_text_idx")
        db.grants.create_index([("source", ASCENDING)])
        db.grants.create_index([("agency_code", ASCENDING)])
        db.grants.create_index([("opp_status", ASCENDING)])

        logger.info("MongoDB indexes verified successfully.")
    except Exception as e:
        logger.error("Failed to initialize MongoDB indexes: %s", e)


# ─── User Operations ──────────────────────────────────────────────────────────


def create_user(
    email: str,
    password: str,
    organization_type: str,
    preferences: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Create a new user document with Bcrypt hashed password.
    Returns the newly created user document without the password hash.
    """
    db = get_database()
    clean_email = email.strip().lower()

    if db.users.find_one({"email": clean_email}):
        raise ValueError("An account with this email address already exists.")

    default_prefs = {
        "targetCategories": [],
        "targetAgencies": [],
        "minAward": 0,
        "maxAward": 0,
    }
    if preferences:
        default_prefs.update(preferences)

    doc = {
        "email": clean_email,
        "password": hash_password(password),
        "organizationType": organization_type.strip(),
        "preferences": default_prefs,
        "createdAt": datetime.now(timezone.utc),
    }

    result = db.users.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc.pop("password", None)
    return doc


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Retrieve full user document by email (includes password for login verification)."""
    db = get_database()
    clean_email = email.strip().lower()
    user = db.users.find_one({"email": clean_email})
    if user:
        user["_id"] = str(user["_id"])
    return user


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    """Retrieve user document by ID, omitting the sensitive password hash."""
    db = get_database()
    try:
        oid = ObjectId(user_id)
    except Exception:
        return None

    user = db.users.find_one({"_id": oid}, {"password": 0})
    if user:
        user["_id"] = str(user["_id"])
    return user


def update_user_preferences(user_id: str, preferences: dict[str, Any]) -> dict[str, Any] | None:
    """
    Update matching preferences for a given user.
    Updates targetCategories, targetAgencies, minAward, and maxAward.
    """
    db = get_database()
    try:
        oid = ObjectId(user_id)
    except Exception:
        return None

    allowed_keys = ["targetCategories", "targetAgencies", "minAward", "maxAward", "organizationType", "customKeywords"]
    update_data = {f"preferences.{k}": v for k, v in preferences.items() if k in allowed_keys}
    if "organizationType" in preferences and preferences["organizationType"]:
        update_data["organizationType"] = preferences["organizationType"]

    if not update_data:
        return get_user_by_id(user_id)

    db.users.update_one({"_id": oid}, {"$set": update_data})
    return get_user_by_id(user_id)


# ─── Grants Operations ────────────────────────────────────────────────────────


def upsert_grant(grant_data: dict[str, Any]) -> bool:
    """Insert or update a grant opportunity document by grant_id."""
    db = get_database()
    grant_id = grant_data.get("grant_id")
    if not grant_id:
        return False

    grant_data["updated_at"] = datetime.now(timezone.utc)
    db.grants.update_one(
        {"grant_id": grant_id},
        {"$set": grant_data},
        upsert=True,
    )
    return True


def upsert_grants_batch(grant_list: list[dict[str, Any]]) -> int:
    """Batch upsert multiple grants into the grants collection."""
    if not grant_list:
        return 0
    db = get_database()
    from pymongo import UpdateOne

    now = datetime.now(timezone.utc)
    operations = []
    for g in grant_list:
        gid = g.get("grant_id")
        if not gid:
            continue
        g["updated_at"] = now
        operations.append(
            UpdateOne({"grant_id": gid}, {"$set": g}, upsert=True)
        )

    if operations:
        result = db.grants.bulk_write(operations, ordered=False)
        return (result.upserted_count or 0) + (result.modified_count or 0)
    return 0


def get_all_grants_with_embeddings() -> list[dict[str, Any]]:
    """
    Fetch all active grants containing precomputed embeddings for the in-memory cache.
    Returns grant_id, title, agency, agency_code, open_date, close_date, opp_status,
    description, grant_url, source, and embedding.
    """
    db = get_database()
    cursor = db.grants.find(
        {"embedding": {"$exists": True, "$ne": []}},
        {
            "_id": 0,
            "grant_id": 1,
            "opp_number": 1,
            "title": 1,
            "agency": 1,
            "agency_code": 1,
            "open_date": 1,
            "close_date": 1,
            "opp_status": 1,
            "description": 1,
            "grant_url": 1,
            "source": 1,
            "embedding": 1,
        },
    )
    return list(cursor)


def get_grants_by_ids(grant_ids: list[str]) -> list[dict[str, Any]]:
    """Retrieve detailed grant documents for comparison by their grant_ids."""
    if not grant_ids:
        return []
    db = get_database()
    cursor = db.grants.find(
        {"grant_id": {"$in": grant_ids}},
        {"_id": 0, "embedding": 0},
    )
    return list(cursor)


def count_grants() -> int:
    """Return total number of grants stored in the database."""
    try:
        return get_database().grants.count_documents({})
    except Exception:
        return 0
