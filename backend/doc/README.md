# Backend Documentation — InstaCRM Engine

## 1. Overview
The backend is a high-performance, asynchronous REST API built using **FastAPI**, **SQLAlchemy 2.0 (Async)**, **PostgreSQL (asyncpg)**, **Redis**, and **Alembic**. It implements role-based access control (RBAC), multi-modality booking lifecycle management (Flights, Hotels, Cars), audit trails, and customizable master configurations.

---

## 2. Directory Structure

```
backend/
├── alembic/                  # Alembic database migration versions (0001 - 0023)
│   └── versions/
├── app/
│   ├── api/
│   │   ├── deps.py           # Shared auth, RBAC & IP whitelist dependencies
│   │   └── v1/               # API route handlers
│   │       ├── auth.py
│   │       ├── leads.py
│   │       ├── bookings.py
│   │       ├── admin_masters.py
│   │       ├── admin_roles.py
│   │       ├── admin_settings.py
│   │       ├── admin_custom_fields.py
│   │       ├── activity_log.py
│   │       ├── attendance.py
│   │       ├── files.py
│   │       ├── notes.py
│   │       └── future_credits.py
│   ├── core/
│   │   ├── config.py         # Pydantic v2 settings management
│   │   └── security.py       # Password hashing (bcrypt) & JWT issuance
│   ├── db/
│   │   ├── base.py           # SQLAlchemy DeclarativeBase & metadata
│   │   └── session.py        # Async engine & sessionmaker
│   ├── domain/               # Business domain logic (status engine, permissions, duplicates)
│   ├── models/               # SQLAlchemy ORM models (Leads, Bookings, Users, Roles, Masters)
│   └── schemas/              # Pydantic request/response validation schemas
├── doc/                      # Technical Documentation
│   ├── README.md             # This guide
│   ├── API_REFERENCE.md      # API endpoints & payloads
│   ├── DATABASE_SCHEMA.md    # Schema, relationships & master tables
│   └── RBAC_AND_SECURITY.md  # Permissions, security policies & IP filtering
├── Dockerfile
├── requirements.txt
└── pytest.ini
```

---

## 3. Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL asyncpg connection URI | `postgresql+asyncpg://postgres:postgres@localhost:5432/crm` |
| `REDIS_URL` | Redis instance connection URI | `redis://localhost:6379/0` |
| `SECRET_KEY` | Secret key for JWT signing | `development-secret-key-change-in-production` |
| `ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan | `1440` (24 hours) |

---

## 4. Running the Backend

### Local Environment
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker Compose
```bash
docker compose up backend postgres redis --build
```

---

## 5. Running Automated Tests
```bash
cd backend
.venv\Scripts\pytest -q
```
