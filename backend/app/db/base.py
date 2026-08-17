"""Declarative base + a single import point that registers every model with it.

Alembic's autogenerate needs every model imported somewhere it will see before
`target_metadata` is read (see alembic/env.py) — this module is that place.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import model modules so their tables register on Base.metadata.
from app.models import user, lead, booking, payment, audit, status, integration  # noqa: E402,F401
