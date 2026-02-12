# How to Run This Project

Quick prerequisites
-------------------
- Python 3.11+
- Node.js + npm
- MongoDB running locally or remotely

Backend (FastAPI)
-----------------
1. `cd backend`
2. Create/activate a virtual environment (recommended; avoids global NumPy/TensorFlow conflicts):
   - `python -m venv venv`
   - `.\venv\Scripts\Activate.ps1`
3. Install deps:
   - `python -m pip install -r requirements.txt`
3. Create `backend/.env` with at least:
```
MONGO_URI=mongodb://localhost:27017
MONGO_DB=research_assistant
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```
4. Start API server:
   - `uvicorn app.main:app --reload --port 8000`
   - If `uvicorn` runs with the wrong Python, use: `python -m uvicorn app.main:app --reload --port 8000`

Frontend (React)
----------------
1. `cd frontend`
2. Install deps:
   - `npm install`
3. Start dev server:
   - `npm run dev`
4. Open:
   - `http://localhost:5173`

Optional services
-----------------
Gemini (chatbot + summaries):
- Create a Gemini API key and set in `backend/.env`:
```
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_SUMMARY_MODEL=gemini-2.5-flash-lite
```

Redis (rate limiting):
- Start Redis and set:
```
REDIS_URL=redis://localhost:6379
```

Notes
-----
- The backend loads ML artifacts from `backend/app/artifacts`.
- The chatbot and summaries work without Gemini, but responses will be limited.
- If you want compliance jobs running, keep `apscheduler` installed.
