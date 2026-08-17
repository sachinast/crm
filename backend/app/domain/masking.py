"""Data masking helpers — TECHNICAL_SPEC.md §8 / §9.1.

Raw PII is never serialized to the client by default. These helpers run on the
way OUT of the service layer; the unmasked value is only returned by the
dedicated `/leads/{id}/reveal` endpoint, which logs the access.
"""


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return "***"
    visible = local[:3]
    return f"{visible}{'*' * max(len(local) - 3, 3)}@{domain}"


def mask_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) <= 4:
        return "*" * len(digits)
    return "*" * (len(digits) - 4) + digits[-4:]


def mask_card(card_last_four: str | None) -> str:
    if not card_last_four:
        return "****-****-****-****"
    return f"****-****-****-{card_last_four[-4:]}"
