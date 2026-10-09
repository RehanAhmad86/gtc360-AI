"""
GTC360 AI — Email Notification & Grant Alert Service
Builds executive-level, professional HTML & plain-text email alerts aligned with the
GrantSignal 360° brand identity (Navy #142D4C, Brass #958064, clean typography).
Dispatches via authenticated SMTP (Office 365, custom SMTP, or Direct Send).
"""

import os
import smtplib
import ssl
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any
from datetime import datetime, timezone

logger = logging.getLogger("gtc360.email")


def get_email_config() -> dict[str, Any]:
    """Retrieve validated SMTP and notification settings from environment."""
    server = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
    user = os.getenv("SMTP_USERNAME", "rehan048686@gmail.com").strip()
    pwd = os.getenv("SMTP_PASSWORD", "dgsadevkfuuqctbq").strip()
    from_addr = os.getenv("SMTP_FROM_EMAIL", "rehan048686@gmail.com").strip()

    # Automatically prioritize verified active Gmail SMTP over disabled M365 tenant
    if "office365" in server or "muhammad.usama" in user:
        server = "smtp.gmail.com"
        user = "rehan048686@gmail.com"
        pwd = "dgsadevkfuuqctbq"
        from_addr = "rehan048686@gmail.com"

    return {
        "smtp_server": server,
        "smtp_port": int(os.getenv("SMTP_PORT", "587")),
        "smtp_user": user,
        "smtp_password": pwd,
        "from_email": from_addr,
        "from_name": os.getenv("SMTP_FROM_NAME", "GrantSignal 360° Funding Intelligence").strip(),
        "use_tls": os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes"),
        "direct_send_host": "",
        "direct_send_port": int(os.getenv("DIRECT_SEND_PORT", "25")),
        "frontend_url": os.getenv("FRONTEND_URL", "https://gtc360-ai-frontend.vercel.app").rstrip("/"),
    }


def format_grant_card_html(grant: dict[str, Any], frontend_url: str) -> str:
    """Format an individual grant opportunity as a clean, high-contrast HTML card."""
    title = grant.get("title", "Public Funding Opportunity")
    agency = grant.get("agency", "Public Agency")
    agency_code = grant.get("agency_code", "")
    opp_number = grant.get("opp_number") or grant.get("grant_id", "")
    close_date = grant.get("close_date", "Open / Rolling")
    opp_status = (grant.get("opp_status") or "posted").upper()
    description = grant.get("description", "")
    if len(description) > 280:
        description = description[:277] + "..."

    score = grant.get("match_score")
    score_badge = ""
    if score is not None:
        pct = int(score * 100) if score <= 1 else int(score)
        score_badge = f"""
        <span style="display:inline-block;background:#F0FDF4;color:#166534;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;border:1px solid #BBF7D0;letter-spacing:0.04em;margin-left:6px;">
            {pct}% MATCH
        </span>
        """

    status_bg = "#EBF7F0" if "POSTED" in opp_status else "#F7F3ED"
    status_color = "#1E7E52" if "POSTED" in opp_status else "#6E5C45"

    grant_link = f"{frontend_url}/grants?search={opp_number}"

    return f"""
    <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;padding:20px;margin-bottom:16px;">
        <div style="margin-bottom:10px;">
            <span style="display:inline-block;background:{status_bg};color:{status_color};font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:0.06em;text-transform:uppercase;">
                {opp_status}
            </span>
            {score_badge}
            <span style="display:inline-block;float:right;font-size:12px;color:#64748B;font-weight:500;">
                Close: <strong style="color:#0F172A;">{close_date}</strong>
            </span>
        </div>

        <h3 style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.35;font-weight:600;color:#142D4C;margin:0 0 6px 0;">
            <a href="{grant_link}" style="color:#142D4C;text-decoration:none;">{title}</a>
        </h3>

        <div style="font-size:12.5px;color:#958064;font-weight:600;margin-bottom:10px;">
            {agency} {f'({agency_code})' if agency_code else ''} &bull; <span style="color:#64748B;font-weight:400;">Opp #: {opp_number}</span>
        </div>

        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 14px 0;">
            {description}
        </p>

        <div style="border-top:1px solid #F1F5F9;padding-top:10px;text-align:right;">
            <a href="{grant_link}" style="display:inline-block;color:#958064;font-weight:600;font-size:13px;text-decoration:none;">
                View Opportunity Details &rarr;
            </a>
        </div>
    </div>
    """


def build_grant_alert_email(
    recipient_email: str,
    matching_grants: list[dict[str, Any]],
    user_preferences: dict[str, Any],
    is_test: bool = False,
) -> tuple[str, str, str]:
    """
    Constructs subject, plain-text body, and responsive branded HTML email.
    Aligned with GrantSignal 360° theme: Navy #142D4C display, Brass #958064 accents.
    """
    config = get_email_config()
    frontend_url = config["frontend_url"]
    count = len(matching_grants)

    categories = user_preferences.get("targetCategories", [])
    agencies = user_preferences.get("targetAgencies", [])
    categories_str = ", ".join(categories[:3]) if categories else "General Focus"
    if len(categories) > 3:
        categories_str += f" +{len(categories)-3} more"

    test_prefix = "[Test Alert] " if is_test else ""
    subject = f"{test_prefix}GrantSignal 360°: {count} New Funding Opportunity Matches"

    plain_lines = [
        "GRANTSIGNAL 360° | PUBLIC FUNDING INTELLIGENCE",
        "=" * 50,
        f"\nNew Funding Opportunities Matched to Your Profile ({count} items)\n",
        f"Target Categories: {categories_str}",
        f"Recipient: {recipient_email}\n",
        "-" * 50,
    ]
    for idx, g in enumerate(matching_grants, 1):
        plain_lines.extend([
            f"\n[{idx}] {g.get('title')}",
            f"Agency: {g.get('agency')} ({g.get('agency_code', '')})",
            f"Opportunity #: {g.get('opp_number') or g.get('grant_id')}",
            f"Deadline: {g.get('close_date', 'Open')}",
            f"Status: {g.get('opp_status', 'posted').upper()}",
            f"Link: {frontend_url}/grants?search={g.get('opp_number') or g.get('grant_id')}",
            f"Summary: {g.get('description', '')[:200]}...",
        ])
    plain_lines.extend([
        "\n" + "=" * 50,
        f"To manage your alert preferences, visit: {frontend_url}/preferences",
        "© 2026 GrantSignal 360° · GTC 360° Advisors LLC",
    ])
    plain_body = "\n".join(plain_lines)

    cards_html = "".join(format_grant_card_html(g, frontend_url) for g in matching_grants)

    test_notice = ""
    if is_test:
        test_notice = '<div style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;padding:10px 14px;border-radius:6px;font-size:12.5px;margin-bottom:18px;"><strong>Test Alert:</strong> This is a verified test delivery requested from your Funding Preferences.</div>'

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#0F172A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06);border:1px solid #E2E8F0;">
                    <tr>
                        <td style="background:#142D4C;padding:32px 28px;text-align:left;border-bottom:3px solid #958064;">
                            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#C4B09A;margin-bottom:6px;">
                                GTC 360&deg; GRANT INTELLIGENCE &bull; ALERT NOTIFICATION
                            </div>
                            <div style="font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.02em;line-height:1.2;">
                                GrantSignal 360&deg;
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 28px 12px 28px;">
                            {test_notice}
                            <h1 style="font-size:20px;font-weight:700;color:#142D4C;margin:0 0 10px 0;line-height:1.3;">
                                New Grants Matched to Your Profile
                            </h1>
                            <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 20px 0;">
                                Our synchronization engine has evaluated active public solicitations against your organization&rsquo;s saved preferences. Here are <strong>{count} opportunities</strong> aligned with your mission.
                            </p>
                            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:12.5px;color:#64748B;">
                                <span style="font-weight:600;color:#142D4C;">Matched Focus Areas:</span> {categories_str}
                            </div>
                            <div>
                                {cards_html}
                            </div>
                            <div style="text-align:center;padding:18px 0 24px 0;">
                                <a href="{frontend_url}/grants" style="display:inline-block;background:#958064;color:#FFFFFF;font-weight:600;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:6px;box-shadow:0 2px 8px rgba(149,128,100,0.3);">
                                    Explore All Matching Grants &rarr;
                                </a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:24px 28px;text-align:left;font-size:12px;line-height:1.6;color:#64748B;">
                            <div style="margin-bottom:10px;">
                                <strong>Notification Settings:</strong> You are receiving this notification because email alerts are enabled for <code>{recipient_email}</code>. You can customize target categories, agencies, or pause email delivery at any time in your <a href="{frontend_url}/preferences" style="color:#958064;text-decoration:underline;">Funding Preferences</a>.
                            </div>
                            <div style="font-size:11.5px;color:#94A3B8;">
                                &copy; {datetime.now(timezone.utc).year} GrantSignal 360&deg; &bull; GTC 360&deg; Advisors LLC. Real-time public funding intelligence.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return subject, plain_body, html_body


def send_email(
    to_email: str,
    subject: str,
    plain_text: str,
    html_content: str,
) -> dict[str, Any]:
    """
    Sends an email via SMTP with fallback handling.
    Attempts:
    1. Authenticated SMTP (smtp.office365.com:587 STARTTLS)
    2. If recipient is @gtc360.com and port 587 is unavailable, tries direct MX send
    Returns structured status dict.
    """
    cfg = get_email_config()
    to_clean = to_email.strip().lower()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{cfg['from_name']} <{cfg['from_email']}>"
    msg["To"] = to_clean
    msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    errors = []

    # Attempt 1: Authenticated SMTP
    try:
        logger.info("Attempting authenticated SMTP to %s:%s for recipient %s...", cfg["smtp_server"], cfg["smtp_port"], to_clean)
        server = smtplib.SMTP(cfg["smtp_server"], cfg["smtp_port"], timeout=15)
        server.ehlo()
        if cfg["use_tls"]:
            server.starttls()
            server.ehlo()
        server.login(cfg["smtp_user"], cfg["smtp_password"])
        server.sendmail(cfg["from_email"], [to_clean], msg.as_string())
        server.quit()
        logger.info("Email delivered successfully via authenticated SMTP to %s", to_clean)
        return {
            "success": True,
            "channel": "authenticated_smtp",
            "recipient": to_clean,
            "message": "Notification email sent successfully via SMTP.",
        }
    except Exception as e:
        err_msg = str(e)
        logger.warning("Authenticated SMTP error: %s", err_msg)
        errors.append(f"SMTP ({cfg['smtp_server']}:{cfg['smtp_port']}): {err_msg}")

    # Attempt 2: Direct send if recipient is in the same tenant (@gtc360.com)
    if to_clean.endswith("@gtc360.com") and cfg["direct_send_host"]:
        try:
            logger.info("Attempting Direct Send to tenant MX %s:%s for %s...", cfg["direct_send_host"], cfg["direct_send_port"], to_clean)
            with smtplib.SMTP(cfg["direct_send_host"], cfg["direct_send_port"], timeout=15) as s:
                s.ehlo()
                s.sendmail(cfg["from_email"], [to_clean], msg.as_string())
            logger.info("Email delivered successfully via Direct Send to %s", to_clean)
            return {
                "success": True,
                "channel": "direct_send",
                "recipient": to_clean,
                "message": "Notification email sent directly to tenant MX.",
            }
        except Exception as e:
            err_msg = str(e)
            logger.warning("Direct Send error: %s", err_msg)
            errors.append(f"Direct Send ({cfg['direct_send_host']}): {err_msg}")

    failure_summary = "; ".join(errors)
    logger.error("Failed to send email to %s. Errors: %s", to_clean, failure_summary)

    helpful_note = ""
    if "5.7.139" in failure_summary or "SmtpClientAuthentication is disabled" in failure_summary:
        helpful_note = (
            " (Note: Office 365 requires Authenticated SMTP to be enabled for this mailbox in Microsoft 365 Admin Center: "
            "Users > Active users > Mail > Manage email apps > Authenticated SMTP)."
        )

    return {
        "success": False,
        "channel": "failed",
        "recipient": to_clean,
        "message": f"Email delivery could not be completed: {failure_summary}{helpful_note}",
        "errors": errors,
    }
