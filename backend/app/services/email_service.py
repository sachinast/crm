"""Email notification & customer authorization dispatch service.
Implements responsive HTML templates matching Word documents & client screenshots:
- Car_Rental_Payment_Authorization_Confirmation.docx
- CAR RENTAL MODIFICATION PAYMENT AUTHORIZATION.docx
- Car_Rental_Cancellation_Authorization_Template.docx
"""
import logging
import os
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core import config

logger = logging.getLogger(__name__)


def get_settings():
    return config.get_settings()


def mask_card_number(raw_num: str | None) -> str:
    if not raw_num:
        return "•••• •••• •••• ••••"
    digits = "".join(filter(str.isdigit, raw_num))
    if len(digits) >= 4:
        return f"**** **** **** {digits[-4:]}"
    return "**** **** **** ****"



def _format_datetime(dt_val: Any) -> str:
    if not dt_val:
        return "—"
    if isinstance(dt_val, datetime):
        return dt_val.strftime("%d-%b-%Y %I:%M %p")
    try:
        s = str(dt_val).replace("Z", "+00:00")
        d = datetime.fromisoformat(s)
        return d.strftime("%d-%b-%Y %I:%M %p")
    except Exception:
        return str(dt_val)


def _calculate_duration(pickup: Any, ret: Any) -> str:
    if not pickup or not ret:
        return "1 Day"
    try:
        p_dt = pickup if isinstance(pickup, datetime) else datetime.fromisoformat(str(pickup).replace("Z", "+00:00"))
        r_dt = ret if isinstance(ret, datetime) else datetime.fromisoformat(str(ret).replace("Z", "+00:00"))
        secs = (r_dt - p_dt).total_seconds()
        days = max(1, int(round(secs / 86400)))
        return f"{days} {'Day' if days == 1 else 'Days'}"
    except Exception:
        return "1 Day"


def generate_authorization_email_html(
    *,
    lead_id: str,
    customer_name: str,
    customer_email: str,
    customer_phone: str = "",
    customer_dob: str = "",
    booking_reference: str = "",
    agency_reference: str = "done",
    booking_platform: str = "Direct",
    car_provider: str = "Car Rental",
    driver_name: str = "",
    vehicle_type: str = "",
    car_model: str = "",
    pickup_datetime: Any = None,
    pickup_location: str = "",
    return_datetime: Any = None,
    return_location: str = "",
    rental_duration: str = "",
    card_type: str = "Credit Card",
    card_number: str = "",
    card_holder_name: str = "",
    prepaid_amount: float = 0.0,
    pay_at_counter_amount: float = 0.0,
    total_amount: float = 0.0,
    service_type: str = "car",
    agent_name: str = "Customer Support",
    support_phone: str | None = None,
    support_email: str | None = None,
    template_type: str = "new_booking",  # "new_booking" | "modification" | "cancellation"
) -> str:
    """Generates email matching New_Booking_Car_Rental_Payment_Authorization_Template (1).docx."""
    settings = get_settings()
    brand_name = settings.resend_from_name or "E-Booking Desk"
    active_support_email = support_email or settings.resend_from_email
    active_support_phone = support_phone or settings.support_phone

    auth_url = f"{settings.frontend_url.rstrip('/')}/authorize/{lead_id}"
    booking_ref_display = booking_reference or f"CRM-{lead_id[:6].upper()}"
    lead_driver = driver_name or customer_name or "Lead Driver"
    v_type = vehicle_type.replace("_", " ").title() if vehicle_type else "Standard"
    v_model = f"{car_model} or Similar" if car_model else f"{v_type} or Similar"

    pickup_str = _format_datetime(pickup_datetime)
    pickup_display = f"{pickup_str} — {pickup_location}" if pickup_location else pickup_str
    return_str = _format_datetime(return_datetime)
    return_display = f"{return_str} — {return_location}" if return_location else return_str

    duration_display = rental_duration or _calculate_duration(pickup_datetime, return_datetime)
    calc_total = total_amount if total_amount > 0 else (prepaid_amount + pay_at_counter_amount)

    title_header = "CAR RENTAL PAYMENT AUTHORIZATION"
    if template_type == "modification":
        title_header = "CAR RENTAL MODIFICATION PAYMENT AUTHORIZATION"
    elif template_type == "cancellation":
        title_header = "CAR RENTAL CANCELLATION AUTHORIZATION"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }}
    .header-bar {{ background: #0f4c81; color: #ffffff; padding: 18px 24px; display: table; width: 100%; box-sizing: border-box; }}
    .header-title {{ font-size: 17px; font-weight: 800; letter-spacing: 0.5px; text-align: left; vertical-align: middle; display: table-cell; }}
    .header-brand {{ font-size: 16px; font-weight: 700; color: #f59e0b; text-align: right; vertical-align: middle; display: table-cell; }}
    .content {{ padding: 28px 24px; }}
    .salutation {{ font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }}
    .intro {{ font-size: 13px; line-height: 1.65; color: #334155; margin-bottom: 16px; }}
    .auth-ref {{ background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0f4c81; padding: 10px 14px; font-size: 13px; font-weight: 700; color: #0f4c81; margin-bottom: 22px; border-radius: 4px; }}
    .section-title {{ font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0f4c81; margin: 20px 0 8px 0; }}
    .section-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #cbd5e1; }}
    .section-table th {{ background: #f8fafc; color: #0f4c81; font-size: 12.5px; font-weight: 700; text-align: left; padding: 9px 14px; border-bottom: 2px solid #cbd5e1; }}
    .section-table td {{ padding: 8.5px 14px; font-size: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }}
    .section-table tr td:first-child {{ width: 38%; font-weight: 600; color: #475569; background: #fafbfc; }}
    .important-box {{ background: #fffbeb; border: 1px solid #fef08a; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 12px 14px; font-size: 12px; line-height: 1.6; color: #78350f; margin-bottom: 22px; }}
    .auth-terms-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px 18px; margin-bottom: 24px; }}
    .auth-terms-title {{ font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }}
    .auth-list {{ margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.7; color: #334155; }}
    .auth-checkbox-statement {{ margin-top: 14px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 12.5px; font-weight: 700; color: #065f46; display: flex; align-items: center; gap: 8px; }}
    .cta-container {{ text-align: center; margin: 32px 0 20px 0; }}
    .cta-button {{ background: #ea580c; color: #ffffff !important; padding: 14px 48px; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 6px; display: inline-block; box-shadow: 0 3px 8px rgba(234, 88, 12, 0.35); text-transform: uppercase; letter-spacing: 1px; }}
    .cta-subtext {{ font-size: 11px; color: #64748b; line-height: 1.55; margin-top: 10px; max-width: 580px; margin-left: auto; margin-right: auto; }}
    .footer {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <div class="header-title">{title_header}</div>
      <div class="header-brand">{brand_name}</div>
    </div>

    <div class="content">
      <div class="salutation">Dear {customer_name},</div>
      <div class="intro">
        Thank you for choosing <strong>{brand_name}</strong> for your new car rental reservation. Please review your reservation details below and confirm your authorization so that we may complete your booking.
      </div>

      <div class="auth-ref">
        Authorization Reference: <span>{booking_ref_display}</span>
      </div>

      <!-- Reservation Details Table -->
      <table class="section-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Booking Reference</td><td><strong>{booking_ref_display}</strong></td></tr>
          <tr><td>Rental Company</td><td>{car_provider}</td></tr>
          <tr><td>Booking Platform</td><td>{booking_platform}</td></tr>
          <tr><td>Lead Driver</td><td>{lead_driver}</td></tr>
          <tr><td>Vehicle Type</td><td>{v_type}</td></tr>
          <tr><td>Vehicle Model</td><td>{v_model}</td></tr>
          <tr><td>Pick-up</td><td>{pickup_display}</td></tr>
          <tr><td>Return</td><td>{return_display}</td></tr>
          <tr><td>Rental Duration</td><td><strong>{duration_display}</strong></td></tr>
        </tbody>
      </table>

      <!-- Payment Breakdown Table -->
      <div class="section-title">Payment Breakdown</div>
      <table class="section-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Prepaid Amount (Charged Now)</td><td><strong>USD {prepaid_amount:.2f}</strong></td></tr>
          <tr><td>Pay at Counter (Due at Pickup)</td><td>USD {pay_at_counter_amount:.2f}</td></tr>
          <tr><td>Total Reservation Value</td><td><strong style="color: #0f4c81; font-size: 13px;">USD {calc_total:.2f}</strong></td></tr>
        </tbody>
      </table>

      <!-- Important Notice -->
      <div class="important-box">
        <strong>Important:</strong> The Prepaid Amount will be charged by {brand_name}. The Pay at Counter amount is payable directly to the rental company at vehicle pickup. Additional deposits or optional charges may be required by the rental company.
      </div>

      <!-- Customer Authorization Box -->
      <div class="auth-terms-box">
        <div class="auth-terms-title">Customer Authorization</div>
        <ul class="auth-list">
          <li>I am the authorized holder of the payment card provided.</li>
          <li>I authorize {brand_name} to charge the Prepaid Amount for my reservation.</li>
          <li>I understand the Pay at Counter amount is payable directly to the rental company.</li>
          <li>I have reviewed and approved the reservation details and payment breakdown.</li>
          <li>I authorize {brand_name} to complete my reservation with the selected rental supplier.</li>
          <li>I understand the rental company terms and conditions apply.</li>
          <li>I understand this charge is non-refundable and non-disputable.</li>
        </ul>
        <div class="auth-checkbox-statement">
          &#9745; I agree to all terms and conditions
        </div>
      </div>

      <!-- CTA Button -->
      <div class="cta-container">
        <div><strong>Confirm Your Authorization</strong></div>
        <div style="margin-top: 10px;">
          <a href="{auth_url}" target="_blank" class="cta-button">I AUTHORIZE</a>
        </div>
        <p class="cta-subtext">
          By clicking the &ldquo;I Authorize&rdquo; button on the live email, your electronic authorization should be securely recorded with the booking reference, customer name, prepaid amount, pay-at-counter amount, timestamp, IP address, browser/device information, email address ({customer_email}), and consent status.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>Need Help?</strong> {agent_name} | 24/7 Customer Support: <strong>{active_support_phone}</strong></p>
      {f'<p style="margin: 0 0 6px 0;"><a href="mailto:{active_support_email}" style="color: #0f4c81;">{active_support_email}</a></p>' if active_support_email else ''}
      <p style="margin: 0;">Thank you for choosing {brand_name}. &copy; {datetime.now().year} {brand_name}. All rights reserved. <em>This is an automated authorization email.</em></p>
    </div>
  </div>
</body>
</html>"""


def generate_confirmation_email_html(
    *,
    lead_id: str,
    customer_name: str,
    customer_email: str,
    booking_reference: str = "",
    car_provider: str = "Car Rental",
    booking_platform: str = "Direct",
    prepaid_amount: float = 0.0,
    pay_at_counter_amount: float = 0.0,
    total_amount: float = 0.0,
    client_ip: str = "0.0.0.0",
    user_agent: str = "Desktop Browser",
) -> str:
    """Generates confirmation email matching Car_Rental_Payment_Authorization_Confirmation.docx."""
    settings = get_settings()
    brand_name = settings.resend_from_name or "E-Booking Desk"
    now_utc = datetime.now(timezone.utc)
    date_str = now_utc.strftime("%d-%b-%Y")
    time_str = now_utc.strftime("%H:%M:%S UTC")

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }}
    .container {{ max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }}
    .header {{ background: #0f4c81; color: #ffffff; padding: 18px 24px; }}
    .content {{ padding: 24px; }}
    .badge {{ background: #ecfdf5; border: 1px solid #10b981; color: #047857; padding: 10px 14px; border-radius: 6px; font-weight: bold; font-size: 13px; }}
    table {{ width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e2e8f0; }}
    th {{ background: #f8fafc; text-align: left; padding: 10px; font-size: 12px; color: #0f4c81; }}
    td {{ padding: 8px 10px; font-size: 12px; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0; font-size: 18px;">Car Rental Payment Authorization Confirmed</h2>
      <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">{brand_name}</p>
    </div>
    <div class="content">
      <div class="badge">
        &#10004; Payment Authorization Successfully Recorded — Reference: {booking_reference or lead_id[:8].upper()}
      </div>
      <p style="font-size: 13px; line-height: 1.6; margin-top: 16px;">
        Dear <strong>{customer_name}</strong>,<br>
        Thank you for confirming your authorization for your car rental reservation with <strong>{brand_name}</strong>. This email confirms that your authorization was successfully recorded for the reservation and payment described below.
      </p>

      <table>
        <thead><tr><th colspan="2">Reservation Details</th></tr></thead>
        <tbody>
          <tr><td style="font-weight: 600; width: 40%;">Authorization Reference</td><td><strong>{booking_reference or 'CRM-' + lead_id[:6].upper()}</strong></td></tr>
          <tr><td style="font-weight: 600;">Car Provider</td><td>{car_provider}</td></tr>
          <tr><td style="font-weight: 600;">Booking Platform</td><td>{booking_platform}</td></tr>
          <tr><td style="font-weight: 600;">Prepaid Amount</td><td>USD {prepaid_amount:.2f}</td></tr>
          <tr><td style="font-weight: 600;">Pay at Counter</td><td>USD {pay_at_counter_amount:.2f}</td></tr>
          <tr><td style="font-weight: 600;">Total Amount</td><td><strong>USD {total_amount:.2f}</strong></td></tr>
        </tbody>
      </table>

      <table>
        <thead><tr><th colspan="2">Authorization Audit Record</th></tr></thead>
        <tbody>
          <tr><td style="font-weight: 600; width: 40%;">Authorization Date</td><td>{date_str}</td></tr>
          <tr><td style="font-weight: 600;">Authorization Time</td><td>{time_str}</td></tr>
          <tr><td style="font-weight: 600;">Customer Email</td><td>{customer_email}</td></tr>
          <tr><td style="font-weight: 600;">Client IP Address</td><td>{client_ip}</td></tr>
          <tr><td style="font-weight: 600;">Consent Status</td><td><strong style="color: #047857;">AUTHORIZED (CONFIRMED)</strong></td></tr>
        </tbody>
      </table>

      <p style="font-size: 11.5px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 14px;">
        Important: You have authorized {brand_name} to charge USD {prepaid_amount:.2f} for the prepaid portion of your reservation. The USD {pay_at_counter_amount:.2f} balance is payable directly to the rental company at vehicle pickup.
      </p>
    </div>
  </div>
</body>
</html>"""


async def send_customer_email(
    to_email: str,
    subject: str,
    html_content: str,
) -> tuple[bool, str]:
    """Dispatches email via Resend API (HTTP) using RESEND_API_KEY and RESEND_FROM_EMAIL from env.
    Returns (success: bool, detail_message: str).
    """
    if not to_email or not to_email.strip():
        logger.warning("[Email Service] send_customer_email: No recipient email provided.")
        return False, "Recipient email address is missing."

    settings = config.get_settings()

    # Resend API (Direct HTTP using environment variables)
    if settings.resend_api_key:
        from_name = settings.resend_from_name
        from_email = settings.resend_from_email

        if not from_email:
            msg = "RESEND_FROM_EMAIL environment variable is not configured on the backend."
            logger.error(f"[Email Service] {msg}")
            return False, msg

        from_header = f"{from_name} <{from_email}>" if from_name else from_email

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.resend_api_key.strip()}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": from_header,
                        "to": [to_email.strip()],
                        "subject": subject,
                        "html": html_content,
                    },
                )

                if response.status_code in (200, 201):
                    res_data = response.json()
                    email_id = res_data.get("id", "unknown")
                    logger.info(
                        f"[Email Service] Successfully sent email to {to_email} via Resend: ID={email_id}"
                    )
                    return True, f"Email delivered successfully (ID: {email_id})"
                else:
                    err_body = response.text
                    try:
                        err_json = response.json()
                        err_detail = err_json.get("message") or err_json.get("name") or err_body
                    except Exception:
                        err_detail = err_body
                    msg = f"Resend API error ({response.status_code}): {err_detail}"
                    logger.error(f"[Email Service] {msg}")
                    return False, msg
        except Exception as exc:
            msg = f"Failed to connect to Resend API: {exc}"
            logger.error(f"[Email Service] {msg}")
    # Error if Resend API key is not configured
    msg = "RESEND_API_KEY environment variable is not configured on the backend server. Please add RESEND_API_KEY and RESEND_FROM_EMAIL to your Railway dashboard variables."
    logger.error(f"[Email Service] {msg}")
    return False, msg


