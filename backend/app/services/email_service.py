"""Email notification & customer authorization dispatch service.
Implements responsive HTML templates matching Word documents & client screenshots:
- Car_Rental_Payment_Authorization_Confirmation.docx
- CAR RENTAL MODIFICATION PAYMENT AUTHORIZATION.docx
- Car_Rental_Cancellation_Authorization_Template.docx
"""
import logging
import os
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def mask_card_number(raw_num: str | None) -> str:
    if not raw_num:
        return "•••• •••• •••• ••••"
    digits = "".join(filter(str.isdigit, raw_num))
    if len(digits) >= 4:
        return f"**** **** **** {digits[-4:]}"
    return "**** **** **** ****"


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
    card_type: str = "Credit Card",
    card_number: str = "",
    card_holder_name: str = "",
    prepaid_amount: float = 0.0,
    pay_at_counter_amount: float = 0.0,
    total_amount: float = 0.0,
    service_type: str = "car",
    agent_name: str = "Customer Support",
    support_phone: str = "+1 (877) 362-2838",
    support_email: str = "sales@ebookingdesk.com",
    template_type: str = "new_booking",  # "new_booking" | "modification" | "cancellation"
) -> str:
    """Generates email matching Screenshots 2 & 3 and Word template."""
    settings = get_settings()
    masked_card = mask_card_number(card_number)
    holder = card_holder_name or customer_name
    auth_url = f"{settings.frontend_url.rstrip('/')}/authorize/{lead_id}"
    current_time_str = datetime.now(timezone.utc).strftime("%d-%m-%Y %H:%M:%S")
    charge_display = f"USD {total_amount:.2f}" if total_amount > 0 else f"USD {prepaid_amount:.2f}"

    title_header = "Car Booking Information"
    if template_type == "modification":
        title_header = "Car Rental Modification Payment Authorization"
    elif template_type == "cancellation":
        title_header = "Car Rental Cancellation Authorization"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title_header}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }}
    .container {{ max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
    .header-bar {{ background: #0f4c81; color: #ffffff; padding: 16px 24px; display: table; width: 100%; box-sizing: border-box; }}
    .header-title {{ font-size: 18px; font-weight: bold; text-align: left; vertical-align: middle; display: table-cell; }}
    .header-brand {{ font-size: 18px; font-weight: bold; color: #f59e0b; text-align: right; vertical-align: middle; display: table-cell; }}
    .content {{ padding: 24px; }}
    .intro {{ font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 20px; }}
    .status-badge {{ background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }}
    .section-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #cbd5e1; }}
    .section-table th {{ background: #f8fafc; color: #0f4c81; font-size: 13px; font-weight: bold; text-align: left; padding: 10px 14px; border-bottom: 2px solid #cbd5e1; }}
    .section-table td {{ padding: 9px 14px; font-size: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }}
    .section-table tr td:first-child {{ width: 40%; font-weight: 600; color: #475569; }}
    .legal-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; font-size: 12px; line-height: 1.5; color: #475569; margin-bottom: 20px; }}
    .policy-box {{ background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; font-size: 11.5px; line-height: 1.6; color: #334155; margin-bottom: 20px; }}
    .policy-box h4 {{ margin: 0 0 8px 0; font-size: 13px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }}
    .cta-container {{ text-align: center; margin: 30px 0; }}
    .cta-button {{ background: #ea580c; color: #ffffff !important; padding: 14px 44px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block; box-shadow: 0 2px 6px rgba(234, 88, 12, 0.3); text-transform: uppercase; }}
    .footer {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <div class="header-title">{title_header}</div>
      <div class="header-brand">E-Booking Desk</div>
    </div>

    <div class="content">
      <div class="intro">
        We would like you to go through your itinerary carefully. Please click on <strong>'Acknowledge'</strong> only when you have checked all the information and you are completely satisfied with the itinerary and price. As per our conversation and as agreed, we are Booking your itinerary as follows:
      </div>

      <div class="status-badge">
        &#10004; Booking Processed — Awaiting Electronic Authorization
      </div>

      <!-- Booking Info Table -->
      <table class="section-table">
        <thead>
          <tr><th colspan="2">Booking Info</th></tr>
        </thead>
        <tbody>
          <tr><td>Our Booking Ref. No</td><td><strong>{booking_reference or 'EC' + lead_id[:6].upper()}</strong></td></tr>
          <tr><td>Agency Ref. No</td><td>{agency_reference}</td></tr>
          <tr><td>Booking Platform</td><td>{booking_platform}</td></tr>
          <tr><td>Car Provider</td><td>{car_provider}</td></tr>
        </tbody>
      </table>

      <!-- Renter Details Table -->
      <table class="section-table">
        <thead>
          <tr><th colspan="2">Renter Details</th></tr>
        </thead>
        <tbody>
          <tr><td>Name</td><td>{customer_name}</td></tr>
          <tr><td>Date of Birth</td><td>{customer_dob or '—'}</td></tr>
          <tr><td>Email</td><td>{customer_email}</td></tr>
          <tr><td>Phone</td><td>{customer_phone or '—'}</td></tr>
        </tbody>
      </table>

      <!-- Card & Charges Table -->
      <table class="section-table">
        <thead>
          <tr><th colspan="2">Payment &amp; Card Details</th></tr>
        </thead>
        <tbody>
          <tr><td>Card Type</td><td>{card_type or 'Credit Card'}</td></tr>
          <tr><td>Card Number</td><td><span style="font-family: monospace;">{masked_card}</span></td></tr>
          <tr><td>Card Holder Name</td><td>{holder}</td></tr>
          <tr><td>Prepaid Amount</td><td>USD {prepaid_amount:.2f}</td></tr>
          <tr><td>Pay at Counter Amount</td><td>USD {pay_at_counter_amount:.2f}</td></tr>
          <tr><td>Total Charged Amount</td><td><strong style="color: #0f4c81; font-size: 13px;">{charge_display}</strong></td></tr>
        </tbody>
      </table>

      <!-- Legal Authorization Statement -->
      <div class="legal-box">
        This is to confirm that, in keeping with all applicable laws, I/We <strong>{holder}</strong> are instructing <strong>E-Booking Desk</strong>, to book the Car mentioned against the following credit card. It is expressly understood that the amount charged will be <strong>({charge_display})</strong> inclusive of all taxes and fees. However, it may be charged in split payments, not exceeding the total amount mentioned above. I/We further represent that, the Credit Card Type, ({card_type}) card ending with <strong>{masked_card[-4:]}</strong> has been provided by me/us to authorize this transaction. It is also understood and accepted that to provide additional security of my/our personal information, E-Booking Desk may verify Credit Card information and billing address. It is further understood and agreed that I/We <strong>{holder}</strong> accept full responsibility for the amount due to <strong>E-Booking Desk</strong> and the Terms &amp; Conditions of cancellation or refund as mentioned.
      </div>

      <!-- Important Rental Info -->
      <div class="policy-box">
        <h4>Important Rental Information</h4>
        <ul style="margin: 0; padding-left: 18px;">
          <li>Your credit card may be billed in multiple charges, not exceeding the total amount.</li>
          <li>Additional fees may apply if changes are made to your return date, time, and/or location.</li>
          <li>Lead driver must carry a valid original driving license card at the time of vehicle pickup.</li>
          <li><strong>Please note that the prepaid amount is non-refundable.</strong></li>
          <li>Ensure all travel documents (such as visas) required for your destination or transit countries are valid.</li>
        </ul>
      </div>

      <!-- Debit Card Policy -->
      <div class="policy-box">
        <h4>Debit Card Policy</h4>
        <ol style="margin: 0; padding-left: 18px;">
          <li>Your address must be within a 50-mile radius of the rental location.</li>
          <li>You may be required to present a utility bill at the time of pickup.</li>
          <li>A soft credit check may be conducted at the time of pickup.</li>
          <li>In some cases, a higher security deposit may be required.</li>
          <li>For airport pickups, a round-trip ticket is mandatory.</li>
        </ol>
      </div>

      <!-- CTA Button -->
      <div class="cta-container">
        <a href="{auth_url}" target="_blank" class="cta-button">Acknowledge &amp; Authorize</a>
        <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Clicking the button will open a secure authorization page to record your confirmation.</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>Need Help?</strong> {agent_name} | 24/7 Customer Support: <strong>{support_phone}</strong></p>
      <p style="margin: 0 0 6px 0;"><a href="mailto:{support_email}" style="color: #0f4c81;">{support_email}</a></p>
      <p style="margin: 0;">Thank you for choosing E-Booking Desk. &copy; {datetime.now().year} E-Booking Desk. All rights reserved. <em>This is an automated email.</em></p>
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
    now_utc = datetime.now(timezone.utc)
    date_str = now_utc.strftime("%d-%b-%Y")
    time_str = now_utc.strftime("%H:%M:%S UTC")

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Authorization Confirmed</title>
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
      <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">E-Booking Desk</p>
    </div>
    <div class="content">
      <div class="badge">
        &#10004; Payment Authorization Successfully Recorded — Reference: {booking_reference or lead_id[:8].upper()}
      </div>
      <p style="font-size: 13px; line-height: 1.6; margin-top: 16px;">
        Dear <strong>{customer_name}</strong>,<br>
        Thank you for confirming your authorization for your car rental reservation with <strong>E-Booking Desk</strong>. This email confirms that your authorization was successfully recorded for the reservation and payment described below.
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
        Important: You have authorized E-Booking Desk to charge USD {prepaid_amount:.2f} for the prepaid portion of your reservation. The USD {pay_at_counter_amount:.2f} balance is payable directly to the rental company at vehicle pickup.
      </p>
    </div>
  </div>
</body>
</html>"""


async def send_customer_email(
    to_email: str,
    subject: str,
    html_content: str,
) -> bool:
    """Dispatches email via SMTP if configured, or logs the action."""
    if not to_email:
        logger.warning("send_customer_email: No recipient email provided.")
        return False

    settings = get_settings()
    if not settings.smtp_host or not settings.smtp_user:
        logger.info(
            f"[EMAIL SIMULATION] SMTP not configured. Simulated sending email to '{to_email}' with subject '{subject}'."
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        msg["To"] = to_email

        part = MIMEText(html_content, "html", "utf-8")
        msg.attach(part)

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            if settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, [to_email], msg.as_string())

        logger.info(f"Successfully sent email to {to_email}: {subject}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send email to {to_email}: {exc}")
        return False
