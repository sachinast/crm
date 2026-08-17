# CRM — Car · Hotel · Flight Booking Management Platform

Secure, role-based, audit-ready lead-to-booking CRM.

**Stack:** Next.js (TypeScript) · FastAPI · PostgreSQL · Redis · Celery

## Docs

- [Product Requirements & Technical Proposal](docs/CRM-PRD.pdf) — original source document.
- [Technical Specification](docs/TECHNICAL_SPEC.md) — database schema (DDL), API contracts,
  RBAC & status state-machine design, project structure, and the phased delivery plan.

## Status: Phase 0 complete

Repo scaffolding is in place and verified end-to-end:

- ✅ PostgreSQL 16 schema migrated (`backend/alembic/versions/0001_baseline_schema.py`) — all
  20 core tables + seeded `status_lookup` from TECHNICAL_SPEC.md §2.
- ✅ FastAPI app boots, `/api/v1/health` and `/api/v1/health/db` both green.
- ✅ Status state machine (`backend/app/domain/status_machine.py`) and masking helpers
  (`backend/app/domain/masking.py`) implemented per §3/§8, ready for Phase 4 wiring.
- ✅ Celery app stub boots (`backend/app/workers/celery_app.py`).
- ✅ Next.js app builds and renders, confirmed talking live to the FastAPI health endpoint.
- ✅ `docker-compose.yml` for a fully containerized stack; CI (`.github/workflows/ci.yml`)
  runs backend tests + migrations and frontend lint/build on every push.

Next: **Phase 1 — Auth & RBAC** (see TECHNICAL_SPEC.md §10 for the full phase breakdown).

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
