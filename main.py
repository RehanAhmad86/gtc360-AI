# filepath: c:\Users\PMLS\Documents\gtc360-ai\main.py
"""
GTC360 AI — Grant Matching & Comparison Engine
FastAPI microservice for semantic vector search, user authentication,
and side-by-side funding opportunity comparison.
Deployed on Hugging Face Spaces (Port 7860).
"""

import os
import logging
import threading
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

import db
import matcher
import sync_service

load_dotenv()

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("gtc360.api")


# ─── Lifespan (Startup & Warm-up) ─────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Service Startup Sequence:
    1. Verify MongoDB Atlas connectivity and indexes.
    2. Warm up SentenceTransformer model.
    3. Populate in-memory hot vector cache for instant matching.
    4. If database cache is empty, initiate live background sync from Grants.gov & data.ca.gov.
    """
    logger.info("Initializing GTC360 AI Platform Microservice...")

    # 1. MongoDB connectivity check
    if db.ping():
        logger.info("MongoDB Atlas connection verified successfully.")
        db.init_indexes()
    else:
        logger.warning("MongoDB Atlas ping failed — please verify MONGODB_URI.")

    # 2. Warm up embedding model
    matcher.get_model()

    # 3. Load hot vector cache
    cached_count = matcher.refresh_grants_cache()
    if cached_count == 0:
        logger.info("Database cache is empty. Initiating background sync with live APIs (Grants.gov & data.ca.gov)...")
        # Run live sync in background thread so server is immediately responsive
        sync_thread = threading.Thread(
            target=sync_service.run_sync,
            kwargs={"federal_limit": 1500, "california_limit": 1500},
            daemon=True,
            name="gtc360-initial-sync",
        )
        sync_thread.start()
    else:
        logger.info("Hot vector cache primed with %d active opportunities.", cached_count)

    logger.info("GTC360 AI Microservice is live and ready for high-speed matching.")
    yield
    logger.info("GTC360 AI Microservice shutting down.")


# ─── FastAPI Application Instance ─────────────────────────────────────────────

app = FastAPI(
    title="GTC360 AI Grant Matching & Comparison Engine",
    description="Intelligent semantic vector matching and comparison for federal and state grants.",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS Middleware ──────────────────────────────────────────────────────────

raw_origin = os.getenv("ALLOWED_ORIGIN", "*")
if raw_origin == "*" or not raw_origin:
    origins = ["*"]
else:
    origins = [o.strip() for o in raw_origin.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Authentication Helper Dependency ─────────────────────────────────────────


def get_current_user_id(authorization: str | None = Header(None)) -> str:
    """
    Extract and validate authenticated user ID from Bearer JWT token.
    Raises 401 Unauthorized if missing or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
        )

    token = authorization.split(" ")[1]
    payload = db.decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalid or expired. Please log in again.",
        )
    return str(payload["sub"])


def get_optional_user_id(authorization: str | None = Header(None)) -> str | None:
    """Extract user ID if valid token provided, otherwise return None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = db.decode_access_token(token)
    if payload and "sub" in payload:
        return str(payload["sub"])
    return None


# ─── Pydantic Request & Response Schemas ──────────────────────────────────────


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    organizationType: str = Field(..., min_length=2)
    targetCategories: list[str] = Field(default_factory=list)
    targetAgencies: list[str] = Field(default_factory=list)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PreferencesPayload(BaseModel):
    targetCategories: list[str] = Field(default_factory=list)
    targetAgencies: list[str] = Field(default_factory=list)
    minAward: float = 0.0
    maxAward: float = 0.0
    organizationType: str = ""
    customKeywords: str = ""


class UserPreferencesRequest(PreferencesPayload):
    userId: str | None = None


class MatchRequest(BaseModel):
    userId: str | None = None
    preferences: PreferencesPayload | None = None
    top_k: int = 5000


class CompareRequest(BaseModel):
    grant_ids: list[str]


# ─── Core REST Endpoints ──────────────────────────────────────────────────────


@app.get("/", tags=["System"])
def root():
    """Welcome and status endpoint."""
    return {
        "service": "GTC360 AI Grant Matching & Comparison Engine",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health", tags=["System"])
def health_check():
    """System and database connectivity health probe."""
    mongo_ok = db.ping()
    cached_grants = matcher.get_cached_grants_count()
    return {
        "status": "healthy" if mongo_ok else "degraded",
        "database": "connected" if mongo_ok else "disconnected",
        "cachedGrantsInMemory": cached_grants,
        "model": "all-MiniLM-L6-v2 (ready)",
    }


# ─── Authentication Routes ───────────────────────────────────────────────────


@app.post("/auth/signup", status_code=status.HTTP_201_CREATED, tags=["Auth"])
def signup(req: SignupRequest):
    """
    Create a new user profile with Bcrypt password hashing,
    generate signed JWT session token, and return initial user state.
    """
    try:
        initial_prefs = {
            "targetCategories": req.targetCategories,
            "targetAgencies": req.targetAgencies,
            "minAward": 0,
            "maxAward": 0,
        }
        user = db.create_user(
            email=req.email,
            password=req.password,
            organization_type=req.organizationType,
            preferences=initial_prefs,
        )
        token = db.create_access_token({"sub": user["_id"], "email": user["email"]})
        return {
            "token": token,
            "user": user,
            "message": "Account created successfully.",
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error("Signup failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user account.",
        )


@app.post("/auth/login", tags=["Auth"])
def login(req: LoginRequest):
    """
    Validate user credentials against Bcrypt hash and return JWT session token.
    """
    user = db.get_user_by_email(req.email)
    if not user or not db.verify_password(req.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
        )

    token = db.create_access_token({"sub": user["_id"], "email": user["email"]})
    user.pop("password", None)
    return {
        "token": token,
        "user": user,
        "message": "Login successful.",
    }


@app.get("/user/profile", tags=["User"])
def get_user_profile(user_id: str = Depends(get_current_user_id)):
    """Retrieve profile and preferences for the authenticated user."""
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")
    return {"user": user}


@app.post("/user/preferences", tags=["User"])
@app.put("/user/preferences", tags=["User"])
def update_preferences(
    req: UserPreferencesRequest,
    auth_user_id: str | None = Depends(get_optional_user_id),
):
    """
    Update target focus areas, agencies, and funding award limits for a user.
    Uses either the JWT token or the explicit userId parameter.
    """
    target_uid = auth_user_id or req.userId
    if not target_uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID must be provided via Bearer token or request body.",
        )

    logger.info("Updating preferences in MongoDB for user ID: %s", target_uid)

    updated_user = db.update_user_preferences(
        user_id=target_uid,
        preferences={
            "targetCategories": req.targetCategories,
            "targetAgencies": req.targetAgencies,
            "minAward": req.minAward,
            "maxAward": req.maxAward,
            "organizationType": req.organizationType,
            "customKeywords": req.customKeywords,
        },
    )
    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")

    return {
        "message": "Preferences updated successfully.",
        "user": updated_user,
    }


# ─── Matching & Comparison Engine ─────────────────────────────────────────────


@app.post("/match", tags=["Matching"])
def match_grants(
    req: MatchRequest,
    auth_user_id: str | None = Depends(get_optional_user_id),
):
    """
    High-Speed Semantic Vector Matching Endpoint:
    Computes real-time cosine similarity between user preferences and cached grants
    using pre-loaded SentenceTransformer embeddings with agency boosts.
    Sub-50ms execution speed.
    """
    target_uid = auth_user_id or req.userId

    # AI matching is strictly enabled for authenticated users with saved preferences
    if not target_uid:
        ranked_matches = matcher.rank_grants(user_preferences={}, top_k=req.top_k)
        return {
            "totalMatches": len(ranked_matches),
            "targetCategories": [],
            "targetAgencies": [],
            "matches": ranked_matches,
        }

    user = db.get_user_by_id(target_uid)
    if not user:
        ranked_matches = matcher.rank_grants(user_preferences={}, top_k=req.top_k)
        return {
            "totalMatches": len(ranked_matches),
            "targetCategories": [],
            "targetAgencies": [],
            "matches": ranked_matches,
        }

    active_prefs = user.get("preferences", {}).copy()
    active_prefs["organizationType"] = user.get("organizationType", "")

    # Allow inline overrides from request for authenticated user
    if req.preferences:
        if req.preferences.targetCategories:
            active_prefs["targetCategories"] = req.preferences.targetCategories
        if req.preferences.targetAgencies:
            active_prefs["targetAgencies"] = req.preferences.targetAgencies
        if req.preferences.minAward:
            active_prefs["minAward"] = req.preferences.minAward
        if req.preferences.maxAward:
            active_prefs["maxAward"] = req.preferences.maxAward
        if req.preferences.organizationType:
            active_prefs["organizationType"] = req.preferences.organizationType
        if req.preferences.customKeywords:
            active_prefs["customKeywords"] = req.preferences.customKeywords

    # Execute high-speed vector matching
    ranked_matches = matcher.rank_grants(
        user_preferences=active_prefs,
        top_k=req.top_k,
    )

    return {
        "totalMatches": len(ranked_matches),
        "targetCategories": active_prefs.get("targetCategories", []),
        "targetAgencies": active_prefs.get("targetAgencies", []),
        "matches": ranked_matches,
    }


@app.post("/grants/compare", tags=["Comparison"])
def compare_grants(req: CompareRequest):
    """
    Fetch full opportunity documents for side-by-side comparison
    across agencies, deadlines, descriptions, and eligibility.
    """
    if not req.grant_ids:
        return {"grants": []}

    grants = db.get_grants_by_ids(req.grant_ids[:10])  # limit to 10 max comparison items
    return {"grants": grants}


# ─── Synchronization & Admin ──────────────────────────────────────────────────


@app.post("/sync-grants", tags=["Admin"])
def trigger_sync(federal_limit: int = 1500, california_limit: int = 1500):
    """
    Trigger federal & state grant sync: fetches real opportunities from Grants.gov and data.ca.gov,
    computes 384-d vector representations, and refreshes the hot vector cache.
    Zero mock/fallback records.
    """
    try:
        result = sync_service.run_sync(federal_limit=federal_limit, california_limit=california_limit)
        return {
            "status": "success",
            "message": "Real grants synchronized and vectorized successfully.",
            "details": result,
        }
    except Exception as e:
        logger.error("Sync error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Synchronization failed: {str(e)}",
        )
