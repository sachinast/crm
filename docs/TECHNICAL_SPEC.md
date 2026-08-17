# Travel CRM — Technical Specification (v1)

Stack: **Next.js (TypeScript, App Router)** · **FastAPI (Python)** · **PostgreSQL** · **Redis** · **Celery**

This document turns the product PRD into a build-ready spec: concrete schema, API contracts,
state-machine logic, project layout, and a phased delivery plan. It assumes **Option B**
(Next.js frontend + FastAPI backend) from the original proposal.

---

## 1. Architecture Overview

```
┌─────────────────────┐        HTTPS/JSON (versioned REST)        ┌──────────────────────────┐
│   Next.js (App Router)│ ───────────────────────────────────────▶ │   FastAPI backend          │
│   - Server Components │ ◀─────────────────────────────────────── │   - /api/v1/*              │
│   - Route Handlers    │            WebSocket (notifications)      │   - business logic         │
│     (thin proxy/BFF)  │ ◀───────────────────────────────────────▶ │   - RBAC + IP whitelist    │
└─────────────────────┘                                            │   - status state machine   │
                                                                     └───────────┬──────────────┘
                                                                                 │
                                            ┌────────────────────────────────────┼───────────────────┐
                                            ▼                                    ▼                    ▼
                                    ┌───────────────┐                  ┌────────────────┐     ┌───────────────┐
                                    │  PostgreSQL   │                  │  Redis          │     │ Celery workers │
                                    │  (source of   │                  │  (cache, pub/sub,│     │ - sheets sync  │
                                    │   truth)      │                  │   Celery broker) │     │ - notifications│
                                    └───────────────┘                  └────────────────┘     │ - audit jobs   │
                                                                                                 └───────────────┘
                                                                                                        │
                                                                                                        ▼
                                                                                               Google Sheets API
```

**Key decisions**

- FastAPI owns *all* business logic, DB access, and validation (Pydantic). Next.js never talks to Postgres directly.
- Next.js Route Handlers act as a thin BFF only where needed (e.g., setting httpOnly cookies from the JWT FastAPI issues). Everything else is server-side `fetch` calls from React Server Components straight to FastAPI.
- Auth: FastAPI issues short-lived JWT access tokens + refresh tokens. Next.js stores them in httpOnly, secure cookies; a middleware forwards them as `Authorization: Bearer` on server-side calls.
- Real-time: FastAPI WebSocket endpoint (`/ws/notifications`) per authenticated user/role channel, backed by Redis Pub/Sub so multiple FastAPI workers can broadcast.
- Background work (Google Sheets sync, notification fan-out, audit log writes that shouldn't block the request) runs via Celery + Redis.

---

## 2. Database Schema (PostgreSQL DDL)

Enable extensions once:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fuzzy search for duplicate detection
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email matching
```

### 2.1 Enums

```sql
CREATE TYPE user_role AS ENUM (
  'super_admin', 'admin', 'agent', 'billing', 'tl',
  'auditor', 'cs', 'change_dep', 'chargeback_dep', 'cr_booking'
);

CREATE TYPE service_type AS ENUM ('car', 'hotel', 'flight');

CREATE TYPE booking_status AS ENUM (
  'authorization_pending', 'client_approved', 'transferred_to_billing',
  'card_charged', 'card_declined', 'tag_change_dep', 'tag_cr_booking',
  'tag_auditor', 'qc_done', 'tag_refund', 'tag_rdr', 'tag_chargeback'
);

CREATE TYPE pii_field AS ENUM ('email', 'phone', 'card');
CREATE TYPE sync_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE transmission_type AS ENUM ('automatic', 'manual');
CREATE TYPE vehicle_type AS ENUM (
  'economy', 'compact', 'intermediate', 'standard', 'full_size',
  'standard_suv', 'intermediate_suv', 'premium_suv', 'full_size_suv',
  'luxury', 'passenger_van', 'mini_van', 'fifteen_passenger_van',
  'mystery_car', 'premium_crossover', 'premium_elite_crossover',
  'pickup_truck', 'electric'
);
```

### 2.2 Identity & Access

```sql
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  email            CITEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  role             user_role NOT NULL,
  ip_whitelist_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_whitelisted_ips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address  INET NOT NULL,
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ip_address)
);

-- Global toggle (Super Admin controlled), single-row config table
CREATE TABLE system_settings (
  id                       BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  registration_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by               UUID REFERENCES users(id),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 Leads / Core CRM record

```sql
CREATE TABLE leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- crm_id referenced elsewhere
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            CITEXT NOT NULL,
  service_type     service_type,                 -- null until booking form is filled (Step 4)
  status           booking_status NOT NULL DEFAULT 'authorization_pending',
  agent_id         UUID NOT NULL REFERENCES users(id),
  is_duplicate     BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of_id  UUID REFERENCES leads(id),
  duplicate_override_reason TEXT,                -- captured when agent proceeds despite a match
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_agent_id   ON leads(agent_id);
CREATE INDEX idx_leads_status     ON leads(status);
CREATE INDEX idx_leads_email      ON leads(email);
CREATE INDEX idx_leads_phone      ON leads(phone);
CREATE INDEX idx_leads_name_trgm  ON leads USING gin (name gin_trgm_ops);
-- Duplicate-detection query hits phone/email exact + name trigram similarity in one call.
```

### 2.4 Service-specific booking modules

Each has a 1:1 relationship to `leads` (a lead becomes exactly one booking once the service type is chosen).

```sql
CREATE TABLE car_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  booking_reference   TEXT NOT NULL,
  booking_platform    TEXT NOT NULL,               -- eBookingHub, Our Booking, ...
  car_provider        TEXT NOT NULL,                -- Hertz, Budget, ...
  renter_name         TEXT NOT NULL,
  renter_dob          DATE NOT NULL,
  transmission        transmission_type NOT NULL,
  fuel_policy         TEXT,
  vehicle_type        vehicle_type NOT NULL,
  pickup_datetime     TIMESTAMPTZ NOT NULL,
  pickup_location     TEXT NOT NULL,
  return_datetime     TIMESTAMPTZ NOT NULL,
  return_location     TEXT NOT NULL,
  prepaid_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  pay_at_counter_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(12,2) GENERATED ALWAYS AS (prepaid_amount + pay_at_counter_amount) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hotel_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  booking_reference   TEXT NOT NULL,
  booking_platform    TEXT NOT NULL,
  hotel_name          TEXT NOT NULL,
  room_type           TEXT NOT NULL,
  location             TEXT NOT NULL,
  check_in_date       DATE NOT NULL,
  check_out_date      DATE NOT NULL,
  prepaid_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  pay_at_counter_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(12,2) GENERATED ALWAYS AS (prepaid_amount + pay_at_counter_amount) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out_date > check_in_date)
);

CREATE TABLE flight_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  booking_reference   TEXT NOT NULL,
  pnr                 TEXT NOT NULL,
  airline             TEXT NOT NULL,
  flight_numbers      TEXT[] NOT NULL,
  origin              TEXT NOT NULL,
  destination         TEXT NOT NULL,
  cabin_class         TEXT NOT NULL,
  prepaid_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  pay_at_counter_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(12,2) GENERATED ALWAYS AS (prepaid_amount + pay_at_counter_amount) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.5 Modifications, cancellations, credits, payments

```sql
CREATE TABLE booking_modifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_name          TEXT NOT NULL,           -- e.g. 'pickup_date', 'room_type'
  original_value      JSONB NOT NULL,
  revised_value       JSONB NOT NULL,
  modification_amount NUMERIC(12,2) NOT NULL DEFAULT 0,  -- +owed / -refunded
  modified_by         UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_mods_lead ON booking_modifications(lead_id);

CREATE TABLE cancellations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  original_prepaid_amount NUMERIC(12,2) NOT NULL,
  cancellation_penalty_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_amount          NUMERIC(12,2) GENERATED ALWAYS AS
                           (GREATEST(original_prepaid_amount - cancellation_penalty_fee, 0)) STORED,
  final_retained_amount  NUMERIC(12,2) GENERATED ALWAYS AS
                           (LEAST(cancellation_penalty_fee, original_prepaid_amount)) STORED,
  cancelled_by           UUID NOT NULL REFERENCES users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  prepaid_amount NUMERIC(12,2) NOT NULL,
  pay_at_counter_amount NUMERIC(12,2) NOT NULL,
  total_amount   NUMERIC(12,2) GENERATED ALWAYS AS (prepaid_amount + pay_at_counter_amount) STORED,
  card_last_four TEXT,                          -- masked storage only; never raw PAN
  card_token     TEXT,                          -- reference to PCI-compliant vault/processor token
  outcome        TEXT NOT NULL DEFAULT 'pending', -- pending | charged | declined | refunded
  processed_by   UUID REFERENCES users(id),
  processed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_lead ON payment_transactions(lead_id);

CREATE TABLE future_credits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_lead_id   UUID NOT NULL REFERENCES leads(id),
  voucher_amount   NUMERIC(12,2) NOT NULL,
  number_of_vouchers INTEGER NOT NULL DEFAULT 1,
  validity_date    DATE NOT NULL,
  created_by       UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_future_credits_source ON future_credits(source_lead_id);
-- Enforced in application layer + trigger: created_by user's role must be 'tl' or 'cs'.
```

### 2.6 Consent / Authorization

```sql
CREATE TABLE authorization_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  cardholder_confirmed  BOOLEAN NOT NULL,
  prepaid_charge_ack    BOOLEAN NOT NULL,
  pay_at_counter_ack    BOOLEAN NOT NULL,
  booking_details_ack   BOOLEAN NOT NULL,
  terms_ack             BOOLEAN NOT NULL,
  non_refundable_ack    BOOLEAN NOT NULL,
  consent_status        TEXT NOT NULL DEFAULT 'authorized',
  customer_ip           INET NOT NULL,
  user_agent            TEXT NOT NULL,
  authorized_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_records_lead ON authorization_records(lead_id);
```

### 2.7 Status engine, notifications, audit

```sql
-- Reference/config table driving the state machine (see §3)
CREATE TABLE status_lookup (
  status         booking_status PRIMARY KEY,
  label          TEXT NOT NULL,
  ui_color       TEXT NOT NULL,
  set_by_roles   user_role[] NOT NULL,
  notifies_roles user_role[] NOT NULL,
  sort_order     INTEGER NOT NULL
);

CREATE TABLE status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_status  booking_status,
  to_status    booking_status NOT NULL,
  changed_by   UUID NOT NULL REFERENCES users(id),
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_lead ON status_history(lead_id);

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES users(id),
  recipient_role  user_role,                 -- fan-out to all users of a role when user_id is null
  type            TEXT NOT NULL,             -- 'status_change' | 'record_opened' | 'reveal' ...
  message         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id, is_read);

CREATE TABLE access_notification_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  opened_by    UUID NOT NULL REFERENCES users(id),
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_access_log_lead ON access_notification_log(lead_id);

CREATE TABLE pii_reveal_audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id       UUID NOT NULL REFERENCES users(id),
  field_revealed pii_field NOT NULL,
  reason         TEXT NOT NULL,
  ip_address     INET NOT NULL,
  user_agent     TEXT NOT NULL,
  revealed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pii_log_lead ON pii_reveal_audit_log(lead_id);

-- Admin-only master lifecycle log ("Log Report of Booking Process")
CREATE TABLE booking_process_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id      UUID NOT NULL REFERENCES users(id),
  action        TEXT NOT NULL,        -- 'status_change' | 'field_update' | 'created' | ...
  field_changed TEXT,
  old_value     JSONB,
  new_value     JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_process_log_lead ON booking_process_log(lead_id);
-- Immutability: REVOKE UPDATE, DELETE on this table from the application DB role;
-- inserts only, via a dedicated Postgres role with no UPDATE/DELETE grant.

CREATE TABLE google_sheets_sync_status (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  table_name   TEXT NOT NULL DEFAULT 'leads',
  status       sync_status NOT NULL DEFAULT 'pending',
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  synced_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sheets_sync_status ON google_sheets_sync_status(status);
```

### 2.8 Entity-relationship summary

```
users ──< user_whitelisted_ips
users ──< leads (agent_id)
leads ──1:1── car_bookings | hotel_bookings | flight_bookings
leads ──< booking_modifications
leads ──1:1── cancellations
leads ──< payment_transactions
leads ──< future_credits (source_lead_id)
leads ──< authorization_records
leads ──< status_history
leads ──< notifications
leads ──< access_notification_log
leads ──< pii_reveal_audit_log
leads ──< booking_process_log
leads ──< google_sheets_sync_status
status_lookup ──referenced by── leads.status (FK-like, enforced via CHECK/enum)
```

All migrations should be written with **Alembic** (see §6.2), one revision per table/feature, not
one giant initial migration — this keeps the audit trail of schema changes itself reviewable.

---

## 3. Status State Machine

`leads.status` is the single source of truth for a booking's stage. Model it as data, not `if/elif`
chains, so new statuses/roles don't require redeploys of core logic.

### 3.1 Transition table (`app/domain/status_machine.py`)

```python
from enum import Enum

class BookingStatus(str, Enum):
    AUTHORIZATION_PENDING = "authorization_pending"
    CLIENT_APPROVED = "client_approved"
    TRANSFERRED_TO_BILLING = "transferred_to_billing"
    CARD_CHARGED = "card_charged"
    CARD_DECLINED = "card_declined"
    TAG_CHANGE_DEP = "tag_change_dep"
    TAG_CR_BOOKING = "tag_cr_booking"
    TAG_AUDITOR = "tag_auditor"
    QC_DONE = "qc_done"
    TAG_REFUND = "tag_refund"
    TAG_RDR = "tag_rdr"
    TAG_CHARGEBACK = "tag_chargeback"

# status -> (roles allowed to set it, roles notified, allowed next statuses)
TRANSITIONS = {
    BookingStatus.AUTHORIZATION_PENDING: {
        "set_by": {"system"}, "notifies": set(),
        "next": {BookingStatus.CLIENT_APPROVED},
    },
    BookingStatus.CLIENT_APPROVED: {
        "set_by": {"customer"}, "notifies": {"admin"},
        "next": {BookingStatus.TRANSFERRED_TO_BILLING},
    },
    BookingStatus.TRANSFERRED_TO_BILLING: {
        "set_by": {"agent", "super_admin", "admin"}, "notifies": {"billing"},
        "next": {BookingStatus.CARD_CHARGED, BookingStatus.CARD_DECLINED},
    },
    BookingStatus.CARD_CHARGED: {
        "set_by": {"billing"}, "notifies": {"agent"},
        "next": {BookingStatus.TAG_CHANGE_DEP, BookingStatus.TAG_CR_BOOKING,
                 BookingStatus.TAG_AUDITOR, BookingStatus.TAG_REFUND,
                 BookingStatus.TAG_RDR, BookingStatus.TAG_CHARGEBACK},
    },
    BookingStatus.CARD_DECLINED: {
        "set_by": {"billing"}, "notifies": {"agent"},
        "next": {BookingStatus.TRANSFERRED_TO_BILLING},   # retry
    },
    BookingStatus.TAG_CHANGE_DEP: {
        "set_by": "any_authorized", "notifies": {"change_dep"},
        "next": {BookingStatus.TAG_AUDITOR},
    },
    BookingStatus.TAG_CR_BOOKING: {
        "set_by": "any_authorized", "notifies": {"cr_booking"},
        "next": {BookingStatus.TAG_AUDITOR},
    },
    BookingStatus.TAG_AUDITOR: {
        "set_by": "any_authorized", "notifies": {"auditor", "admin"},
        "next": {BookingStatus.QC_DONE},
    },
    BookingStatus.QC_DONE: {
        "set_by": {"auditor"}, "notifies": {"agent", "admin"},
        "next": set(),   # terminal (happy path)
    },
    BookingStatus.TAG_REFUND: {
        "set_by": {"billing"}, "notifies": {"billing"}, "next": set(),
    },
    BookingStatus.TAG_RDR: {
        "set_by": {"billing"}, "notifies": {"billing", "chargeback_dep"}, "next": set(),
    },
    BookingStatus.TAG_CHARGEBACK: {
        "set_by": {"billing"}, "notifies": {"billing", "chargeback_dep"}, "next": set(),
    },
}
```

### 3.2 Enforcement flow (every status change)

1. `PATCH /api/v1/leads/{id}/status` receives `{ new_status, reason? }`.
2. Load current lead row **with `SELECT ... FOR UPDATE`** (row lock — prevents two agents racing the same transition).
3. Validate `new_status in TRANSITIONS[current_status]["next"]`.
4. Validate `current_user.role in TRANSITIONS[new_status]["set_by"]` (or the "any_authorized" set, defined as any non-Agent role, or per your final sign-off in §3 of the PRD).
5. In one DB transaction: update `leads.status`, insert `status_history` row, insert `booking_process_log` row.
6. After commit: enqueue a Celery task that (a) writes `notifications` rows for every role/user in `notifies`, (b) pushes over the WebSocket channel for connected users, (c) enqueues the Google Sheets sync task.
7. Return the updated lead.

This keeps the "notify on transition" behavior in **one place** instead of scattered across
endpoints — new statuses are added by editing the `TRANSITIONS` dict and `status_lookup` seed data,
not by writing new endpoint code.

---

## 4. RBAC Implementation

### 4.1 Permission model

Two layers, both enforced server-side in FastAPI (never trust the client):

1. **Role → action** — coarse: can this role call this endpoint at all (e.g., only `tl`/`cs` may `POST /future-credits`).
2. **Row-level visibility** — a query-time filter, not a separate permission check:
   - `agent`: `WHERE leads.agent_id = current_user.id`
   - `billing` / `change_dep` / `cr_booking` / `auditor` / `chargeback_dep`: `WHERE leads.status = ANY(:statuses_relevant_to_role)`
   - `super_admin`, `admin`, `tl`: no filter (full visibility)
   - Plus any row explicitly ad-hoc-granted via a `lead_access_grants(lead_id, user_id)` table (add this table if "manually grant ad-hoc access" needs to persist beyond a single session — recommended).

### 4.2 FastAPI dependency shape

```python
# app/api/deps.py
def require_role(*roles: UserRole):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Insufficient role")
        return user
    return dependency

def require_ip_whitelisted(user: User = Depends(get_current_user), request: Request = None):
    if user.ip_whitelist_enabled:
        client_ip = get_client_ip(request)  # honor X-Forwarded-For behind a trusted proxy only
        if not is_ip_allowed(user.id, client_ip):
            raise HTTPException(403, "IP not whitelisted")
    return user

def visible_leads_query(user: User = Depends(get_current_user)) -> Select:
    # returns a SQLAlchemy Select pre-filtered per §4.1 rules
    ...
```

Every leads/bookings endpoint composes `Depends(require_ip_whitelisted)` and applies
`visible_leads_query` — so "can't see" and "can't act on" collapse to the same filtered query,
which is the safest way to avoid an endpoint that leaks a record via a 403-vs-404 timing
difference or a forgotten filter.

### 4.3 Role → permission matrix

| Role | Create Lead | View Scope | Set Status | Reveal PII | Future Credits | Master Process Log |
|---|---|---|---|---|---|---|
| super_admin | ✓ | all | any | ✓ | — | ✓ |
| admin | ✓ | all | any | ✓ | — | ✓ |
| agent | ✓ | own leads | Transferred to Billing | own leads, logged | — | — |
| billing | — | status-scoped | Card Charged/Declined, Refund/RDR/Chargeback | ✓ | — | — |
| tl | — | all | any (oversight) | ✓ | ✓ create | — |
| auditor | — | status-scoped (cross-service) | QC Done | ✓ | view only | — |
| cs | — | status-scoped | modification/cancellation triggers | — | ✓ create | — |
| change_dep | — | status-scoped | (modification workflow) | — | view only | — |
| chargeback_dep | — | status-scoped | RDR/Chargeback resolution | — | view only | — |
| cr_booking | — | status-scoped | (fulfillment) | — | — | — |

---

## 5. API Contract (v1)

Base path: `/api/v1`. All responses JSON; all list endpoints paginated (`?page=&page_size=`, max 100).
Auth: `Authorization: Bearer <jwt>`. Errors: `{ "detail": str }` with standard HTTP codes.

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | email + password → access + refresh token |
| POST | `/auth/refresh` | refresh token → new access token |
| POST | `/auth/logout` | revokes refresh token |

### Users (Admin/Super Admin only)
| Method | Path | Notes |
|---|---|---|
| GET | `/users` | list, filter by role |
| POST | `/users` | provision new user (no self-registration) |
| PATCH | `/users/{id}` | change role, active flag |
| POST | `/users/{id}/ips` | add whitelisted IP |
| DELETE | `/users/{id}/ips/{ip_id}` | remove whitelisted IP |
| PATCH | `/system-settings` | toggle `registration_enabled` (super_admin only) |

### Leads
| Method | Path | Notes |
|---|---|---|
| POST | `/leads` | Step 1 — name/phone/email only |
| GET | `/leads/{id}/duplicate-check` | Step 2 — runs on submit; returns candidate matches |
| POST | `/leads/{id}/confirm` | Step 3 — agent confirms proceed despite match (stores `duplicate_override_reason`) |
| GET | `/leads` | Step-4-and-beyond listing; row-filtered per §4.1; filters: `status`, `service_type`, `date_from/to`, `email`, `mobile` |
| GET | `/leads/{id}` | fires `access_notification_log` insert + notify admin/owning agent |
| PATCH | `/leads/{id}/service-type` | selects car/hotel/flight, unlocks booking form |
| PATCH | `/leads/{id}/status` | the state-machine endpoint (§3.2) |

### Booking modules
| Method | Path |
|---|---|
| POST/GET/PATCH | `/leads/{id}/car-booking` |
| POST/GET/PATCH | `/leads/{id}/hotel-booking` |
| POST/GET/PATCH | `/leads/{id}/flight-booking` |

### Modifications / Cancellations / Credits / Payments
| Method | Path | Notes |
|---|---|---|
| POST | `/leads/{id}/modifications` | original vs revised snapshot; auto-computes `modification_amount` |
| GET | `/leads/{id}/modifications` | history |
| POST | `/leads/{id}/cancellation` | computes refund/retained amounts |
| POST | `/leads/{id}/authorization` | "I Authorize" consent capture (public-ish, token-scoped customer link) |
| POST | `/payments` | Billing charges/declines; body includes `lead_id`, amounts, `card_token` |
| POST | `/future-credits` | restricted to `tl`, `cs` |
| GET | `/future-credits?source_lead_id=` | read-only for billing/cs/change_dep/chargeback_dep/auditor |

### Security / Audit
| Method | Path | Notes |
|---|---|---|
| POST | `/leads/{id}/reveal` | body: `{ field: "email"|"phone"|"card", reason }`; returns unmasked value once, logs to `pii_reveal_audit_log` |
| GET | `/audit/pii-reveals` | super_admin/admin only |
| GET | `/audit/process-log?lead_id=` | admin-only master log |
| GET | `/audit/access-log?lead_id=` | record-open history |

### Integration / Sync
| Method | Path | Notes |
|---|---|---|
| POST | `/leads/capture` | external capture endpoint, API-key authenticated, maps external payloads → `leads` |
| GET | `/sheets-sync/status` | admin dashboard for Pending/Success/Failed |
| WS | `/ws/notifications` | per-user channel, role-fanout notifications |

---

## 6. Backend Project Structure (FastAPI)

```
backend/
├── alembic/
│   └── versions/
├── app/
│   ├── main.py                 # FastAPI() app, router includes, middleware
│   ├── core/
│   │   ├── config.py            # pydantic Settings (env vars)
│   │   ├── security.py          # JWT encode/decode, password hashing
│   │   └── logging.py
│   ├── db/
│   │   ├── session.py           # async SQLAlchemy engine/session
│   │   └── base.py              # declarative Base, import registry
│   ├── models/                  # SQLAlchemy ORM models, one file per table group
│   │   ├── user.py
│   │   ├── lead.py
│   │   ├── booking.py
│   │   ├── payment.py
│   │   └── audit.py
│   ├── schemas/                 # Pydantic request/response models
│   ├── domain/
│   │   ├── status_machine.py    # §3
│   │   ├── duplicate_check.py   # trigram + exact match logic
│   │   └── masking.py           # mask_email/mask_phone/mask_card helpers
│   ├── api/
│   │   ├── deps.py              # §4.2
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── leads.py
│   │       ├── bookings.py
│   │       ├── payments.py
│   │       ├── credits.py
│   │       ├── audit.py
│   │       └── websocket.py
│   ├── services/                # orchestration used by routers (transaction boundaries live here)
│   └── workers/
│       ├── celery_app.py
│       ├── tasks_notifications.py
│       └── tasks_sheets_sync.py
├── tests/
├── pyproject.toml
└── Dockerfile
```

## 7. Frontend Project Structure (Next.js App Router)

```
frontend/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # role-aware nav, session check (server component)
│   │   ├── leads/
│   │   │   ├── page.tsx          # list + filters (Date/Email/Mobile) — matches §5 GET /leads
│   │   │   ├── new/page.tsx      # Step 1–4 lead-first flow
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # detail, status badge, masked fields with Reveal buttons
│   │   │       └── booking/{car,hotel,flight}/page.tsx
│   │   ├── billing/page.tsx
│   │   ├── audit/page.tsx        # QC queue (Auditor)
│   │   ├── admin/
│   │   │   ├── users/page.tsx
│   │   │   ├── process-log/page.tsx
│   │   │   └── sheets-sync/page.tsx
│   │   └── future-credits/page.tsx
│   └── api/                       # thin Route Handlers only where a server-set cookie is needed
│       └── auth/[...nextauth-like]/route.ts
├── components/
│   ├── ui/                        # shared primitives (badge, table, modal)
│   ├── leads/DuplicateCheckPrompt.tsx
│   ├── leads/StatusBadge.tsx      # colors from status_lookup, single source of truth
│   └── pii/RevealField.tsx        # click-to-reveal, calls /leads/{id}/reveal with a reason modal
├── lib/
│   ├── api-client.ts              # typed fetch wrapper, attaches Bearer token server-side
│   ├── auth.ts
│   └── ws-client.ts               # notification subscription hook
├── types/                         # generated from FastAPI's OpenAPI schema (see §9)
├── middleware.ts                  # route protection, redirects unauthenticated users
└── next.config.ts
```

---

## 8. Security Implementation Notes

- **Data masking**: never send raw email/phone/card to the client by default. `GET /leads/{id}`
  returns masked values (`mask_email()`/`mask_phone()`/`mask_card()` applied server-side); only
  `POST /leads/{id}/reveal` returns the raw value, and only after logging the request.
- **Card data**: do not store raw PANs at all — integrate a PCI-compliant processor/tokenizer
  (Stripe, Braintree, etc.) and store only `card_last_four` + `card_token`. This is stronger than
  "masking" a stored PAN and keeps the project out of PCI-DSS SAQ D scope.
- **IP whitelisting**: enforce in FastAPI middleware/dependency, not just at "the database" layer —
  Postgres itself has no HTTP-request-IP concept; the PRD's "database/session layer" phrasing maps
  to "checked on every authenticated session/request" in practice. If you also want defense-in-depth
  at the network layer, pair this with a Postgres role that only accepts connections from the
  backend's own VPC (not per end-user IP — that's not how DB connections work).
- **Immutable audit tables**: `booking_process_log` and `pii_reveal_audit_log` should be
  insert-only for the application's runtime DB role (`REVOKE UPDATE, DELETE ON ... FROM app_role`).
- **JWT**: short-lived access token (~15 min), rotating refresh token stored httpOnly+secure,
  refresh-token reuse detection (revoke the whole chain if a used-and-rotated token is replayed).
- **Rate limiting**: apply to `/auth/login`, `/leads/{id}/reveal`, and `/leads/capture`.

---

## 9. Local Development Setup

### 9.1 `docker-compose.yml` (repo root)

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: crm
      POSTGRES_PASSWORD: crm
      POSTGRES_DB: crm
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7
    ports: ["6379:6379"]

  backend:
    build: ./backend
    env_file: ./backend/.env
    depends_on: [postgres, redis]
    ports: ["8000:8000"]
    volumes: ["./backend:/app"]

  celery_worker:
    build: ./backend
    command: celery -A app.workers.celery_app worker -l info
    env_file: ./backend/.env
    depends_on: [postgres, redis]

  frontend:
    build: ./frontend
    env_file: ./frontend/.env.local
    depends_on: [backend]
    ports: ["3000:3000"]
    volumes: ["./frontend:/app"]

volumes:
  pgdata:
```

### 9.2 `backend/.env.example`

```
DATABASE_URL=postgresql+asyncpg://crm:crm@postgres:5432/crm
REDIS_URL=redis://redis:6379/0
JWT_SECRET=change-me
JWT_ACCESS_TTL_MIN=15
JWT_REFRESH_TTL_DAYS=7
GOOGLE_SHEETS_CREDENTIALS_JSON=./secrets/sheets-service-account.json
GOOGLE_SHEETS_SPREADSHEET_ID=
CORS_ORIGINS=http://localhost:3000
```

### 9.3 `frontend/.env.local.example`

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

### 9.4 Type sharing between frontend and backend

FastAPI auto-generates OpenAPI JSON at `/openapi.json`. Run
`openapi-typescript http://localhost:8000/openapi.json -o frontend/types/api.d.ts`
(wire this into a `pnpm generate:types` script) so the two codebases stay in sync without
hand-maintained duplicate interfaces — this recovers most of the "shared types" benefit Option A
would have given you for free.

---

## 10. Phased Delivery Plan

| Phase | Scope | Exit criteria |
|---|---|---|
| 0 — Scaffolding | Repo structure, docker-compose, CI skeleton, Alembic baseline migration (all tables in §2) | `docker compose up` boots all services; empty schema migrated |
| 1 — Auth & RBAC | `users`, JWT auth, `require_role`/`require_ip_whitelisted` deps, admin user-provisioning UI | Admin can create users with roles; login works; protected routes 403 correctly |
| 2 — Lead-first flow | `leads` CRUD, duplicate-check (trigram+exact), confirm-override flow, lead list w/ filters | Steps 1–4 of §4 in the PRD work end-to-end in the UI |
| 3 — Booking modules | car/hotel/flight tables + forms, service-type unlock | Each module's fields persist and render on the lead detail page |
| 4 — Status engine | `status_machine.py`, `PATCH /leads/{id}/status`, `status_history`, notifications table + WebSocket push | Full standard flow (§6.2 PRD) transitions correctly with role checks and live notifications |
| 5 — Payments & consent | `authorization_records`, `payment_transactions`, Billing screens | "I Authorize" capture works; Billing can charge/decline, driving status transitions |
| 6 — Modifications/cancellations/credits | `booking_modifications`, `cancellations`, `future_credits` w/ role restriction | Original-vs-revised diff UI; refund math verified against PRD §7.2 formulas |
| 7 — Security & audit | Masking everywhere, `/reveal` endpoint + `pii_reveal_audit_log`, `booking_process_log` (admin-only, insert-only), `access_notification_log` | PII never appears unmasked outside a logged reveal; Admin can view full process log |
| 8 — Integrations | ~~Google Sheets sync worker + status dashboard~~ **Re-scoped:** API-key-authenticated `/leads/capture` open to Zapier/Make/any external API or form, plus Admin key management UI (Google Sheets sync dropped — not needed) | New lead via external POST appears correctly, attributed to the right agent, PII still masked |
| 9 — Hardening & deploy | Rate limiting, refresh-token rotation/reuse detection, load test on `/leads` list, prod docker images, CI/CD to hosting targets from §12 of the PRD | Passes a basic security review checklist before go-live |

Each phase should ship as its own PR/branch against `main` with the relevant Alembic migration(s)
and tests — don't let the schema and the app code drift into a single mega-migration.

---

## 11. Open Items to Confirm With the Client (carried over from PRD §13)

- Final wording/scope of "any authorized role" for the `tag_*` transitions (§3.1) — needs an explicit role list before Phase 4.
- Card payment processor choice (Stripe/Braintree/other) — affects `payment_transactions.card_token` format and PCI scope.
- Whether ad-hoc Super Admin grants (§3.2 of PRD) need to persist as rows (`lead_access_grants` table, added in §4.1 above) or are session-only — recommend persisting for auditability.
- ~~Google Sheets sync interval/latency target~~ — moot: Phase 8 dropped Google Sheets sync in
  favor of a general Zapier/Make/API-key external-capture surface (`POST /leads/capture`).
