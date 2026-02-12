# Research Paper Assistant - Project Analysis

Analysis Date: February 9, 2026
Project Type: Full-stack web application (research assistant + ML + admin ops)

Summary
-------
This project is a production-leaning research assistant that:
- Predicts a subject area from user text or uploaded PDFs/DOCX files
- Aggregates related papers from free public APIs
- Stores user history, papers, notes, collections, and analytics
- Provides a local LLM-powered chatbot via Ollama
- Includes an admin dashboard for analytics, abuse controls, and compliance tooling

Tech Stack
----------
Frontend:
- React 18, TypeScript, Vite
- TailwindCSS, Framer Motion
- Data viz: ECharts, Recharts
- Graph/3D: d3-force, react-three-fiber + drei
- E2E tooling: Playwright, Cypress (configured in package.json)

Backend:
- FastAPI (Python)
- MongoDB (motor + pymongo)
- ML: Keras/TensorFlow model + TF-IDF vectorizer artifacts
- HTTP: httpx
- Optional Redis for rate limiting
- Optional Ollama for local LLM chat

Top-Level Structure
-------------------
- backend/   FastAPI app, ML services, repositories, middleware
- frontend/  React app (user + admin dashboards)
- PROJECT_ANALYSIS.md  (this document)
- README.md / README.txt  setup and overview

Backend Architecture
--------------------
Entry point:
- backend/app/main.py
  - Loads models and vectorizers at startup
  - Ensures MongoDB indexes
  - Spawns periodic system health snapshots
  - Optional compliance scheduler (APScheduler)
  - Mounts /uploads for file serving

Middleware:
- CORS for localhost dev origins
- BlockIpMiddleware: checks blocked IPs in MongoDB
- RateLimitMiddleware: in-memory or Redis-based throttling

Authentication:
- User JWT access + refresh tokens
- Admin JWT access tokens with optional IP allowlist
- Password reset flow (tokens stored in MongoDB)

API Surface (route prefixes)
----------------------------
User-facing:
- /auth
  - Register, login, refresh, logout, logout-all
  - Me, usage, export data
  - Preferences (analytics opt-out)
  - Delete account / delete data
  - Forgot/reset password

- /assistant
  - Quick analyze (text or file)
  - Full pipeline query (text or file)
  - History list + delete

- /papers
  - Save paper, list saved, list by query, get detail

- /history
  - History list + detail + delete

- /summaries
  - Generate paper summaries (short/detailed)
  - List summaries by query + paper

- /graph
  - Build graph from query
  - Graph for paper and neighbors

- /chat
  - Chat sessions and messages
  - Ask chatbot (Ollama-backed)

- /notes
  - CRUD notes per paper

- /collections
  - CRUD collections
  - Add/remove items in collections

- /downloads
  - Record and list downloads

- /feedback
  - Create feedback
  - Upload attachments
  - List feedback

- /analytics
  - Overview, subjects, confidence, API usage

- /api-usage
  - Per-user API usage stats

- /sessions
  - User session threads with messages (non-chatbot)

Admin:
- /admin/auth
  - Admin login/logout, profile, API keys, MFA, IP allowlist
  - Session management and security alerts

- /admin
  - Dashboard KPIs, global analytics, users management
  - API usage, feedback, model performance
  - Abuse detection and blocking
  - System health and settings
  - Compliance workflows (PII scans, access reviews, purge runs)

- /admin/user-sessions
  - Admin view of user sessions

Core Services
-------------
ML + Search:
- VectorizerService: TF-IDF transform
- ModelService: Keras model loader + inference
- AssistantService: main pipeline (predict + search + persist + analytics)
- PaperAggregatorService: weighted, deduped multi-source paper search
- PaperSearchService: direct 4-source API queries

Chat + Summaries:
- ChatbotService: local Ollama chat with context (papers, summaries, notes, graph)
- SummaryService: deterministic summarization (truncation, not LLM)

Knowledge Graph:
- PaperGraphService: builds graph edges using
  - Keyword overlap
  - Hash-based cosine similarity
  - Author overlap
  - Year proximity

Content + UX:
- File services: PDF/DOCX extraction
- Notes, Collections, Downloads, Feedback
- Analytics and API usage tracking
- Admin metrics and compliance checks

Data Model (MongoDB Collections)
-------------------------------
User and Auth:
- users
- refresh_tokens
- password_resets
- admin_users
- admin_sessions
- admin_auth_sessions
- admin_api_keys
- admin_ip_allowlist

Assistant + Content:
- queries
- papers
- paper_summaries
- notes
- collections
- collection_items
- downloads
- feedback

Chat:
- chat_sessions
- chat_messages

Analytics and Ops:
- analytics_events
- api_usage
- admin_audit_logs
- abuse_flags
- blocked_ips
- system_health_snapshots
- system_health_meta
- admin_settings

Compliance:
- compliance_badges
- compliance_badge_history
- compliance_access_reviews
- compliance_purge_runs
- compliance_pii_scans
- compliance_policies
- compliance_policy_ack
- compliance_jobs
- compliance_job_runs

Machine Learning Pipeline
-------------------------
Artifacts:
- backend/app/artifacts/shallow_mlp_model.keras
- backend/app/artifacts/text_vectorizer_*.pkl
- backend/app/artifacts/saved_pickles/*

Flow:
1) User submits text or file
2) Text is vectorized (TF-IDF)
3) Keras model predicts top-K subject areas
4) PaperAggregatorService searches 4 providers
5) Results are deduped and ranked
6) Query + papers are stored in MongoDB

Chatbot and Summaries
---------------------
Chatbot:
- Uses Ollama local inference
- Context includes recent messages, summaries, notes, graph edges
- Enforced system prompt to avoid hallucinations

Summaries:
- Short or detailed summaries
- Current implementation returns truncated source text
- Summaries are stored per user, query, and paper

Frontend Architecture
---------------------
Public routes:
- /, /login, /register, /forgot-password, /reset-password

Dashboard routes:
- Query text/file, results, history
- Paper explorer, paper detail, paper summary
- Analytics, API usage
- Chatbot, notes, collections, downloads, feedback
- Graph visualization
- Profile and settings

Admin routes:
- Login, dashboard analytics
- User management and user analytics
- Abuse signals and system health
- Compliance tooling and audit logs
- Admin settings, sessions, and profile

Frontend data access:
- Axios instances for user and admin APIs
- JWT token storage in localStorage
- Route guards for public, protected, and admin paths

Configuration and Environment
-----------------------------
Backend required:
- MONGO_URI
- MONGO_DB
- JWT_SECRET
- JWT_ALGORITHM
- ACCESS_TOKEN_EXPIRE_MINUTES
- REFRESH_TOKEN_EXPIRE_DAYS

Backend optional:
- GEMINI_API_KEY
- GEMINI_API_BASE
- GEMINI_MODEL
- GEMINI_SUMMARY_MODEL
- SUMMARY_MODEL
- REDIS_URL
- TRUST_PROXY_HEADERS
- BLOCK_IP_CACHE_TTL
- DISABLE_BLOCK_IP
- SYSTEM_HEALTH_SNAPSHOT_INTERVAL_SECONDS
- CHATBOT_MAX_CONTEXT_CHARS
- CHATBOT_MAX_MESSAGES
- CHATBOT_MAX_SESSION_MESSAGES

Frontend:
- frontend/.env exists (likely API base URL and feature flags)

Operational Notes
-----------------
- Rate limiting uses in-memory counters unless REDIS_URL is set.
- IP blocking uses MongoDB collection blocked_ips.
- System health snapshots are recorded periodically.
- Summaries are deterministic, not LLM-powered.
- Ollama is optional but used for the chatbot if available.
- No unit/integration tests are present in the repo; E2E scripts exist.

Potential Gaps / Improvement Areas
----------------------------------
- Add real summarization (LLM or extractive) if desired.
- Add backend tests and CI coverage.
- Harden file upload limits and validation.
- Introduce caching and retries for external paper APIs.
- Improve observability (structured logs, tracing).

End of Analysis
