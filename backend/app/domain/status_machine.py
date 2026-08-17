"""Status state machine — TECHNICAL_SPEC.md §3.

This is the single source of truth for: which statuses can follow which,
who is allowed to set each status, and who gets notified on each transition.
New statuses/roles are added here (+ a `status_lookup` seed row), not by
scattering `if/elif` checks across endpoints.
"""
from dataclasses import dataclass, field

from app.models.enums import BookingStatus, UserRole

ANY_AUTHORIZED = "any_authorized"  # any role except "agent" and "customer"
SYSTEM = "system"
CUSTOMER = "customer"


@dataclass(frozen=True)
class Transition:
    set_by: frozenset  # UserRole values, or SYSTEM / CUSTOMER / ANY_AUTHORIZED
    notifies: frozenset  # UserRole values
    next: frozenset = field(default_factory=frozenset)


TRANSITIONS: dict[BookingStatus, Transition] = {
    BookingStatus.authorization_pending: Transition(
        set_by=frozenset({SYSTEM}),
        notifies=frozenset(),
        next=frozenset({BookingStatus.client_approved}),
    ),
    BookingStatus.client_approved: Transition(
        set_by=frozenset({CUSTOMER}),
        notifies=frozenset({UserRole.admin}),
        next=frozenset({BookingStatus.transferred_to_billing}),
    ),
    BookingStatus.transferred_to_billing: Transition(
        set_by=frozenset({UserRole.agent, UserRole.super_admin, UserRole.admin}),
        notifies=frozenset({UserRole.billing}),
        next=frozenset({BookingStatus.card_charged, BookingStatus.card_declined}),
    ),
    BookingStatus.card_charged: Transition(
        set_by=frozenset({UserRole.billing}),
        notifies=frozenset({UserRole.agent}),
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
        set_by=frozenset({UserRole.billing}),
        notifies=frozenset({UserRole.agent}),
        next=frozenset({BookingStatus.transferred_to_billing}),  # retry
    ),
    BookingStatus.tag_change_dep: Transition(
        set_by=frozenset({ANY_AUTHORIZED}),
        notifies=frozenset({UserRole.change_dep}),
        next=frozenset({BookingStatus.tag_auditor}),
    ),
    BookingStatus.tag_cr_booking: Transition(
        set_by=frozenset({ANY_AUTHORIZED}),
        notifies=frozenset({UserRole.cr_booking}),
        next=frozenset({BookingStatus.tag_auditor}),
    ),
    BookingStatus.tag_auditor: Transition(
        set_by=frozenset({ANY_AUTHORIZED}),
        notifies=frozenset({UserRole.auditor, UserRole.admin}),
        next=frozenset({BookingStatus.qc_done}),
    ),
    BookingStatus.qc_done: Transition(
        set_by=frozenset({UserRole.auditor}),
        notifies=frozenset({UserRole.agent, UserRole.admin}),
        next=frozenset(),
    ),
    BookingStatus.tag_refund: Transition(
        set_by=frozenset({UserRole.billing}),
        notifies=frozenset({UserRole.billing}),
        next=frozenset(),
    ),
    BookingStatus.tag_rdr: Transition(
        set_by=frozenset({UserRole.billing}),
        notifies=frozenset({UserRole.billing, UserRole.chargeback_dep}),
        next=frozenset(),
    ),
    BookingStatus.tag_chargeback: Transition(
        set_by=frozenset({UserRole.billing}),
        notifies=frozenset({UserRole.billing, UserRole.chargeback_dep}),
        next=frozenset(),
    ),
}

# Roles treated as "any authorized role" (everyone except Agent, per PRD §3.1 — Agents create/own
# leads but the tagging actions belong to downstream departments). Confirm final list with the
# client per TECHNICAL_SPEC.md §11 "Open Items".
ANY_AUTHORIZED_ROLES = frozenset(UserRole) - {UserRole.agent}

# PRD §3.2 "Status-Based Sharing": visibility expands to a department the moment
# a lead's status becomes relevant to it. This is deliberately hand-written
# rather than derived from TRANSITIONS[...].notifies — notification fires once,
# on the transition into a status, but a department needs to keep *seeing* the
# lead for the whole stretch of statuses that belong to its stage (e.g. Billing
# should still see a lead sitting at 'card_charged', even though that status's
# notifies set is {agent}, not {billing}). Used by app/api/deps.py:apply_lead_visibility.
ROLE_RELEVANT_STATUSES: dict[UserRole, frozenset[BookingStatus]] = {
    UserRole.billing: frozenset(
        {
            BookingStatus.transferred_to_billing,
            BookingStatus.card_charged,
            BookingStatus.card_declined,
            BookingStatus.tag_refund,
            BookingStatus.tag_rdr,
            BookingStatus.tag_chargeback,
        }
    ),
    UserRole.change_dep: frozenset({BookingStatus.tag_change_dep}),
    UserRole.cr_booking: frozenset({BookingStatus.tag_cr_booking}),
    UserRole.auditor: frozenset({BookingStatus.tag_auditor, BookingStatus.qc_done}),
    UserRole.chargeback_dep: frozenset({BookingStatus.tag_rdr, BookingStatus.tag_chargeback}),
    # CS isn't wired to a lead status yet — its PRD role (Future Credits,
    # modification/cancellation support) doesn't hook into the status engine
    # until Phase 6, so it correctly has no lead visibility here yet.
    UserRole.cs: frozenset(),
}


def can_transition(current: BookingStatus, target: BookingStatus) -> bool:
    return target in TRANSITIONS[current].next


def can_set(target: BookingStatus, role: UserRole) -> bool:
    allowed = TRANSITIONS[target].set_by
    if ANY_AUTHORIZED in allowed:
        return role in ANY_AUTHORIZED_ROLES
    return role in allowed


def roles_to_notify(target: BookingStatus) -> frozenset[UserRole]:
    return TRANSITIONS[target].notifies
