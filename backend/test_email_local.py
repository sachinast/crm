import asyncio
import os
import sys
from app.services.email_service import (
    generate_authorization_email_html,
    generate_confirmation_email_html,
    send_customer_email,
)


async def main():
    recipient_email = sys.argv[1] if len(sys.argv) > 1 else "delivered@resend.dev"

    print("==================================================")
    print("      TESTING EMAIL SERVICE VIA RESEND API        ")
    print("==================================================")
    print(f"Target recipient: {recipient_email}")

    # 1. Test Authorization Email Generation
    print("\n1. Generating Customer Authorization Email Template...")
    auth_html = generate_authorization_email_html(
        lead_id="3fa85f64-5717-4562-b3fc-2c963f66afa6",
        customer_name="John Doe",
        customer_email=recipient_email,
        customer_phone="+1 (555) 234-5678",
        customer_dob="15-Aug-1990",
        booking_reference="EC23345",
        agency_reference="done",
        booking_platform="Direct Portal",
        car_provider="Hertz Car Rental",
        card_type="Visa",
        card_number="4111111111119899",
        card_holder_name="John Doe",
        prepaid_amount=150.00,
        pay_at_counter_amount=45.00,
        total_amount=195.00,
        service_type="car",
        agent_name="Sumit",
        template_type="new_booking",
    )
    print(f"   [SUCCESS] Authorization HTML generated ({len(auth_html)} chars).")

    # 2. Test Confirmation Email Generation
    print("\n2. Generating Payment Authorization Confirmed Email...")
    conf_html = generate_confirmation_email_html(
        lead_id="3fa85f64-5717-4562-b3fc-2c963f66afa6",
        customer_name="John Doe",
        customer_email=recipient_email,
        booking_reference="EC23345",
        car_provider="Hertz Car Rental",
        booking_platform="Direct Portal",
        prepaid_amount=150.00,
        pay_at_counter_amount=45.00,
        total_amount=195.00,
        client_ip="127.0.0.1",
        user_agent="Mozilla/5.0 Chrome/120.0",
    )
    print(f"   [SUCCESS] Confirmation HTML generated ({len(conf_html)} chars).")

    # 3. Test Email Dispatching
    print(f"\n3. Dispatching Live Test Email to: {recipient_email}...")
    result = await send_customer_email(
        to_email=recipient_email,
        subject="Car Booking Authorisation: EC23345",
        html_content=auth_html,
    )
    if result:
        print(f"   [SUCCESS] Email successfully delivered via Resend API!")
    else:
        print(f"   [FAILED] Email dispatch failed. Check terminal logs.")

    # 4. Save Preview HTML
    preview_path = os.path.join(os.path.dirname(__file__), "test_auth_email_preview.html")
    with open(preview_path, "w", encoding="utf-8") as f:
        f.write(auth_html)
    print(f"\n4. Exported HTML email preview to:\n   {preview_path}")
    print("\n==================================================")
    print("           EMAIL DISPATCH TEST COMPLETED          ")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(main())

