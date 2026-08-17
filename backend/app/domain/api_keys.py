"""API key generation/hashing for external integrations (Zapier, Make, or any
other API/form that can POST JSON with a header) — TECHNICAL_SPEC.md §10.3.

Uses SHA-256, not the bcrypt used for user passwords (app/core/security.py).
That distinction is deliberate: bcrypt's deliberate slowness defends against
brute-forcing a low-entropy human-chosen password; an API key here is a
32-byte cryptographically random token — brute-forcing it is already
infeasible, so a fast, exact-match hash is the right tool, not the wrong one.
"""
import hashlib
import secrets

KEY_PREFIX = "crm_live_"
# Shown in the UI to identify a key without ever re-displaying the secret —
# long enough to distinguish keys at a glance, short enough to reveal nothing.
DISPLAY_PREFIX_LENGTH = len(KEY_PREFIX) + 8


def generate_api_key() -> tuple[str, str, str]:
    """Returns (full_key, display_prefix, key_hash). full_key is returned to
    the caller exactly once — only the hash is ever persisted."""
    full_key = f"{KEY_PREFIX}{secrets.token_urlsafe(32)}"
    return full_key, full_key[:DISPLAY_PREFIX_LENGTH], hash_api_key(full_key)


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()
