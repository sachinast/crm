"""Status transition graph — TECHNICAL_SPEC.md §3.

This is the single source of truth for which statuses can follow which. Role
gating (who's allowed to set each status, who gets notified, whose visibility
it's relevant to) moved to the DB-backed status_role_permissions table in
migration 0007 — see app/domain/status_permissions.py for those query
helpers, admin-editable at runtime via GET/PATCH /admin/status-permissions.
New statuses are still added here (+ a `status_lookup` seed row), since the
shape of the workflow itself is a code change, not an admin-editable one
(explicitly out of scope for the Master Admin feature — see the plan).
"""
from dataclasses import dataclass, field

from app.models.enums import BookingStatus


@dataclass(frozen=True)
class Transition:
    next: frozenset = field(default_factory=frozenset)


TRANSITIONS: dict[BookingStatus, Transition] = {
    BookingStatus.authorization_pending: Transition(
        next=frozenset({BookingStatus.client_approved}),
    ),
    BookingStatus.client_approved: Transition(
        next=frozenset({BookingStatus.transferred_to_billing}),
    ),
    BookingStatus.transferred_to_billing: Transition(
        next=frozenset({BookingStatus.card_charged, BookingStatus.card_declined}),
    ),
    BookingStatus.card_charged: Transition(
        next=frozenset(
            {
                BookingStatus.tag_change_dep,
                BookingStatus.tag_cr_booking,
                BookingStatus.tag_auditor,
                BookingStatus.tag_refund,
                BookingStatus.tag_rdr,
                BookingStatus.tag_chargeback,
            }
        ),
    ),
    BookingStatus.card_declined: Transition(
        next=frozenset({BookingStatus.transferred_to_billing}),  # retry
    ),
    BookingStatus.tag_change_dep: Transition(
        next=frozenset({BookingStatus.tag_auditor}),
    ),
    BookingStatus.tag_cr_booking: Transition(
        next=frozenset({BookingStatus.tag_auditor}),
    ),
    BookingStatus.tag_auditor: Transition(
        next=frozenset({BookingStatus.qc_done}),
    ),
    BookingStatus.qc_done: Transition(
        next=frozenset(),
    ),
    BookingStatus.tag_refund: Transition(
        next=frozenset(),
    ),
    BookingStatus.tag_rdr: Transition(
        next=frozenset(),
    ),
    BookingStatus.tag_chargeback: Transition(
        next=frozenset(),
    ),
}


def can_transition(current: BookingStatus, target: BookingStatus) -> bool:
    return target in TRANSITIONS[current].next
