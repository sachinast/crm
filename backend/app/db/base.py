"""Declarative base + a single import point that registers every model with it.

Alembic's autogenerate needs every model imported somewhere it will see before
`target_metadata` is read (see alembic/env.py) — this module is that place.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import model modules so their tables register on Base.metadata.
from app.models import rbac, user, lead, booking, payment, audit, status, integration, messaging, activity, settings, custom_fields, master_options, attendance, files, notes  # noqa: E402,F401
