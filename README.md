# CRM — Car · Hotel · Flight Booking Management Platform

Secure, role-based, audit-ready lead-to-booking CRM.

**Stack:** Next.js (TypeScript) · FastAPI · PostgreSQL · Redis · Celery

## Docs

- [Product Requirements & Technical Proposal](docs/CRM-PRD.pdf) — original source document.
- [Technical Specification](docs/TECHNICAL_SPEC.md) — database schema (DDL), API contracts,
  RBAC & status state-machine design, project structure, and the phased delivery plan.

## Status: Phase 1 complete

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

Next: **Phase 2 — Lead-first flow** (see TECHNICAL_SPEC.md §10 for the full phase breakdown).

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
