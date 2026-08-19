"""Widget key generation for embeddable booking widgets (migration 0014).

Unlike app/domain/api_keys.py's ApiKey secrets, this key is meant to be
visible in plaintext HTML on a public website — anyone can view-source it —
so it's never hashed. It only authorizes lead *submission* to one specific
widget, nothing readable.
"""
import secrets

KEY_PREFIX = "wgt_"


def generate_widget_key() -> str:
    return f"{KEY_PREFIX}{secrets.token_urlsafe(16)}"
