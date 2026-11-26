# CaseWeb – The Detective Investigation Board

CaseWeb is a full-stack fictional mystery investigation and creative case-organization platform. It recreates a classic detective investigation room—complete with corkboard textures, vintage case folders, black-and-white photographs, pushpins, red connecting strings, suspect profiles, evidence archives, and chronological timelines.

> **Fictional & Creative Workspace Notice:** CaseWeb is designed strictly for fictional mysteries, storytelling, tabletop RPGs, and creative case organization—not real-world surveillance or unauthorized personal-data collection.

---

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, React Flow (`@xyflow/react`), Framer Motion, Zustand, Lucide React, React Hook Form, Zod, Axios, `html-to-image`, `jspdf`
- **Backend:** Python FastAPI, SQLAlchemy ORM, Pydantic v2, PostgreSQL, PyJWT, bcrypt, Alembic migrations
- **Storage:** Local validated disk storage (`/uploads`) with a pluggable cloud storage backend (`StorageBackend` in `backend/app/utils/storage.py`)

---

## Project Structure

```text
caseweb/
├── frontend/
│   ├── app/                  # App Router pages (landing, login, register, dashboard, cases, evidence, suspects, timeline, settings)
│   ├── components/
│   │   ├── board/            # React Flow corkboard, 7 custom evidence nodes, red-string edge, modals
│   │   └── ui/               # Workspace shell, navigation, pushpins, toast notifications
│   ├── services/             # Axios API client & typed endpoint helpers
│   ├── store/                # Zustand auth, board, and toast stores
│   ├── types/                # Shared TypeScript interfaces
│   └── public/               # Vintage SVG textures & demo mystery artwork
├── backend/
│   ├── app/
│   │   ├── models/           # SQLAlchemy models (users, cases, evidence, suspects, board, timeline)
│   │   ├── schemas/          # Pydantic v2 request/response schemas
│   │   ├── routers/          # REST API endpoints
│   │   ├── services/         # Business logic & demo mystery seeding
│   │   └── utils/            # Password hashing, JWT helpers, validated file storage
│   ├── alembic/              # Database migrations
│   └── tests/                # Pytest API integration suite
└── docker-compose.yml
```

---

## Core Features

1. **Cinematic Noir Landing Page:** Animated red threads, floating evidence photos, interactive board preview, and pre-registration access to live demo mysteries.
2. **Authentication & Isolation:** Registration, login, JWT bearer auth, bcrypt password hashing, profile updates, password updates, and strict per-user case ownership.
3. **Interactive React Flow Corkboard:**
   - **7 Custom Node Types:** Photograph, Suspect, Victim, Document, Location, Clue, and Timeline cards.
   - **Direct Manipulation:** Drag, pan, zoom, multi-select, resize (`NodeResizer`), rotate/tilt, edit, and delete cards.
   - **Red-String Connections:** Curved crimson threads with pushpin endpoints, editable investigator hypotheses, and multi-connection support.
   - **Persistence & Multi-Board:** Automatic debounced saving, manual Save, Restore baseline, and multiple named boards per case.
4. **Evidence Archive:** Upload validated images/PDFs/text files (MIME + magic-byte checks + size cap), filter by category, search, and pin directly to the board.
5. **Suspect Profiles & Chronological Timeline:** Fictional suspect dossiers with alibis and chronological timelines that highlight conflicting timestamps.
6. **Global Search & Exports:** Search across cases, evidence, suspects, clues, and timeline events; export boards as **PNG**, **PDF summary**, or **JSON**.

---

## Quick Start (Docker Compose)

```bash
cd caseweb
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API & Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432` (`caseweb` / `caseweb_secret` / `caseweb_db`)

---

## Local Development Setup

### 1. Database (PostgreSQL)

Create a PostgreSQL database (or start only Postgres with `docker compose up -d postgres`):

```sql
CREATE USER caseweb WITH PASSWORD 'caseweb_secret';
CREATE DATABASE caseweb_db OWNER caseweb;
```

### 2. Backend (FastAPI + Alembic)

```bash
cd caseweb/backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run PostgreSQL migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000
```

Run backend tests:

```bash
cd caseweb/backend
.venv/bin/python -m pytest -v
```

### 3. Frontend (Next.js)

```bash
cd caseweb/frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## REST API Endpoints

- **Auth & Users:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `GET/PUT /api/users/me`, `PUT /api/users/me/password`
- **Cases:** `GET /api/cases`, `GET /api/cases/demo`, `GET /api/cases/dashboard`, `GET /api/cases/search`, `POST /api/cases`, `GET/PUT/DELETE /api/cases/{case_id}`, `POST /api/cases/{case_id}/clone`, `GET /api/cases/{case_id}/export`
- **Evidence:** `GET/POST /api/cases/{case_id}/evidence`, `PUT/DELETE /api/evidence/{evidence_id}`
- **Suspects:** `GET/POST /api/cases/{case_id}/suspects`, `PUT/DELETE /api/suspects/{suspect_id}`
- **Board:** `GET /api/cases/{case_id}/board`, `POST /api/cases/{case_id}/boards`, `PUT /api/cases/{case_id}/board/save`, `POST /api/cases/{case_id}/board/nodes`, `PUT/DELETE /api/board/nodes/{node_id}`, `POST /api/cases/{case_id}/board/connections`, `PUT/DELETE /api/board/connections/{connection_id}`
- **Timeline:** `GET/POST /api/cases/{case_id}/timeline`, `PUT/DELETE /api/timeline/{event_id}`

---

## Production Deployment (Vercel + Render)

### 1. Backend on Render
A [render.yaml](render.yaml) Blueprint is included at the repository root. You can deploy via **New > Blueprint** on Render, or manually create a **Web Service** + **PostgreSQL** database with:
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/api/health`
- **Environment Variables:**
  - `PYTHON_VERSION`: `3.12.7`
  - `DATABASE_URL`: Render PostgreSQL connection string (`postgres://` and `postgresql://` are automatically normalized to `postgresql+psycopg2://`)
  - `SECRET_KEY`: strong random secret
  - `ENVIRONMENT`: `production`
  - `DEBUG`: `false`
  - `CORS_ORIGINS`: your Vercel production URL (e.g. `https://caseweb.vercel.app`)
  - `CORS_ORIGIN_REGEX`: `https://.*\.vercel\.app` (optional, enables Vercel preview URLs)
  - `STORAGE_BACKEND`: `local` (note: Render free tier disk is ephemeral across deploys; attach a Render Persistent Disk or configure S3-compatible storage for persistent uploads)

### 2. Frontend on Vercel
Import the repository into Vercel and configure:
- **Root Directory:** `frontend`
- **Framework Preset:** Next.js (auto-detected)
- **Environment Variable:**
  - `NEXT_PUBLIC_API_URL`: your Render backend URL (e.g. `https://caseweb-api.onrender.com`, no trailing slash required)
