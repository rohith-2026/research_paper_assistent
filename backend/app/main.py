import os
import logging
import asyncio
from datetime import datetime
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logger import setup_logging   # OK FIX: correct function name
from app.core.time_utils import now_ist

from app.db.indexes import ensure_indexes
from app.db.schema_and_indexes import ensure_schema_and_indexes
from app.db.mongo import get_db

from app.api.routes.auth import router as auth_router
from app.api.routes.assistant import router as assistant_router
from app.api.routes.papers import router as papers_router   # OK include papers api

from app.services.vectorizer_service import VectorizerService
from app.services.model_service import ModelService
from app.services.assistant_service import AssistantService
from app.api.routes import chatbot
from app.api.routes import analytics
from app.api.routes import graph
from app.api.routes import summaries
from app.api.routes import history
from app.api.routes import notes
from app.api.routes import collections
from app.api.routes import collection_items
from app.api.routes import downloads
from app.api.routes import feedback
from app.api.routes import api_usage
from app.api.routes import admin_sessions
from app.api.routes import admin_auth
from app.api.routes import admin_metrics
from app.services.admin_metrics_service import AdminMetricsService








# OK 1) setup logging first
setup_logging(level="INFO")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application...")
    app.state.started_at = now_ist()
    await ensure_schema_and_indexes()
    await ensure_indexes()
    vectorizer_service.load()
    model_service.load()
    await _log_gemini_status()
    interval = int(os.getenv("SYSTEM_HEALTH_SNAPSHOT_INTERVAL_SECONDS", "300"))
    service = AdminMetricsService()
    try:
        db = get_db()
        await db["system_health_meta"].update_one(
            {"_id": "restart_count"},
            {"$inc": {"value": 1}, "$set": {"updated_at": now_ist()}},
            upsert=True,
        )
    except Exception:
        logger.exception("Failed to update restart counter")

    async def _snapshot_loop():
        while True:
            try:
                await service.record_system_health_snapshot()
            except Exception:
                logger.exception("Failed to record system health snapshot")
            await asyncio.sleep(interval)

    app.state.health_task = asyncio.create_task(_snapshot_loop())
    scheduler = None
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        scheduler = AsyncIOScheduler()

        async def _compliance_job_tick():
            try:
                await service.process_compliance_jobs()
            except Exception:
                logger.exception("Failed to process compliance jobs")

        scheduler.add_job(_compliance_job_tick, "interval", seconds=60)
        scheduler.start()
        app.state.compliance_scheduler = scheduler
    except Exception:
        logger.exception("APScheduler not available; compliance jobs disabled")
    try:
        interval_minutes = int(os.getenv("COMPLIANCE_SCAN_INTERVAL_MINUTES", "30"))
        schedule = f"{max(1, interval_minutes)}m"
        await service.ensure_default_compliance_jobs(schedule)
    except Exception:
        logger.exception("Failed to ensure default compliance jobs")
    logger.info("Startup completed OK")
    yield
    task = getattr(app.state, "health_task", None)
    if task:
        task.cancel()
        try:
            await task
        except Exception:
            pass
    sched = getattr(app.state, "compliance_scheduler", None)
    if sched:
        sched.shutdown(wait=False)


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)
app.state.started_at = None
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# OK 2) middleware
allow_all = os.getenv("CORS_ALLOW_ALL", "").lower() in {"1", "true", "yes"} or settings.ENV == "dev"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=None if allow_all else r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from app.middleware.block_ip import BlockIpMiddleware
app.add_middleware(
    BlockIpMiddleware,
    exclude_paths=["/healthz", "/healthz/ready", "/metrics"],
)
from app.middleware.rate_limit import RateLimitMiddleware
app.add_middleware(
    RateLimitMiddleware,
    max_requests=200,
    window_seconds=60,
    include_paths=[
        "/chat/message",
        "/summaries/generate",
        "/graph/query",
        "/graph/paper",
        "/graph/neighbors",
    ],
)

# OK 3) routers
app.include_router(auth_router)
app.include_router(assistant_router)
app.include_router(papers_router)   # OK FIX: now papers api works
app.include_router(chatbot.router)
app.include_router(analytics.router)
app.include_router(graph.router)
app.include_router(summaries.router)
app.include_router(history.router)
app.include_router(notes.router)
app.include_router(collections.router)
app.include_router(collection_items.router)
app.include_router(downloads.router)
app.include_router(feedback.router)
app.include_router(api_usage.router)
app.include_router(admin_sessions.router)
app.include_router(admin_auth.router)
app.include_router(admin_metrics.router)
# OK 4) services
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

vectorizer_service = VectorizerService(ARTIFACTS_DIR)
model_service = ModelService(ARTIFACTS_DIR)
assistant_service = AssistantService(model_service, vectorizer_service)


async def _log_gemini_status():
    base = settings.GEMINI_API_BASE or "https://generativelanguage.googleapis.com/v1beta"
    model = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
    if not settings.GEMINI_API_KEY:
        logger.warning("Gemini API key not configured.")
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base}/models", params={"key": settings.GEMINI_API_KEY})
            resp.raise_for_status()
        logger.info("Gemini API reachable | Model: %s | Base: %s", model, base)
    except Exception:
        logger.warning("Gemini API not reachable at %s", base)


@app.get("/")
def root():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/healthz")
def healthz():
    return {"status": "ok", "app": settings.APP_NAME}

@app.get("/healthz/ready")
async def healthz_ready():
    db_ok = False
    gemini_ok = False
    base = settings.GEMINI_API_BASE or "https://generativelanguage.googleapis.com/v1beta"
    try:
        db = get_db()
        await db.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    try:
        if settings.GEMINI_API_KEY:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{base}/models", params={"key": settings.GEMINI_API_KEY})
                resp.raise_for_status()
            gemini_ok = True
        else:
            gemini_ok = False
    except Exception:
        gemini_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "app": settings.APP_NAME,
        "db": db_ok,
        "gemini": gemini_ok,
    }


@app.get("/metrics")
def metrics():
    started_at = app.state.started_at
    uptime_seconds = None
    if started_at:
        uptime_seconds = int((now_ist() - started_at).total_seconds())
    return {
        "app": settings.APP_NAME,
        "uptime_seconds": uptime_seconds,
    }
