import pytest
from app.services.email_service import (
    generate_authorization_email_html,
    generate_confirmation_email_html,
    mask_card_number,
    send_customer_email,
)
from app.api.v1.authorization import _safe_float
from app.domain.process_log import _normalize_json_value


def test_mask_card_number():
    assert mask_card_number("4111111111111234") == "**** **** **** 1234"
    assert mask_card_number(None) == "•••• •••• •••• ••••"
    assert mask_card_number("") == "•••• •••• •••• ••••"
    assert mask_card_number("123") == "**** **** **** ****"


def test_safe_float_helper():
    assert _safe_float(None) == 0.0
    assert _safe_float("") == 0.0
    assert _safe_float("150.50") == 150.50
    assert _safe_float(100) == 100.0
    assert _safe_float(0) == 0.0
    assert _safe_float("invalid") == 0.0


def test_normalize_json_value():
    assert _normalize_json_value(None) is None
    assert _normalize_json_value({"key": "val"}) == {"key": "val"}
    assert _normalize_json_value(["item1", "item2"]) == ["item1", "item2"]
    assert _normalize_json_value("status_string") == {"value": "status_string"}
    assert _normalize_json_value(123) == {"value": "123"}


def test_generate_authorization_email_html():
    html = generate_authorization_email_html(
        lead_id="7fcd2a07-ac81-416d-91cc-8de1490f3272",
        customer_name="Alice Smith",
        customer_email="alice@example.com",
        customer_phone="+1234567890",
        booking_reference="EC12345",
        prepaid_amount=250.0,
        pay_at_counter_amount=50.0,
        total_amount=300.0,
        service_type="car",
    )
    assert "Alice Smith" in html
    assert "alice@example.com" in html
    assert "EC12345" in html
    assert "USD 300.00" in html or "USD 250.00" in html
    assert "/authorize/7fcd2a07-ac81-416d-91cc-8de1490f3272" in html


def test_generate_confirmation_email_html():
    html = generate_confirmation_email_html(
        lead_id="7fcd2a07-ac81-416d-91cc-8de1490f3272",
        customer_name="Alice Smith",
        customer_email="alice@example.com",
        booking_reference="EC12345",
        prepaid_amount=250.0,
        pay_at_counter_amount=50.0,
        total_amount=300.0,
    )
    assert "Alice Smith" in html
    assert "alice@example.com" in html
    assert "Payment Authorization Confirmed" in html
    assert "USD 250.00" in html


@pytest.mark.asyncio
async def test_send_customer_email_empty_recipient():
    success, msg = await send_customer_email("", "Test Subject", "<html>Test</html>")
    assert success is False
    assert "missing" in msg.lower()


@pytest.mark.asyncio
async def test_send_customer_email_simulation_mode(monkeypatch):
    from app.core import config

    settings = config.Settings(resend_api_key="", resend_from_email="")
    monkeypatch.setattr(config, "get_settings", lambda: settings)

    success, msg = await send_customer_email("test@example.com", "Test Subject", "<html>Test</html>")
    assert success is True
    assert "Simulation mode" in msg
