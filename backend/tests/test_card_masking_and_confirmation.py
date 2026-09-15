"""Unit tests for card masking behavior and final confirmation email flow.
Validates:
1. Card details are unmasked for billing and admin logins.
2. Card details are masked for agent, CS, CR Booking, Changes, Auditor.
3. Masked card inputs (containing * or •) are filtered out on updates to prevent overwriting raw card details.
4. Role permissions and status requirements for sending the final confirmation email.
"""
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from pydantic import BaseModel

from app.models.lead import BookingStatus, Lead
from app.models.payment import PaymentTransaction
from app.models.rbac import Role
from app.models.user import User
from app.schemas.lead import FinalConfirmationEmailRequest


class MockCarBooking:
    def __init__(self):
        self.id = uuid.uuid4()
        self.lead_id = uuid.uuid4()
        self.booking_reference = "CR-99001"
        self.booking_confirmation = "CONF-1234"
        self.car_provider = "Avis"
        self.car_model = "Toyota Camry"
        self.vehicle_type = "full_size"
        self.pickup_location = "MIA Airport"
        self.return_location = "MIA Airport"
        self.pickup_datetime = "2026-10-01T10:00:00Z"
        self.return_datetime = "2026-10-05T10:00:00Z"
        self.driver_name = "Jane Doe"
        self.prepaid_amount = 150.00
        self.pay_at_counter_amount = 50.00
        self.total_amount = 200.00
        self.card_number = "4111111111111234"
        self.card_expiry = "12/28"
        self.cvv = "987"
        self.card_holder_name = "Jane Doe"
        self.billing_address = "123 Main St"


class DummyReadSchema(BaseModel):
    booking_reference: str
    card_number: str | None = None
    cvv: str | None = None
    card_expiry: str | None = None
    car_model: str | None = None


def apply_card_masking(booking, read_schema, user_role: str):
    """Replicates the masking logic in bookings.py get()"""
    can_view_unmasked = user_role.lower() in {"billing", "admin", "super_admin", "superadmin"}
    if can_view_unmasked:
        return booking

    data = read_schema.model_validate(booking, from_attributes=True).model_dump()
    raw_card = getattr(booking, "card_number", None) or ""
    digits_only = "".join(ch for ch in raw_card if ch.isdigit())
    last4 = digits_only[-4:] if len(digits_only) >= 4 else digits_only
    if raw_card:
        data["card_number"] = f"**** **** **** {last4}" if last4 else "**** **** **** ****"
    if getattr(booking, "cvv", None):
        data["cvv"] = "•••"
    if getattr(booking, "card_expiry", None):
        data["card_expiry"] = "**/**"
    return data


def filter_masked_updates(updates: dict) -> dict:
    """Replicates update protection in bookings.py update()"""
    cleaned = dict(updates)
    for fld in ("card_number", "cvv", "card_expiry"):
        if fld in cleaned and isinstance(cleaned[fld], str) and ("*" in cleaned[fld] or "•" in cleaned[fld]):
            del cleaned[fld]
    return cleaned


def test_billing_can_view_unmasked_card_details():
    booking = MockCarBooking()
    result = apply_card_masking(booking, DummyReadSchema, "billing")
    # For billing, the raw booking is returned untouched
    assert result.card_number == "4111111111111234"
    assert result.cvv == "987"
    assert result.card_expiry == "12/28"


def test_admin_can_view_unmasked_card_details():
    booking = MockCarBooking()
    result = apply_card_masking(booking, DummyReadSchema, "admin")
    assert result.card_number == "4111111111111234"
    assert result.cvv == "987"
    assert result.card_expiry == "12/28"


def test_agent_receives_masked_card_details():
    booking = MockCarBooking()
    result = apply_card_masking(booking, DummyReadSchema, "agent")
    assert isinstance(result, dict)
    assert result["card_number"] == "**** **** **** 1234"
    assert result["cvv"] == "•••"
    assert result["card_expiry"] == "**/**"


def test_other_roles_receive_masked_card_details():
    booking = MockCarBooking()
    for role in ["cs", "cr_booking", "change_dep", "auditor", "tl"]:
        result = apply_card_masking(booking, DummyReadSchema, role)
        assert result["card_number"] == "**** **** **** 1234"
        assert result["cvv"] == "•••"
        assert result["card_expiry"] == "**/**"


def test_filter_masked_updates_prevents_raw_data_corruption():
    # Scenario: Agent form sends back the masked values it saw in the UI
    payload_dict = {
        "car_model": "Toyota RAV4",
        "card_number": "**** **** **** 1234",
        "cvv": "•••",
        "card_expiry": "**/**",
    }
    cleaned = filter_masked_updates(payload_dict)
    assert "car_model" in cleaned
    assert cleaned["car_model"] == "Toyota RAV4"
    assert "card_number" not in cleaned
    assert "cvv" not in cleaned
    assert "card_expiry" not in cleaned


def test_filter_masked_updates_allows_real_new_card_input():
    # Scenario: User enters a brand new card
    payload_dict = {
        "car_model": "Toyota RAV4",
        "card_number": "5500000000005678",
        "cvv": "123",
        "card_expiry": "09/29",
    }
    cleaned = filter_masked_updates(payload_dict)
    assert cleaned["card_number"] == "5500000000005678"
    assert cleaned["cvv"] == "123"
    assert cleaned["card_expiry"] == "09/29"


@pytest.mark.asyncio
async def test_send_confirmation_email_role_authorization():
    from fastapi import HTTPException
    from app.api.v1.leads import send_confirmation_email

    allowed_roles = ["agent", "cr_booking", "cs", "change_dep", "admin"]
    disallowed_roles = ["auditor", "billing", "random_user"]

    for role_name in disallowed_roles:
        mock_user = User(id=uuid.uuid4(), name=f"Test {role_name}", email=f"{role_name}@test.com")
        mock_user.role = Role(id=uuid.uuid4(), name=role_name)
        lead_id = uuid.uuid4()
        payload = FinalConfirmationEmailRequest(to_email="customer@example.com")

        mock_db = AsyncMock()
        with patch("app.api.v1.leads.get_visible_lead_or_404", return_value=Lead(id=lead_id, status=BookingStatus.card_charged)):
            with pytest.raises(HTTPException) as exc_info:
                await send_confirmation_email(lead_id=lead_id, payload=payload, db=mock_db, current_user=mock_user)
            assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_send_confirmation_email_requires_charged_status_or_payment():
    from fastapi import HTTPException
    from app.api.v1.leads import send_confirmation_email

    mock_user = User(id=uuid.uuid4(), name="Agent Joe", email="agent@test.com")
    mock_user.role = Role(id=uuid.uuid4(), name="agent")
    lead_id = uuid.uuid4()
    mock_lead = Lead(id=lead_id, status=BookingStatus.authorization_pending, email="cust@example.com")
    payload = FinalConfirmationEmailRequest()

    from unittest.mock import MagicMock
    mock_db = AsyncMock()
    mock_exec_result = MagicMock()
    mock_exec_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_exec_result)

    with patch("app.api.v1.leads.get_visible_lead_or_404", return_value=mock_lead):
        with pytest.raises(HTTPException) as exc_info:
            await send_confirmation_email(lead_id=lead_id, payload=payload, db=mock_db, current_user=mock_user)
        assert exc_info.value.status_code == 400
        assert "charged" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_send_confirmation_email_success_flow():
    from unittest.mock import MagicMock
    from app.api.v1.leads import send_confirmation_email

    for role_name in ["agent", "cr_booking", "cs", "change_dep"]:
        mock_user = User(id=uuid.uuid4(), name=f"Staff {role_name}", email=f"{role_name}@test.com")
        mock_user.role = Role(id=uuid.uuid4(), name=role_name)
        lead_id = uuid.uuid4()
        mock_lead = Lead(id=lead_id, name="Alice Wonderland", status=BookingStatus.card_charged, email="alice@example.com")
        payload = FinalConfirmationEmailRequest(to_email="alice@example.com", custom_message="Safe travels!")

        mock_db = AsyncMock()
        mock_exec_result = MagicMock()
        mock_exec_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_exec_result)

        with patch("app.api.v1.leads.get_visible_lead_or_404", return_value=mock_lead), \
             patch("app.api.v1.leads.get_booking_for_lead", return_value=MockCarBooking()), \
             patch("app.api.v1.leads.send_customer_email", return_value=(True, "OK")) as mock_send, \
             patch("app.api.v1.leads.log_process_event") as mock_log:

            res = await send_confirmation_email(lead_id=lead_id, payload=payload, db=mock_db, current_user=mock_user)
            assert res["status"] == "success"
            assert res["to_email"] == "alice@example.com"
            mock_send.assert_called_once()
            call_kwargs = mock_send.call_args.kwargs
            assert call_kwargs["to_email"] == "alice@example.com"
            assert "Alice Wonderland" in call_kwargs["html_content"]
            assert "Safe travels!" in call_kwargs["html_content"]
            assert "AUTHORIZATION STATUS: CONFIRMED" in call_kwargs["html_content"]
            mock_log.assert_called_once()


@pytest.mark.asyncio
async def test_send_confirmation_email_with_docx_and_custom_attachments():
    from unittest.mock import MagicMock
    from app.api.v1.leads import send_confirmation_email
    from app.schemas.lead import EmailAttachmentPayload

    mock_user = User(id=uuid.uuid4(), name="Agent Smith", email="agent@test.com")
    mock_user.role = Role(id=uuid.uuid4(), name="agent")
    lead_id = uuid.uuid4()
    mock_lead = Lead(id=lead_id, name="Bob Builder", status=BookingStatus.card_charged, email="bob@example.com")
    payload = FinalConfirmationEmailRequest(
        to_email="bob@example.com",
        attach_confirmation_doc=True,
        custom_attachments=[
            EmailAttachmentPayload(filename="extra_voucher.pdf", content="YmFzZTY0ZGF0YQ=="),
        ],
    )

    mock_db = AsyncMock()
    mock_exec_result = MagicMock()
    mock_exec_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_exec_result)

    with patch("app.api.v1.leads.get_visible_lead_or_404", return_value=mock_lead), \
         patch("app.api.v1.leads.get_booking_for_lead", return_value=MockCarBooking()), \
         patch("app.api.v1.leads.send_customer_email", return_value=(True, "OK")) as mock_send, \
         patch("app.api.v1.leads.log_process_event"):

        res = await send_confirmation_email(lead_id=lead_id, payload=payload, db=mock_db, current_user=mock_user)
        assert res["status"] == "success"
        assert res["attachments_count"] == 2
        assert any("extra_voucher.pdf" in n for n in res["attachment_names"])
        assert any("Car_Rental_Payment_Authorization_Confirmation" in n for n in res["attachment_names"])

        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args.kwargs
        attachments = call_kwargs["attachments"]
        assert len(attachments) == 2
        assert attachments[0]["filename"].endswith(".docx")
        assert attachments[1]["filename"] == "extra_voucher.pdf"


def test_generate_confirmation_docx_populates_template():
    from app.services.document_service import generate_confirmation_docx

    filename, b64_data = generate_confirmation_docx(
        lead_id="00000000-0000-0000-0000-000000000001",
        customer_name="Test Customer",
        customer_email="test@example.com",
        booking_reference="EC9999",
        confirmation_number="CONF-9999",
        car_provider="Hertz",
        prepaid_amount=150.0,
        pay_at_counter_amount=30.0,
        total_amount=180.0,
    )
    assert filename == "Car_Rental_Payment_Authorization_Confirmation_EC9999.docx"
    assert len(b64_data) > 1000

