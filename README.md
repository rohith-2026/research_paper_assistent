# Research Paper Assistant

Research Paper Assistant is a full-stack web application for searching, organizing, analyzing, and discussing research papers. It combines a FastAPI backend, a React frontend, MongoDB storage, ML-based subject prediction, paper exploration tools, summaries, notes, downloads, analytics, and admin monitoring features.

This repository currently contains three main parts:

- `backend/` - FastAPI API, auth, database access, ML services, analytics, graph and summary endpoints
- `frontend/` - main user dashboard and admin interface built with React, TypeScript, and Vite
- `landing/` - optional separate landing page app

## What The Project Does

Users can:

- register and log in
- search papers by text query
- upload files such as PDF or DOCX
- get predicted subject areas from the ML pipeline
- browse paper recommendations
- save papers for later
- create notes and collections
- generate summaries
- use the chatbot workflow
- review history, downloads, analytics, and graph views

Admins can:

- access admin login and protected admin pages
- review analytics and API usage
- inspect feedback and sessions
- view compliance and system health areas
- manage operational visibility for the platform

## Tech Stack

Backend:

- FastAPI
- MongoDB with Motor/PyMongo
- TensorFlow / Keras
- JWT-based authentication
- Python 3.11

Frontend:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Playwright for end-to-end testing

Optional integrations:

- Gemini API for richer summary/chat behavior
- Redis for rate limiting

## Repository Structure

```text
research-paper-assistant/
├─ backend/                     # FastAPI backend and ML services
│  ├─ app/
│  │  ├─ api/                   # Route handlers
│  │  ├─ core/                  # Config, security, shared internals
│  │  ├─ db/                    # Mongo connection, schema, indexes
│  │  ├─ middleware/            # Security, rate limit, IP blocking
│  │  ├─ repositories/          # Data access layer
│  │  ├─ schemas/               # Request / response models
│  │  ├─ services/              # Business logic
│  │  └─ artifacts/             # ML artifacts
├─ frontend/                    # Main product UI
│  ├─ src/
│  │  ├─ admin/
│  │  ├─ api/
│  │  ├─ auth/
│  │  ├─ components/
│  │  ├─ pages/
│  │  ├─ routes/
│  │  └─ styles/
├─ landing/                     # Optional separate landing app
├─ screenshorts/                # Image references committed for GitHub
├─ RUNNING.md                   # Extra setup notes
└─ WORKING_SNAPSHOT.md          # Current verification snapshot
```

## Main Frontend Modules

Public and auth pages:

- landing page
- login
- register
- forgot password
- reset password

User dashboard pages:

- home
- query text
- query file
- query results
- history
- analytics
- paper explorer
- paper detail
- paper summary
- chatbot
- notes
- collections
- downloads
- feedback
- connected graph
- profile
- settings

Admin pages:

- admin dashboard
- admin analytics
- users
- user analytics
- API usage
- feedback
- model performance
- abuse
- system health
- roles and access
- audit log
- notifications
- safety review
- sessions
- compliance
- profile
- settings

## Backend Functional Areas

- authentication and user session handling
- admin authentication and admin metrics
- paper search and recommendation routes
- assistant and chatbot services
- summaries and notes
- downloads and collections
- analytics and graph endpoints
- feedback capture
- database schema and index management
- security middleware and rate limiting

## Screenshots

The repository includes image references in the committed `screenshorts/` folder. These can be used in GitHub documentation, reports, or presentations.

Current image folder:

- `screenshorts/`

Additional generated verification screenshots:

- `artifacts/screenshots/`

## Prerequisites

Install these before running the project:

- Python 3.11+
- Node.js 20+
- npm
- MongoDB

Recommended on Windows:

- PowerShell
- a Python virtual environment for backend dependencies

## Quick Start

### 1. Start the backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Backend base URL:

- `http://127.0.0.1:8000`

Useful backend health endpoints:

- `http://127.0.0.1:8000/healthz`
- `http://127.0.0.1:8000/healthz/ready`

### 2. Start the frontend

Open a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

- `http://127.0.0.1:5173`

### 3. Optional landing app

```powershell
cd landing
npm install
npm run dev
```

Note:

- the `landing/` app is optional
- if `vite` is not found there, dependencies were not installed in that subproject yet

## Environment Configuration

Create `backend/.env` with at least:

```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB=research_assistant
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

Optional Gemini configuration:

```env
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_SUMMARY_MODEL=gemini-2.5-flash-lite
```

Optional Redis configuration:

```env
REDIS_URL=redis://localhost:6379
```

## How To Use The App

Typical user flow:

1. Start backend and frontend.
2. Open the frontend in the browser.
3. Register a new account or log in.
4. Go to `Query Text` or `Query File`.
5. Search papers or upload a document.
6. Save useful papers.
7. Open summaries, notes, downloads, collections, or graph views.
8. Use analytics and history to review previous activity.

Typical admin flow:

1. Open the admin login route.
2. Sign in with admin credentials.
3. Review analytics, sessions, feedback, API usage, and system health pages.

## Verified Working State

During the latest local verification on 2026-05-23:

- backend health endpoint responded successfully
- backend ready endpoint returned `db: true` and `gemini: true`
- frontend dev server loaded successfully
- frontend production build completed successfully
- working screenshots were captured from the live app

See [WORKING_SNAPSHOT.md](/C:/project_extension_2/research-paper-assistant/WORKING_SNAPSHOT.md) for the detailed verification log.

## Important Notes For Contributors

- do not commit `backend/venv`, `frontend/node_modules`, or `landing/node_modules`
- do not commit `frontend/dist` or temporary runtime artifacts unless intentional
- ML files under `backend/app/artifacts` can be large
- runtime upload files under `backend/app/storage/uploads/` should be reviewed before committing

## Common Commands

Backend:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm run dev
npm run build
```

Frontend tests:

```powershell
cd frontend
npm run test:e2e
```

## Documentation Files

- `RUNNING.md` - setup and run instructions
- `WORKING_SNAPSHOT.md` - latest verified project snapshot
- `PROJECT_ANALYSIS.md` - architecture and project analysis
- `SECURITY_REPORT.md` - security-related notes if present

## GitHub Image References

Because the `screenshorts/` folder is committed, you can reference images directly from GitHub after pushing.

Example markdown pattern:

```md
![Dashboard](./screenshorts/Screenshot%202026-03-13%20121619.png)
```

If you want cleaner image links in documentation, rename the image files to short descriptive names such as:

- `dashboard-home.png`
- `query-text.png`
- `analytics.png`

## Current Status

The repository is active and contains many modified source files across backend and frontend. If you are preparing a clean release, review `git status` carefully before creating a final release commit.
