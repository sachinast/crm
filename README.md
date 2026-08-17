# CRM — Car · Hotel · Flight Booking Management Platform

Secure, role-based, audit-ready lead-to-booking CRM.

**Stack:** Next.js (TypeScript) · FastAPI · PostgreSQL · Redis · Celery

## Docs

- [Product Requirements & Technical Proposal](docs/CRM-PRD.pdf) — original source document.
- [Technical Specification](docs/TECHNICAL_SPEC.md) — database schema (DDL), API contracts,
  RBAC & status state-machine design, project structure, and the phased delivery plan.

## Status: Phase 4 complete

**Phase 0 — Scaffolding:**

- ✅ PostgreSQL 16 schema migrated (`backend/alembic/versions/0001_baseline_schema.py`) — all
  20 core tables + seeded `status_lookup` from TECHNICAL_SPEC.md §2.
- ✅ Status state machine (`backend/app/domain/status_machine.py`) and masking helpers
  (`backend/app/domain/masking.py`) implemented per §3/§8, ready for Phase 4 wiring.
- ✅ Celery app stub boots (`backend/app/workers/celery_app.py`).
- ✅ `docker-compose.yml` for a fully containerized stack; CI (`.github/workflows/ci.yml`)
  runs backend tests + migrations and frontend lint/build on every push.

**Phase 1 — Auth & RBAC:**

- ✅ JWT auth (`POST /auth/login`, `/auth/refresh`, `/auth/logout`) — passwords hashed with
  bcrypt, no self-registration (accounts are provisioned by Admin/Super Admin only, per PRD §3).
- ✅ RBAC dependencies (`require_role`, `require_ip_whitelisted` in `backend/app/api/deps.py`)
  enforced on every `/users` and `/system-settings` endpoint.
- ✅ `backend/app/scripts/seed_superadmin.py` bootstraps the first account (there's no
  self-registration, so something has to seed it).
- ✅ 15 passing pytest tests covering login, refresh, role checks (403s), IP whitelist
  enforcement, and the registration-toggle Super-Admin gate — runs against a real Postgres.
- ✅ Frontend: working login page, httpOnly-cookie session (`app/api/auth/*` route handlers —
  tokens never reach client JS), role-aware dashboard nav, route protection (`proxy.ts`), and a
  **live** Admin → Users page (list + create-user form) wired to the real backend.
- ✅ End-to-end verified in-browser: unauthenticated redirect → login → role-aware dashboard →
  create a user through the UI → new user logs in successfully.

**Phase 2 — Lead-first flow:**

- ✅ `POST /leads` (Step 1) creates the lead and runs duplicate detection inline — exact match
  on phone/email, trigram fuzzy match on name (`backend/app/domain/duplicate_check.py`).
- ✅ `GET /leads/{id}/duplicate-check` (Step 2) returns the candidate list; `POST
  /leads/{id}/confirm` (Step 3) captures the agent's override reason; `PATCH
  /leads/{id}/service-type` (Step 4) unlocks the booking form and 409s until a flagged
  duplicate is confirmed.
- ✅ Row-level RBAC visibility (`apply_lead_visibility` in `backend/app/api/deps.py`): Agents
  see only their own leads, Super Admin/Admin/TL see all, everyone else sees nothing yet
  (correct — status-based sharing to Billing/Auditor/etc. is Phase 4). 404s (not 403s) for
  leads outside a user's visibility, so existence isn't leaked across the RBAC boundary.
- ✅ `GET /leads/{id}` logs `access_notification_log` + writes `notifications` rows for the
  admin role and the owning agent (real-time delivery lands in Phase 4).
- ✅ 10 new passing pytest tests (35 total) covering duplicate detection, the confirm/unlock
  gate, RBAC visibility across roles, and the email/mobile filters.
- ✅ Frontend: a real multi-step lead intake flow (`app/(dashboard)/leads/new`), a live leads
  list with email/mobile filters, and a lead detail page — all wired to the backend, no
  placeholders. Verified end-to-end in-browser, including the duplicate-detection prompt
  firing correctly on a matching phone number and the "dup" badge showing in the list.

**Phase 3 — Booking modules:**

- ✅ `POST/GET/PATCH /leads/{id}/{car,hotel,flight}-booking` — all three modules, generated
  from one factory (`backend/app/api/v1/bookings.py`) since the three are structurally
  identical (1:1 with the lead, gated on the lead's `service_type` matching).
- ✅ Guards: 409 if the lead's service type doesn't match the module being booked, 409 if a
  booking already exists for that lead (use PATCH instead), 422 if return-before-pickup
  (car) or checkout-before-checkin (hotel) — the latter also DB-enforced (`ck_hotel_dates`).
- ✅ `total_amount` is never client-settable — it's the DB-generated
  `prepaid_amount + pay_at_counter_amount` column on every *Read schema.
- ✅ 10 new passing pytest tests (35 total) covering all three modules' full lifecycle,
  the service-type/duplicate-booking guards, and that booking endpoints inherit the same
  lead-visibility 404s as the lead itself.
- ✅ Frontend: real Car/Hotel/Flight forms (`app/(dashboard)/leads/[id]/booking/{car,hotel,
  flight}`) matching every PRD §5 field, including the full 18-option standardized vehicle-type
  dropdown. Lead detail page shows a "Complete {type} booking" CTA until one exists, then a
  summary with an Edit link (same form, pre-filled, PATCHes instead of POSTs).
- ✅ Verified end-to-end in-browser: created a lead, selected Car Rental, filled and submitted
  the full booking form, and the lead detail page rendered the persisted booking with the
  correct DB-computed total (150 + 50 = 200) — then reopened via Edit and confirmed the form
  came back pre-filled from the saved data.

**Phase 4 — Status engine:**

- ✅ `PATCH /leads/{id}/status` — the state-machine endpoint (`backend/app/domain/status_machine.py`,
  built back in Phase 0, finally wired up). Row-locks the lead (`SELECT ... FOR UPDATE`),
  validates the transition edge and the actor's role against the same table, writes
  `status_history` + `notifications` in the same transaction, then pushes over WebSocket.
  `client_approved`/`authorization_pending` are CUSTOMER/SYSTEM-only in that table, so no
  staff Bearer token can ever set them here — that's Phase 5's "I Authorize" flow.
- ✅ **Status-based visibility is now real**: `ROLE_RELEVANT_STATUSES` (status_machine.py) plus
  `apply_lead_visibility` (deps.py) mean Billing/Auditor/Change Dep/CR Booking/Chargeback Dep
  see a lead exactly while it's relevant to their stage — visibility (and the ability to act)
  both arrive *and leave* automatically as the status moves. (This closed a real gap: Phase 2
  had these roles seeing nothing at all, since nothing routed statuses to them yet.)
- ✅ `GET /leads/{id}/available-transitions` — drives the frontend's action buttons from the
  same transition graph and role rules, so the UI never duplicates that logic.
- ✅ `GET /leads/{id}/status-history` and a real `WS /ws/notifications` endpoint
  (`backend/app/api/v1/websocket.py`) — in-memory connection registry, correct for the single
  uvicorn worker this runs in; noted where it'd need Redis Pub/Sub for multi-worker prod.
- ✅ 8 new passing pytest tests (43 total): the full standard flow end-to-end, role checks at
  every hop, history ordering, and that a lead already moved on by a racing request 409s
  instead of being silently overwritten.
- ✅ Frontend: status badge (PRD §6.1 colors), role-filtered action buttons, a status-history
  audit trail, and a live notification bell (`NotificationBell` + `lib/ws-client.ts`) fed by
  the WebSocket.
- ✅ Verified end-to-end: walked a lead through the *entire* PRD §6.2 standard flow through the
  real UI — client_approved → transferred_to_billing (Agent/Admin) → card_charged (Billing
  only, Agent correctly 403'd) → tag_auditor → qc_done (Auditor only) — with the status badge,
  action buttons, and audit trail all updating correctly at each hop, and each role's Leads
  list only showing the lead while it was actually theirs to act on. Live WebSocket delivery
  confirmed with a standalone listener (browser tabs share cookies/sessions, so a same-browser
  two-tab test can't show two concurrent *users* — a Billing-authenticated WS client received
  the `transferred_to_billing` push the instant an unrelated session triggered it).

Next: **Phase 5 — Payments & consent** (see TECHNICAL_SPEC.md §10 for the full phase breakdown).

## Local Development

### Option A — native (what this repo was verified against)

Requires PostgreSQL 16 and Redis running locally (`brew install postgresql@16 redis`, both
started via `brew services start`), with a `crm`/`crm` role and `crm` database already created
(`pgcrypto`, `pg_trgm`, `citext` extensions enabled).

```bash
# backend
cd backend
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head
.venv/bin/python -m app.scripts.seed_superadmin --email you@example.com --password 'change-me-123' --name "Your Name"
.venv/bin/uvicorn app.main:app --reload --port 8000

# frontend (separate shell)
cd frontend
npm install
npm run dev
```

Backend: http://localhost:8000/docs · Frontend: http://localhost:3000

### Option B — Docker

```bash
docker compose up --build
```

Spins up Postgres (host port `5433`, offset to avoid clashing with a native install),
Redis (`6380`), the FastAPI backend (`8000`, runs migrations on boot), a Celery worker,
and the Next.js frontend (`3000`).

## Repo layout

```
backend/    FastAPI app, SQLAlchemy models, Alembic migrations, Celery worker
frontend/   Next.js (App Router) app
docs/       PRD + technical specification
```
