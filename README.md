# Research Paper Assistant

This secure research workflow ingests PDFs/DOCX, predicts subject areas using TF-IDF/Keras, tracks PSNR/SSIM, stores histories, lets teams chat via Ollama, exports AES+HMAC summaries, and shares insights via FastAPI/MongoDB APIs backed by a React frontend.

**Core features**
- Text/file (PDF/DOCX) query flow with preprocessing
- Subject area prediction (ML model + embeddings)
- Paper recommendations (Semantic Scholar, Crossref, arXiv, OpenAlex)
- Team chat powered by Ollama + collaborative summaries
- JWT auth, query history, dashboards, and analytics

**Tech stack**
- FastAPI, MongoDB, TensorFlow/Keras, Python services
- React 18, TypeScript, Vite, TailwindCSS, Framer Motion, Radix UI
- Optional landing page (Vite + Tailwind) and Playwright tests

**Project layout**
- `backend/` API, ML services, artifacts, migrations, seed data, scripts
- `frontend/` main dashboard and admin UI plus API clients
- `landing/` marketing site for Research Paper Assistant
- Documentation: `PROJECT_ANALYSIS.md`, `RUNNING.md`, `REQUIRED_FILES.txt`

**Quick start**

1. Backend:
   - `cd backend`
   - `pip install -r requirements.txt`
   - Create `.env` (see configuration below)
   - `uvicorn app.main:app --reload --port 8000`
2. Frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`
   - Open `http://localhost:5173`
3. Landing page (optional):
   - `cd landing`
   - `npm install`
   - `npm run dev`
   - Open `http://localhost:4173`

**Configuration**

Create `backend/.env` with:
```
MONGO_URI=mongodb://…
MONGO_DB=research_assistant
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

**Notes**
- ML artifacts live under `backend/app/artifacts`; consider Git LFS if you must commit them.
- Avoid committing `backend/venv`, `backend/**/__pycache__`, or `frontend/node_modules`.
- Use `PROJECT_ANALYSIS.md` and `RUNNING.md` for detailed architecture and runbooks.

**Support**
- See `PROJECT_ANALYSIS.md` for architecture diagrams and workflow explanations.
