"""
GTC360 AI — Notification Manager
Evaluates user saved preferences against active and newly ingested grants,
ranks matching opportunities, tracks sent grant IDs to prevent duplicate alerts,
and dispatches executive email notifications.
"""

import logging
from typing import Any
from datetime import datetime, timezone
from bson import ObjectId

import db
import matcher
import email_service

logger = logging.getLogger("gtc360.notifications")


def evaluate_and_notify_user(
    user_id: str,
    is_test: bool = False,
    min_score: float = 0.35,
    top_n: int = 4,
) -> dict[str, Any]:
    """
    Evaluates saved preferences for a single user, identifies matching grants,
    and sends a branded GrantSignal 360° email alert.
    Tracks notified grant IDs in MongoDB to prevent spamming duplicate opportunities.
    """
    user = db.get_user_by_id(user_id)
    if not user:
        return {"status": "error", "message": f"User ID {user_id} not found."}

    recipient_email = user.get("email", "").strip().lower()
    if not recipient_email:
        return {"status": "error", "message": "User has no valid email address."}

    prefs = user.get("preferences", {}) or {}
    
    # Check if user has toggled notifications off (default is True)
    notifications_enabled = prefs.get("emailNotificationsEnabled", True)
    if not is_test and not notifications_enabled:
        logger.info("Skipping notifications for user %s (notifications disabled in preferences).", recipient_email)
        return {
            "status": "skipped",
            "recipient": recipient_email,
            "message": "User has opted out of email notifications.",
        }

    # Prepare active preferences for matching
    active_prefs = prefs.copy()
    if user.get("organizationType"):
        active_prefs["organizationType"] = user.get("organizationType")

    # Perform high-speed vector matching
    ranked = matcher.rank_grants(active_prefs, top_k=25)
    if not ranked:
        return {
            "status": "no_grants_available",
            "recipient": recipient_email,
            "message": "No grants found in system cache.",
        }

    # Already notified grant IDs
    notified_ids = set(prefs.get("notifiedGrantIds", []))

    # Only consider opportunities that are active or upcoming (not closed, not past deadline)
    active_ranked = [g for g in ranked if matcher.is_grant_active_or_upcoming(g)]

    # In test mode, always take top matches regardless of past notification
    if is_test:
        matching_grants = active_ranked[:top_n]
    else:
        # Filter out opportunities previously emailed
        candidates = [g for g in active_ranked if str(g.get("grant_id")) not in notified_ids]
        matching_grants = candidates[:top_n]

    if not matching_grants:
        logger.info("No new matching grants for user %s (all candidate opportunities already notified).", recipient_email)
        return {
            "status": "no_new_matches",
            "recipient": recipient_email,
            "message": "No new unnotified grants matching user preferences.",
        }

    # Build and dispatch email
    subject, plain_text, html_content = email_service.build_grant_alert_email(
        recipient_email=recipient_email,
        matching_grants=matching_grants,
        user_preferences=active_prefs,
        is_test=is_test,
    )

    delivery_result = email_service.send_email(
        to_email=recipient_email,
        subject=subject,
        plain_text=plain_text,
        html_content=html_content,
    )

    # If test or delivered, record notified grants in database
    new_grant_ids = [str(g.get("grant_id")) for g in matching_grants if g.get("grant_id")]
    if not is_test and new_grant_ids:
        try:
            database = db.get_database()
            oid = ObjectId(user_id)
            database.users.update_one(
                {"_id": oid},
                {
                    "$addToSet": {"preferences.notifiedGrantIds": {"$each": new_grant_ids}},
                    "$set": {"preferences.lastNotifiedAt": datetime.now(timezone.utc)},
                },
            )
        except Exception as e:
            logger.error("Failed to update notifiedGrantIds for user %s: %s", user_id, e)

    return {
        "status": "sent" if delivery_result.get("success") else "delivery_attempted",
        "recipient": recipient_email,
        "is_test": is_test,
        "grants_count": len(matching_grants),
        "grants": [{"id": g.get("grant_id"), "title": g.get("title")} for g in matching_grants],
        "delivery": delivery_result,
    }


def dispatch_all_notifications() -> dict[str, Any]:
    """
    Evaluates all registered users who have email notifications enabled,
    finds new matching grants, and dispatches email alerts.
    Called automatically after sync or via admin dispatch endpoint.
    """
    database = db.get_database()
    cursor = database.users.find(
        {"preferences.emailNotificationsEnabled": {"$ne": False}},
        {"_id": 1, "email": 1},
    )

    users_list = list(cursor)
    logger.info("Dispatching notifications for %d subscribed users...", len(users_list))

    results = []
    sent_count = 0
    skipped_count = 0
    error_count = 0

    for u in users_list:
        uid = str(u["_id"])
        try:
            res = evaluate_and_notify_user(user_id=uid, is_test=False)
            results.append(res)
            if res.get("status") == "sent":
                sent_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            logger.error("Error processing notifications for user %s: %s", uid, e)
            error_count += 1
            results.append({"status": "error", "user_id": uid, "error": str(e)})

    logger.info("Notification cycle complete: %d sent, %d skipped/no new, %d errors.", sent_count, skipped_count, error_count)
    return {
        "total_evaluated": len(users_list),
        "sent": sent_count,
        "skipped": skipped_count,
        "errors": error_count,
        "details": results,
    }
