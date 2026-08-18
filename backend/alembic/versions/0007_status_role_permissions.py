"""Status-machine role permissions — replaces app/domain/status_machine.py's
hardcoded TRANSITIONS role-gating (set_by/notifies) and the separate
ROLE_RELEVANT_STATUSES dict with a single data-driven `status_role_permissions`
join table, so an admin can wire a role (including a brand-new custom one)
into the booking status workflow at runtime — no deploy.

One table, three `kind`s, instead of three separate hardcoded structures:
  - 'set_by'   — which roles may transition a lead TO this status
  - 'notifies' — which roles get a one-time notification on that transition
  - 'relevant' — which roles keep seeing a lead for as long as it SITS at
                 this status (PRD §3.2 "Status-Based Sharing" — was the
                 ROLE_RELEVANT_STATUSES dict; deliberately a separate `kind`
                 from 'notifies', not derived from it — see that dict's old
                 docstring for why the two differ)

Zero-behavior-change seed, reverse-engineered 1:1 from TRANSITIONS/
ROLE_RELEVANT_STATUSES as they stood right before this migration, with one
deliberate expansion: TRANSITIONS' `ANY_AUTHORIZED` sentinel ("any role
except agent") is expanded here into concrete rows for the 10 existing
roles, rather than carried forward as a Python-side special case. That keeps
the admin UI honest — a newly created custom role starts wired into NONE of
these transitions, exactly like it starts with none of the roles/permissions
table's permissions, until an admin explicitly grants it one.

The TRANSITIONS dict itself (the transition *graph* — which status can move
to which) is unchanged and stays in status_machine.py; only the role-gating
around it moves to this table.

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-19
"""
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None

# The 10 existing role names, unchanged (see migration 0006).
ALL_ROLES = [
    "super_admin",
    "admin",
    "agent",
    "billing",
    "tl",
    "auditor",
    "cs",
    "change_dep",
    "chargeback_dep",
    "cr_booking",
]
ANY_AUTHORIZED = [r for r in ALL_ROLES if r != "agent"]

# status -> role names allowed to SET it. authorization_pending (system-set)
# and client_approved (customer-set via the public /authorization endpoint,
# TECHNICAL_SPEC.md §8) intentionally have no rows here — no staff role has
# ever been allowed to set either through the staff-facing status endpoints,
# and an empty allow-list reproduces that exactly.
SET_BY: dict[str, list[str]] = {
    "authorization_pending": [],
    "client_approved": [],
    "transferred_to_billing": ["agent", "super_admin", "admin"],
    "card_charged": ["billing"],
    "card_declined": ["billing"],
    "tag_change_dep": ANY_AUTHORIZED,
    "tag_cr_booking": ANY_AUTHORIZED,
    "tag_auditor": ANY_AUTHORIZED,
    "qc_done": ["auditor"],
    "tag_refund": ["billing"],
    "tag_rdr": ["billing"],
    "tag_chargeback": ["billing"],
}

# status -> role names notified once, on transition into it.
NOTIFIES: dict[str, list[str]] = {
    "authorization_pending": [],
    "client_approved": ["admin"],
    "transferred_to_billing": ["billing"],
    "card_charged": ["agent"],
    "card_declined": ["agent"],
    "tag_change_dep": ["change_dep"],
    "tag_cr_booking": ["cr_booking"],
    "tag_auditor": ["auditor", "admin"],
    "qc_done": ["agent", "admin"],
    "tag_refund": ["billing"],
    "tag_rdr": ["billing", "chargeback_dep"],
    "tag_chargeback": ["billing", "chargeback_dep"],
}

# status -> role names that keep seeing a lead parked at this status
# (old ROLE_RELEVANT_STATUSES, inverted from role->statuses to status->roles).
RELEVANT: dict[str, list[str]] = {
    "authorization_pending": [],
    "client_approved": [],
    "transferred_to_billing": ["billing"],
    "card_charged": ["billing"],
    "card_declined": ["billing"],
    "tag_change_dep": ["change_dep"],
    "tag_cr_booking": ["cr_booking"],
    "tag_auditor": ["auditor"],
    "qc_done": ["auditor"],
    "tag_refund": ["billing"],
    "tag_rdr": ["billing", "chargeback_dep"],
    "tag_chargeback": ["billing", "chargeback_dep"],
}


def _q(value: str) -> str:
    """Minimal SQL string literal quoting for this migration's static, trusted
    seed data (no user input reaches this function)."""
    return "'" + value.replace("'", "''") + "'"


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE status_role_permissions (
          status   booking_status NOT NULL REFERENCES status_lookup(status) ON DELETE CASCADE,
          role_id  UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
          kind     TEXT NOT NULL CHECK (kind IN ('set_by', 'notifies', 'relevant')),
          PRIMARY KEY (status, role_id, kind)
        )
        """
    )
    op.execute("CREATE INDEX ix_status_role_permissions_role_kind ON status_role_permissions(role_id, kind)")

    for kind, mapping in (("set_by", SET_BY), ("notifies", NOTIFIES), ("relevant", RELEVANT)):
        for status_value, role_names in mapping.items():
            for role_name in role_names:
                op.execute(
                    f"""
                    INSERT INTO status_role_permissions (status, role_id, kind)
                    SELECT {_q(status_value)}::booking_status, r.id, {_q(kind)}
                    FROM roles r WHERE r.name = {_q(role_name)}
                    """
                )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS status_role_permissions")
