# Working Snapshot

Date: 2026-05-23

## Project Shape

- `backend/`: FastAPI API, MongoDB integration, ML artifacts, auth, analytics, chat, graph, notes, downloads, feedback, admin routes.
- `frontend/`: React + Vite app with public auth pages, user dashboard modules, admin modules, API clients, shared layout/components.
- `landing/`: separate optional Vite landing app with its own `package.json`.

## Modules Reviewed

- Public/auth: landing, login, register, forgot/reset password.
- User dashboard: home, query text, query file, history, analytics, paper explorer, summaries, chatbot, notes, collections, downloads, graph, profile, settings.
- Admin: dashboard, analytics, users, API usage, feedback, model performance, abuse, system health, compliance, sessions, notifications, settings, profile.
- Backend service areas: auth, assistant, papers, summaries, graph, analytics, history, notes, collections, downloads, feedback, admin metrics/auth/sessions.

## What Was Verified

- Backend health endpoint responded on `http://127.0.0.1:8000/healthz`.
- Backend ready endpoint responded with `db: true` and `gemini: true`.
- Frontend dev server responded on `http://127.0.0.1:5173`.
- Frontend production build succeeded with `npm run build`.
- Live screenshots were captured from the running app.

## Fix Applied During Verification

- [backend/app/core/security.py](/C:/project_extension_2/research-paper-assistant/backend/app/core/security.py)
  Password hashing was changed to use `pbkdf2_sha256` by default, while keeping `bcrypt` and `argon2` verification support. This fixed the broken register/login flow in the current environment.

## Screenshots Saved

- [01-landing.png](/C:/project_extension_2/research-paper-assistant/artifacts/screenshots/01-landing.png)
- [02-login.png](/C:/project_extension_2/research-paper-assistant/artifacts/screenshots/02-login.png)
- [03-dashboard-home.png](/C:/project_extension_2/research-paper-assistant/artifacts/screenshots/03-dashboard-home.png)
- [04-query-text.png](/C:/project_extension_2/research-paper-assistant/artifacts/screenshots/04-query-text.png)
- [05-analytics.png](/C:/project_extension_2/research-paper-assistant/artifacts/screenshots/05-analytics.png)
- [06-paper-explorer.png](/C:/project_extension_2/research-paper-assistant/artifacts/screenshots/06-paper-explorer.png)
- [07-history.png](/C:/project_extension_2/research-paper-assistant/artifacts/screenshots/07-history.png)
- [08-connected-graph.png](/C:/project_extension_2/research-paper-assistant/artifacts/screenshots/08-connected-graph.png)

## Push Notes

- `landing/` did not build in this run because its local `vite` binary is missing, which indicates dependencies are not installed in that subproject.
- `frontend/` has many existing modified files and a few untracked files; review them before committing.
- `backend/app/storage/uploads/8b73869092f34aa897eb39c0c6f861ea.pdf` is untracked and looks like runtime data, not source.
- `artifacts/screenshots/` is now untracked; keep it only if you want these images in the repository.
