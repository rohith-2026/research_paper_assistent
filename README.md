# Research Paper Assistant

Full-stack web app that predicts a research subject area from text or
documents and recommends related papers using multiple free APIs.

**Core features**
- Text or file (PDF/DOCX) query flow
- Subject area prediction (ML model)
- Paper recommendations from Semantic Scholar, Crossref, arXiv, OpenAlex
- User accounts, JWT auth, and query history
- Responsive React dashboard UI

**Tech stack**
- Frontend: React 18, TypeScript, Vite, TailwindCSS, Framer Motion
- Backend: FastAPI (Python), MongoDB, Keras/TensorFlow

**Project layout (top-level)**
- `backend/` FastAPI app, ML services, MongoDB access, API routes
- `frontend/` React app, pages, components, API client
- `PROJECT_ANALYSIS.md` Detailed architecture notes

**Quick start**

Backend:
1. `cd backend`
2. `pip install -r requirements.txt`
3. Create `.env` (see Configuration below)
4. `uvicorn app.main:app --reload --port 8000`

Frontend:
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:5173`

**Configuration**

Create `backend/.env` with:
```
MONGO_URI=mongodb://...
MONGO_DB=research_assistant
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

**Notes**
- The ML model artifacts live in `backend/app/artifacts`.
- The app uses free public APIs, so rate limits may apply.
- There are no automated tests included.

**Support**
See `PROJECT_ANALYSIS.md` for detailed architecture and flow diagrams.
