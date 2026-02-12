from datetime import datetime, timedelta
from email.message import EmailMessage
import smtplib
from bson import ObjectId

from app.db.mongo import get_db
from app.core.security import now_utc
from app.core.time_utils import now_ist
from app.core.config import settings
from app.services.admin_settings_service import AdminSettingsService
import httpx
import os
import shutil
import time
try:
    import redis.asyncio as redis
except Exception:  # pragma: no cover
    redis = None

_STARTED_AT = now_utc()


class AdminMetricsService:
    def __init__(self, db=None):
        self._db = db if db is not None else get_db()
        self.users = self._db["users"]
        self.queries = self._db["queries"]
        self.papers = self._db["papers"]
        self.notes = self._db["notes"]
        self.downloads = self._db["downloads"]
        self.feedback = self._db["feedback"]
        self.analytics_events = self._db["analytics_events"]
        self.api_usage_col = self._db["api_usage"]
        self.refresh_tokens = self._db["refresh_tokens"]
        self.abuse_flags = self._db["abuse_flags"]
        self.blocked_ips = self._db["blocked_ips"]
        self.system_health_snapshots = self._db["system_health_snapshots"]
        self.compliance_badges = self._db["compliance_badges"]
        self.compliance_badge_history = self._db["compliance_badge_history"]
        self.compliance_access_reviews = self._db["compliance_access_reviews"]
        self.compliance_purge_runs = self._db["compliance_purge_runs"]
        self.compliance_pii_scans = self._db["compliance_pii_scans"]
        self.compliance_error_scans = self._db["compliance_error_scans"]
        self.compliance_db_scans = self._db["compliance_db_scans"]
        self.compliance_api_scans = self._db["compliance_api_scans"]
        self.compliance_frontend_scans = self._db["compliance_frontend_scans"]
        self.compliance_dependency_scans = self._db["compliance_dependency_scans"]
        self.compliance_storage_scans = self._db["compliance_storage_scans"]
        self.compliance_auth_scans = self._db["compliance_auth_scans"]
        self.compliance_policies = self._db["compliance_policies"]
        self.compliance_policy_ack = self._db["compliance_policy_ack"]
        self.compliance_jobs = self._db["compliance_jobs"]
        self.compliance_job_runs = self._db["compliance_job_runs"]
        self.admin_users = self._db["admin_users"]
        self.paper_summaries = self._db["paper_summaries"]
        self.admin_auth_sessions = self._db["admin_auth_sessions"]
        self.admin_api_keys = self._db["admin_api_keys"]
        self.admin_settings = self._db["admin_settings"]

    async def dashboard(self, range_days: int = 30) -> dict:
        totals = {
            "users": await self.users.count_documents({}),
            "queries": await self.queries.count_documents({}),
            "papers": await self.papers.count_documents({}),
            "notes": await self.notes.count_documents({}),
            "downloads": await self.downloads.count_documents({}),
            "feedback": await self.feedback.count_documents({}),
            "active_sessions": await self.refresh_tokens.count_documents({"revoked": {"$ne": True}}),
        }
        open_flags = await self.abuse_flags.count_documents({"resolved": {"$ne": True}})
        last_24h = now_utc() - timedelta(hours=24)
        recent_feedback = await self.feedback.count_documents({"created_at": {"$gte": last_24h}})

        kpi = await self._kpi_trends(range_days=range_days)
        activity = await self._top_user_activity()
        heatmap = await self._daily_query_counts(days=range_days)
        at_risk = await self._top_api_users(limit=8)
        audit = await self._recent_admin_actions(limit=8)
        system = await self.system_health()

        alerts = {
            "open_abuse_flags": open_flags,
            "recent_feedback": recent_feedback,
        }
        return {
            "totals": totals,
            "alerts": alerts,
            "kpi": kpi,
            "top_users": activity,
            "heatmap": heatmap,
            "range_days": range_days,
            "at_risk": at_risk,
            "audit": audit,
            "system": system,
        }

    async def global_analytics(self, range_days: int = 30) -> dict:
        avg_conf = await self._avg_confidence_range(range_days=range_days)
        top_subjects = await self._top_subjects_range(range_days=range_days)
        usage_daily = await self._daily_query_counts(days=range_days)
        confidence_daily = await self._daily_confidence_range(range_days=range_days)
        confidence_hist = await self._confidence_histogram_range(range_days=range_days)
        top_queries = await self._top_queries_range(range_days=range_days)
        subject_trends = await self._subject_trends_range(range_days=range_days)
        api_breakdown = await self._api_usage_range(range_days=range_days)
        active_users = await self._active_users_range(range_days=range_days)
        retention = await self._retention_snapshot(range_days=range_days)
        drift = self._confidence_drift(confidence_daily)
        return {
            "avg_confidence": avg_conf,
            "top_subjects": top_subjects,
            "usage_daily": usage_daily,
            "range_days": range_days,
            "confidence_daily": confidence_daily,
            "confidence_histogram": confidence_hist,
            "confidence_drift": drift,
            "top_queries": top_queries,
            "subject_trends": subject_trends,
            "api_breakdown": api_breakdown,
            "active_users": active_users,
            "retention_snapshot": retention,
        }

    async def _avg_confidence(self) -> float:
        pipeline = [
            {"$match": {"confidence": {"$ne": None}}},
            {"$group": {"_id": None, "avg": {"$avg": "$confidence"}}},
        ]
        res = await self.queries.aggregate(pipeline).to_list(1)
        return round(res[0]["avg"], 4) if res else 0.0

    async def _avg_confidence_range(self, range_days: int = 30) -> float:
        start = now_ist() - timedelta(days=range_days)
        pipeline = [
            {"$match": {"confidence": {"$ne": None}, "created_at": {"$gte": start}}},
            {"$group": {"_id": None, "avg": {"$avg": "$confidence"}}},
        ]
        res = await self.queries.aggregate(pipeline).to_list(1)
        return round(res[0]["avg"], 4) if res else 0.0

    async def _top_subjects(self, limit: int = 6) -> list[dict]:
        pipeline = [
            {"$match": {"subject_area": {"$ne": None}}},
            {"$group": {"_id": "$subject_area", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        rows = await self.queries.aggregate(pipeline).to_list(limit)
        return [{"subject": r["_id"], "count": r["count"]} for r in rows if r["_id"]]

    async def _top_subjects_range(self, range_days: int = 30, limit: int = 6) -> list[dict]:
        start = now_ist() - timedelta(days=range_days)
        pipeline = [
            {"$match": {"subject_area": {"$ne": None}, "created_at": {"$gte": start}}},
            {"$group": {"_id": "$subject_area", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        rows = await self.queries.aggregate(pipeline).to_list(limit)
        return [{"subject": r["_id"], "count": r["count"]} for r in rows if r["_id"]]

    async def _daily_confidence_range(self, range_days: int = 30):
        start = now_ist() - timedelta(days=range_days)
        pipeline = [
            {"$match": {"created_at": {"$gte": start}, "confidence": {"$ne": None}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                    },
                    "avg": {"$avg": "$confidence"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        rows = await self.queries.aggregate(pipeline).to_list(None)
        return [
            {"date": r["_id"], "avg": round(r["avg"], 4), "count": r["count"]} for r in rows
        ]

    def _confidence_drift(self, daily: list[dict]) -> dict:
        if len(daily) < 2:
            return {"delta": 0.0, "trend": "flat"}
        start = daily[0]["avg"]
        end = daily[-1]["avg"]
        delta = round(end - start, 4)
        trend = "up" if delta > 0 else "down" if delta < 0 else "flat"
        return {"delta": delta, "trend": trend}

    async def _confidence_histogram_range(self, range_days: int = 30):
        start = now_ist() - timedelta(days=range_days)
        pipeline = [
            {"$match": {"confidence": {"$ne": None}, "created_at": {"$gte": start}}},
            {
                "$bucket": {
                    "groupBy": "$confidence",
                    "boundaries": [0, 0.2, 0.4, 0.6, 0.8, 1.01],
                    "default": "other",
                    "output": {"count": {"$sum": 1}},
                }
            },
        ]
        rows = await self.queries.aggregate(pipeline).to_list(None)
        out = []
        for r in rows:
            out.append({"bucket": r["_id"], "count": r["count"]})
        return out

    async def _top_queries_range(self, range_days: int = 30, limit: int = 10):
        start = now_ist() - timedelta(days=range_days)
        pipeline = [
            {"$match": {"created_at": {"$gte": start}}},
            {
                "$project": {
                    "q": {
                        "$ifNull": [
                            "$subject_area",
                            {"$ifNull": ["$text", "$input_text"]},
                        ]
                    }
                }
            },
            {"$match": {"q": {"$ne": None}}},
            {"$group": {"_id": "$q", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        rows = await self.queries.aggregate(pipeline).to_list(limit)
        return [{"query": r["_id"], "count": r["count"]} for r in rows if r["_id"]]

    async def _subject_trends_range(self, range_days: int = 30, limit: int = 6):
        start = now_ist() - timedelta(days=range_days)
        pipeline = [
            {"$match": {"subject_area": {"$ne": None}, "created_at": {"$gte": start}}},
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                        "subject": "$subject_area",
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": limit * 30},
        ]
        rows = await self.queries.aggregate(pipeline).to_list(None)
        out = {}
        for r in rows:
            subject = r["_id"]["subject"]
            date = r["_id"]["date"]
            out.setdefault(subject, []).append({"date": date, "count": r["count"]})
        return out

    async def _api_usage_range(self, range_days: int = 30):
        start = now_ist() - timedelta(days=range_days)
        start_date = start.strftime("%Y-%m-%d")
        pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {"$group": {"_id": "$endpoint", "count": {"$sum": "$count"}}},
            {"$sort": {"count": -1}},
        ]
        rows = await self.api_usage_col.aggregate(pipeline).to_list(None)
        return [{"endpoint": r["_id"], "count": r["count"]} for r in rows]

    async def _active_users_range(self, range_days: int = 30):
        start = now_ist() - timedelta(days=range_days)
        pipeline = [
            {"$match": {"created_at": {"$gte": start}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                    },
                    "users": {"$addToSet": "$user_id"},
                }
            },
            {"$project": {"count": {"$size": "$users"}}},
            {"$sort": {"_id": 1}},
        ]
        rows = await self.queries.aggregate(pipeline).to_list(None)
        return [{"date": r["_id"], "count": r["count"]} for r in rows]

    async def _retention_snapshot(self, range_days: int = 30):
        start = now_ist() - timedelta(days=range_days)
        pipeline_users = [
            {"$match": {"created_at": {"$gte": start}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                    },
                    "new_users": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        pipeline_active = [
            {"$match": {"created_at": {"$gte": start}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                    },
                    "users": {"$addToSet": "$user_id"},
                }
            },
            {"$project": {"active_users": {"$size": "$users"}}},
            {"$sort": {"_id": 1}},
        ]
        new_users = await self.users.aggregate(pipeline_users).to_list(None)
        active = await self.queries.aggregate(pipeline_active).to_list(None)
        active_map = {a["_id"]: a["active_users"] for a in active}
        out = []
        for r in new_users:
            out.append(
                {
                    "date": r["_id"],
                    "new_users": r["new_users"],
                    "active_users": active_map.get(r["_id"], 0),
                }
            )
        return out

    async def _daily_query_counts(self, days: int = 14):
        start = now_ist() - timedelta(days=days)
        pipeline = [
            {"$match": {"created_at": {"$gte": start}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        return await self.queries.aggregate(pipeline).to_list(None)

    async def list_users(
        self,
        page: int = 1,
        limit: int = 25,
        search: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
        sort_by: str | None = None,
        sort_dir: str | None = None,
    ):
        skip = max(page - 1, 0) * limit
        query = {}
        if search:
            query["$or"] = [
                {"email": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
            ]
        if role:
            query["role"] = role
        if is_active is not None:
            query["is_active"] = is_active

        users = await self.users.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        user_ids = [u["_id"] for u in users]
        if user_ids:
            query_counts = await self._count_by_user(self.queries, user_ids)
            paper_counts = await self._count_by_user(self.papers, user_ids)
            activity = await self._activity_by_user(user_ids=user_ids, days=7)
        else:
            query_counts = {}
            paper_counts = {}
            activity = {}

        out = []
        for u in users:
            uid = u["_id"]
            out.append(
                {
                    "id": str(uid),
                    "name": u.get("name"),
                    "email": u.get("email"),
                    "role": u.get("role"),
                    "created_at": u.get("created_at"),
                    "last_login_at": u.get("last_login_at"),
                    "queries": query_counts.get(uid, 0),
                    "papers": paper_counts.get(uid, 0),
                    "is_active": u.get("is_active", True),
                    "activity": activity.get(uid, []),
                }
            )
        total = await self.users.count_documents(query)

        # Optional sort in-memory for metrics
        if sort_by in {"queries", "papers", "last_login_at", "created_at"}:
            reverse = (sort_dir or "desc").lower() == "desc"
            out.sort(key=lambda x: x.get(sort_by) or 0, reverse=reverse)
        return {"items": out, "page": page, "limit": limit, "total": total}

    async def user_analytics(self, user_id: str) -> dict:
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")
        uid = ObjectId(user_id)
        user = await self.users.find_one({"_id": uid})
        if not user:
            raise ValueError("User not found")
        counts = {
            "queries": await self.queries.count_documents({"user_id": uid}),
            "papers": await self.papers.count_documents({"user_id": uid}),
            "notes": await self.notes.count_documents({"user_id": uid}),
            "downloads": await self.downloads.count_documents({"user_id": uid}),
        }
        activity_map = await self._activity_by_user(user_ids=[uid], days=14)
        return {
            "profile": {
                "id": str(uid),
                "name": user.get("name"),
                "email": user.get("email"),
                "created_at": user.get("created_at"),
                "last_login_at": user.get("last_login_at"),
            },
            "counts": counts,
            "activity": activity_map.get(uid, []),
        }

    async def api_usage(self, range_days: int = 30):
        start = now_ist() - timedelta(days=range_days)
        start_date = start.strftime("%Y-%m-%d")
        pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {"$group": {"_id": "$endpoint", "count": {"$sum": "$count"}}},
            {"$sort": {"count": -1}},
        ]
        rows = await self.api_usage_col.aggregate(pipeline).to_list(None)

        daily_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {"$group": {"_id": "$date", "count": {"$sum": "$count"}}},
            {"$sort": {"_id": 1}},
        ]
        daily_rows = await self.api_usage_col.aggregate(daily_pipeline).to_list(None)

        top_users = await self._top_api_users(limit=10, range_days=range_days)
        status_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {
                "$group": {
                    "_id": None,
                    "status_2xx": {"$sum": {"$ifNull": ["$status_2xx", 0]}},
                    "status_4xx": {"$sum": {"$ifNull": ["$status_4xx", 0]}},
                    "status_5xx": {"$sum": {"$ifNull": ["$status_5xx", 0]}},
                    "total_latency_ms": {"$sum": {"$ifNull": ["$total_latency_ms", 0]}},
                    "total_requests": {"$sum": {"$ifNull": ["$count", 0]}},
                }
            },
        ]
        status_rows = await self.api_usage_col.aggregate(status_pipeline).to_list(1)
        status_breakdown = None
        latency_avg_ms = None
        if status_rows:
            sr = status_rows[0]
            status_breakdown = {
                "2xx": int(sr.get("status_2xx", 0)),
                "4xx": int(sr.get("status_4xx", 0)),
                "5xx": int(sr.get("status_5xx", 0)),
            }
            total_requests = int(sr.get("total_requests", 0)) or 0
            if total_requests:
                latency_avg_ms = int(sr.get("total_latency_ms", 0) / total_requests)

        model_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {"$project": {"models": {"$objectToArray": {"$ifNull": ["$model_tokens", {}]}}}},
            {"$unwind": "$models"},
            {"$group": {"_id": "$models.k", "tokens": {"$sum": "$models.v"}}},
            {"$sort": {"tokens": -1}},
        ]
        model_rows = await self.api_usage_col.aggregate(model_pipeline).to_list(None)
        model_usage = [{"model": r["_id"], "tokens": int(r["tokens"])} for r in model_rows]

        geo = [{"region": "Unknown", "share": 100}] if daily_rows else []

        abuse_signals = []
        if daily_rows:
            counts = [r["count"] for r in daily_rows]
            avg = sum(counts) / max(len(counts), 1)
            latest = counts[-1] if counts else 0
            spike = "High" if latest > avg * 1.8 else "Moderate" if latest > avg * 1.3 else "Low"
            abuse_signals = [
                {"label": "Spike detection", "value": spike},
                {"label": "Bot patterns", "value": "Low"},
                {"label": "Credential stuffing", "value": "None"},
                {"label": "IP concentration", "value": "Unknown"},
            ]

        return {
            "range_days": range_days,
            "endpoints": [{"endpoint": r["_id"], "count": r["count"]} for r in rows],
            "daily": [{"date": r["_id"], "count": r["count"]} for r in daily_rows],
            "top_users": top_users,
            "status_breakdown": status_breakdown,
            "latency_avg_ms": latency_avg_ms,
            "model_usage": model_usage,
            "geo": geo,
            "abuse_signals": abuse_signals,
        }

    async def feedback_list(self, limit: int = 50):
        rows = await self.feedback.find({}).sort("created_at", -1).limit(limit).to_list(limit)
        out = []
        for r in rows:
            out.append(
                {
                    "id": str(r["_id"]),
                    "user_id": str(r.get("user_id")) if r.get("user_id") else None,
                    "type": r.get("type"),
                    "message": r.get("message"),
                    "attachments": r.get("attachments") or [],
                    "created_at": r.get("created_at"),
                }
            )
        return out

    async def model_performance(self, range_days: int = 14):
        avg_conf = await self._avg_confidence_range(range_days=range_days)
        daily = await self._daily_confidence_range(range_days=range_days)
        drift = self._confidence_drift(daily)

        start = now_ist() - timedelta(days=range_days)
        start_date = start.strftime("%Y-%m-%d")

        status_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {
                "$group": {
                    "_id": None,
                    "status_2xx": {"$sum": {"$ifNull": ["$status_2xx", 0]}},
                    "status_4xx": {"$sum": {"$ifNull": ["$status_4xx", 0]}},
                    "status_5xx": {"$sum": {"$ifNull": ["$status_5xx", 0]}},
                    "total_latency_ms": {"$sum": {"$ifNull": ["$total_latency_ms", 0]}},
                    "total_requests": {"$sum": {"$ifNull": ["$count", 0]}},
                }
            },
        ]
        status_rows = await self.api_usage_col.aggregate(status_pipeline).to_list(1)
        status_breakdown = {"2xx": 0, "4xx": 0, "5xx": 0}
        latency_avg_ms = 0
        latency_p95_ms = None
        latency_p99_ms = None
        error_rate = 0.0
        if status_rows:
            sr = status_rows[0]
            status_breakdown = {
                "2xx": int(sr.get("status_2xx", 0)),
                "4xx": int(sr.get("status_4xx", 0)),
                "5xx": int(sr.get("status_5xx", 0)),
            }
            total_requests = int(sr.get("total_requests", 0)) or 0
            if total_requests:
                latency_avg_ms = int(sr.get("total_latency_ms", 0) / total_requests)
                error_rate = float((status_breakdown["4xx"] + status_breakdown["5xx"]) / total_requests)

        daily_status_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {
                "$group": {
                    "_id": "$date",
                    "status_2xx": {"$sum": {"$ifNull": ["$status_2xx", 0]}},
                    "status_4xx": {"$sum": {"$ifNull": ["$status_4xx", 0]}},
                    "status_5xx": {"$sum": {"$ifNull": ["$status_5xx", 0]}},
                    "total_latency_ms": {"$sum": {"$ifNull": ["$total_latency_ms", 0]}},
                    "total_requests": {"$sum": {"$ifNull": ["$count", 0]}},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        daily_status_rows = await self.api_usage_col.aggregate(daily_status_pipeline).to_list(None)
        errors_daily = []
        for r in daily_status_rows:
            total_requests = int(r.get("total_requests", 0)) or 0
            latency_avg = int(r.get("total_latency_ms", 0) / total_requests) if total_requests else 0
            err_rate = (
                float((r.get("status_4xx", 0) + r.get("status_5xx", 0)) / total_requests)
                if total_requests
                else 0.0
            )
            errors_daily.append(
                {
                    "date": r.get("_id"),
                    "total_requests": total_requests,
                    "status_4xx": int(r.get("status_4xx", 0)),
                    "status_5xx": int(r.get("status_5xx", 0)),
                    "error_rate": round(err_rate, 4),
                    "latency_avg_ms": latency_avg,
                }
            )

        latency_hist_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {"$project": {"buckets": {"$objectToArray": {"$ifNull": ["$latency_bucket", {}]}}}},
            {"$unwind": {"path": "$buckets", "preserveNullAndEmptyArrays": False}},
            {"$group": {"_id": "$buckets.k", "count": {"$sum": "$buckets.v"}}},
        ]
        latency_rows = await self.api_usage_col.aggregate(latency_hist_pipeline).to_list(None)
        latency_hist = {r["_id"]: int(r.get("count", 0)) for r in latency_rows if r.get("_id")}
        latency_histogram = []
        for key in ["le_250", "le_500", "le_1000", "le_2000", "gt_2000"]:
            latency_histogram.append({"bucket": key, "count": int(latency_hist.get(key, 0))})
        total_latency_samples = sum([b["count"] for b in latency_histogram])
        if total_latency_samples:
            thresholds = [
                ("le_250", 250),
                ("le_500", 500),
                ("le_1000", 1000),
                ("le_2000", 2000),
                ("gt_2000", 5000),
            ]
            running = 0
            p95_target = total_latency_samples * 0.95
            p99_target = total_latency_samples * 0.99
            for key, upper in thresholds:
                running += int(latency_hist.get(key, 0))
                if latency_p95_ms is None and running >= p95_target:
                    latency_p95_ms = upper
                if latency_p99_ms is None and running >= p99_target:
                    latency_p99_ms = upper
            if latency_p95_ms is None:
                latency_p95_ms = thresholds[-1][1]
            if latency_p99_ms is None:
                latency_p99_ms = thresholds[-1][1]

        coverage_pipeline = [
            {"$match": {"event": "chat_message", "created_at": {"$gte": start}}},
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "with_context": {
                        "$sum": {"$cond": [{"$gt": ["$meta.context_papers", 0]}, 1, 0]}
                    },
                }
            },
        ]
        coverage_rows = await self.analytics_events.aggregate(coverage_pipeline).to_list(1)
        coverage_total = 0
        coverage_with = 0
        coverage_pct = 0.0
        if coverage_rows:
            cr = coverage_rows[0]
            coverage_total = int(cr.get("total", 0))
            coverage_with = int(cr.get("with_context", 0))
            coverage_pct = (coverage_with / coverage_total) if coverage_total else 0.0

        model_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {"$project": {"models": {"$objectToArray": {"$ifNull": ["$model_tokens", {}]}}}},
            {"$unwind": "$models"},
            {"$group": {"_id": "$models.k", "tokens": {"$sum": "$models.v"}}},
            {"$sort": {"tokens": -1}},
        ]
        model_rows = await self.api_usage_col.aggregate(model_pipeline).to_list(None)
        model_usage = [{"model": r["_id"], "tokens": int(r["tokens"])} for r in model_rows]

        subject_pipeline = [
            {"$match": {"subject_area": {"$ne": None}, "created_at": {"$gte": start}}},
            {"$group": {"_id": "$subject_area", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 8},
        ]
        subject_rows = await self.queries.aggregate(subject_pipeline).to_list(8)
        subject_segments = [{"subject": r["_id"], "count": int(r["count"])} for r in subject_rows if r["_id"]]

        role_pipeline = [
            {"$match": {"created_at": {"$gte": start}}},
            {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "user",
                }
            },
            {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
            {"$group": {"_id": "$user.role", "count": {"$sum": "$count"}}},
            {"$sort": {"count": -1}},
        ]
        role_rows = await self.queries.aggregate(role_pipeline).to_list(None)
        role_segments = [
            {"role": r["_id"] or "unknown", "count": int(r["count"])} for r in role_rows
        ]

        source_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {"$project": {"sources": {"$objectToArray": {"$ifNull": ["$source_counts", {}]}}}},
            {"$unwind": {"path": "$sources", "preserveNullAndEmptyArrays": False}},
            {"$group": {"_id": "$sources.k", "count": {"$sum": "$sources.v"}}},
            {"$sort": {"count": -1}},
        ]
        source_rows = await self.api_usage_col.aggregate(source_pipeline).to_list(None)
        source_segments = [
            {"source": r["_id"] or "unknown", "count": int(r.get("count", 0))}
            for r in source_rows
            if r.get("_id")
        ]

        endpoint_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {"$group": {"_id": "$endpoint", "count": {"$sum": "$count"}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
        endpoint_rows = await self.api_usage_col.aggregate(endpoint_pipeline).to_list(10)
        endpoint_segments = [
            {"endpoint": r["_id"] or "unknown", "count": int(r.get("count", 0))}
            for r in endpoint_rows
        ]

        return {
            "avg_confidence": round(avg_conf, 4),
            "daily": daily,
            "drift": drift,
            "latency_avg_ms": latency_avg_ms,
            "latency_p95_ms": latency_p95_ms,
            "latency_p99_ms": latency_p99_ms,
            "latency_histogram": latency_histogram,
            "error_rate": error_rate,
            "errors_daily": errors_daily,
            "status_breakdown": status_breakdown,
            "coverage": {
                "total": coverage_total,
                "with_context": coverage_with,
                "pct": coverage_pct,
            },
            "model_usage": model_usage,
            "segments": {
                "subject": subject_segments,
                "role": role_segments,
                "model": model_usage,
                "source": source_segments,
                "endpoint": endpoint_segments,
            },
            "range_days": range_days,
        }

    async def _daily_confidence(self, days: int = 14):
        start = now_ist() - timedelta(days=days)
        pipeline = [
            {"$match": {"created_at": {"$gte": start}, "confidence": {"$ne": None}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                    },
                    "avg": {"$avg": "$confidence"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        rows = await self.queries.aggregate(pipeline).to_list(None)
        return [
            {"date": r["_id"], "avg": round(r["avg"], 4), "count": r["count"]} for r in rows
        ]

    async def abuse_detection(self):
        top_usage = await self._top_api_users()
        flags = await self.abuse_flags.find({}).sort("created_at", -1).to_list(100)
        for f in flags:
            f["id"] = str(f.pop("_id"))
            if "user_id" in f and isinstance(f["user_id"], ObjectId):
                f["user_id"] = str(f["user_id"])
        def _flag_type(reason: str):
            r = (reason or "").lower()
            if "credential" in r or "stuff" in r or "brute" in r:
                return "credential_stuffing"
            if "scrap" in r or "crawl" in r:
                return "scraping"
            if "rate" in r or "throttle" in r or "limit" in r:
                return "rate_limit"
            if "geo" in r or "country" in r or "region" in r:
                return "geo_anomaly"
            if "bot" in r or "automation" in r:
                return "automation"
            return "other"

        def _flag_severity(reason: str):
            r = (reason or "").lower()
            if "credential" in r or "stuff" in r or "brute" in r:
                return "critical"
            if "scrap" in r or "crawl" in r:
                return "warn"
            if "rate" in r or "limit" in r:
                return "warn"
            return "info"

        clusters = {}
        for f in flags:
            reason = f.get("reason") or ""
            f["type"] = f.get("type") or _flag_type(reason)
            f["severity"] = f.get("severity") or _flag_severity(reason)
            meta = f.get("meta") or {}
            ip = f.get("ip") or f.get("ip_address") or meta.get("ip") or meta.get("ip_address")
            ua = f.get("user_agent") or meta.get("user_agent")
            if ip or ua:
                key = f"{ip or 'unknown'}|{ua or 'unknown'}"
                entry = clusters.setdefault(
                    key,
                    {"ip": ip or "unknown", "user_agent": ua or "unknown", "count": 0, "users": set()},
                )
                entry["count"] += 1
                if f.get("user_id"):
                    entry["users"].add(f.get("user_id"))
        cluster_list = []
        for _, c in clusters.items():
            cluster_list.append(
                {
                    "ip": c["ip"],
                    "user_agent": c["user_agent"],
                    "count": c["count"],
                    "users": list(c["users"]),
                }
            )
        cluster_list.sort(key=lambda x: x["count"], reverse=True)

        start = now_ist() - timedelta(days=7)
        start_date = start.strftime("%Y-%m-%d")
        daily_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {"$group": {"_id": "$date", "count": {"$sum": "$count"}}},
            {"$sort": {"_id": 1}},
        ]
        daily_rows = await self.api_usage_col.aggregate(daily_pipeline).to_list(None)
        counts = [r.get("count", 0) for r in daily_rows]
        avg = (sum(counts) / len(counts)) if counts else 0
        spikes = []
        for r in daily_rows[-3:]:
            count = int(r.get("count", 0))
            level = "Low"
            if avg and count > avg * 1.8:
                level = "High"
            elif avg and count > avg * 1.3:
                level = "Moderate"
            spikes.append({"date": r.get("_id"), "count": count, "avg": int(avg), "level": level})

        user_ids = [u.get("user_id") for u in top_usage if u.get("user_id")]
        risk_rows = []
        endpoint_map = {}
        if user_ids:
            safe_ids = [ObjectId(uid) for uid in user_ids if ObjectId.is_valid(uid)]
            user_match = {"user_id": {"$in": safe_ids}, "date": {"$gte": start_date}}
            risk_pipeline = [
                {"$match": user_match},
                {"$sort": {"date": 1}},
                {
                    "$group": {
                        "_id": "$user_id",
                        "total_requests": {"$sum": {"$ifNull": ["$count", 0]}},
                        "status_4xx": {"$sum": {"$ifNull": ["$status_4xx", 0]}},
                        "status_5xx": {"$sum": {"$ifNull": ["$status_5xx", 0]}},
                        "total_latency_ms": {"$sum": {"$ifNull": ["$total_latency_ms", 0]}},
                        "last_ip": {"$last": "$last_ip"},
                        "last_user_agent": {"$last": "$last_user_agent"},
                    }
                },
            ]
            risk_rows = await self.api_usage_col.aggregate(risk_pipeline).to_list(None)

            endpoint_pipeline = [
                {"$match": user_match},
                {"$group": {"_id": {"user_id": "$user_id", "endpoint": "$endpoint"}, "count": {"$sum": "$count"}}},
                {"$sort": {"count": -1}},
            ]
            endpoint_rows = await self.api_usage_col.aggregate(endpoint_pipeline).to_list(None)
            for r in endpoint_rows:
                uid = str(r["_id"]["user_id"])
                endpoint_map.setdefault(uid, []).append(
                    {"endpoint": r["_id"]["endpoint"], "count": int(r.get("count", 0))}
                )

        risk_map = {}
        for r in risk_rows:
            uid = str(r["_id"])
            total_requests = int(r.get("total_requests", 0)) or 0
            err_rate = (
                float((r.get("status_4xx", 0) + r.get("status_5xx", 0)) / total_requests)
                if total_requests
                else 0.0
            )
            latency_avg = int(r.get("total_latency_ms", 0) / total_requests) if total_requests else 0
            risk_map[uid] = {
                "user_id": uid,
                "total_requests": total_requests,
                "error_rate": round(err_rate, 4),
                "latency_avg_ms": latency_avg,
                "last_ip": r.get("last_ip"),
                "last_user_agent": r.get("last_user_agent"),
                "top_endpoints": (endpoint_map.get(uid) or [])[:3],
            }

        user_risk = []
        for u in top_usage:
            uid = u.get("user_id")
            risk = risk_map.get(uid, {})
            user_risk.append({**u, **risk})

        return {
            "top_usage_users": top_usage,
            "flags": flags,
            "clusters": cluster_list[:10],
            "spikes": spikes,
            "user_risk": user_risk,
        }

    async def update_abuse_flag(self, flag_id: str, payload: dict, admin_id: str | None = None):
        if not ObjectId.is_valid(flag_id):
            raise ValueError("Invalid flag id")
        updates = {}
        if "status" in payload:
            updates["status"] = payload["status"]
            if payload["status"] in {"resolved", "false_positive"}:
                updates["resolved"] = True
                updates["resolved_at"] = now_utc()
                if admin_id and ObjectId.is_valid(admin_id):
                    updates["resolved_by"] = ObjectId(admin_id)
            elif payload["status"] == "escalated":
                updates["resolved"] = False
        if "severity" in payload:
            updates["severity"] = payload["severity"]
        if "type" in payload:
            updates["type"] = payload["type"]
        if "resolution_note" in payload:
            updates["resolution_note"] = payload["resolution_note"]
        if not updates:
            return {"updated": False}
        updates["updated_at"] = now_utc()
        await self.abuse_flags.update_one({"_id": ObjectId(flag_id)}, {"$set": updates})
        return {"updated": True}

    async def block_ip(self, ip: str, admin_id: str | None = None, reason: str | None = None):
        if not ip:
            raise ValueError("IP required")
        doc = {
            "ip": ip,
            "reason": reason,
            "created_at": now_utc(),
            "created_by": ObjectId(admin_id) if admin_id and ObjectId.is_valid(admin_id) else None,
        }
        await self.blocked_ips.insert_one(doc)
        return {"blocked": True}

    async def create_abuse_flag(self, payload: dict, admin_id: str | None = None):
        reason = (payload.get("reason") or "").strip()
        if not reason:
            raise ValueError("Reason required")
        user_id = payload.get("user_id")
        doc = {
            "reason": reason,
            "type": payload.get("type"),
            "severity": payload.get("severity"),
            "user_id": ObjectId(user_id) if user_id and ObjectId.is_valid(user_id) else None,
            "ip": payload.get("ip"),
            "user_agent": payload.get("user_agent"),
            "meta": payload.get("meta") or {},
            "created_at": now_utc(),
            "created_by": ObjectId(admin_id) if admin_id and ObjectId.is_valid(admin_id) else None,
            "resolved": False,
        }
        res = await self.abuse_flags.insert_one(doc)
        return {"created": True, "id": str(res.inserted_id)}

    async def revoke_user_sessions_by_user(self, user_id: str):
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")
        res = await self.refresh_tokens.update_many(
            {"user_id": ObjectId(user_id), "revoked": {"$ne": True}},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        return {"revoked": int(res.modified_count or 0)}

    async def revoke_all_user_sessions(self):
        res = await self.refresh_tokens.update_many(
            {"revoked": {"$ne": True}},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        return {"revoked": int(res.modified_count or 0)}

    async def revoke_all_admin_sessions(self):
        res = await self.admin_auth_sessions.update_many(
            {"revoked": {"$ne": True}},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        return {"revoked": int(res.modified_count or 0)}

    async def revoke_all_admin_api_keys(self):
        res = await self.admin_api_keys.update_many(
            {"revoked": {"$ne": True}},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        return {"revoked": int(res.modified_count or 0)}

    async def compliance_overview(self):
        badges = await self.compliance_badges.find({}).sort("name", 1).to_list(50)
        badge_out = []
        for b in badges:
            badge_out.append(
                {
                    "id": str(b.get("_id")),
                    "name": b.get("name"),
                    "status": b.get("status"),
                    "evidence": b.get("evidence") or [],
                    "updated_at": b.get("updated_at"),
                }
            )

        pii_scan = await self.compliance_pii_scans.find({}).sort("created_at", -1).limit(1).to_list(1)
        pii = None
        if pii_scan:
            p = pii_scan[0]
            pii = {
                "id": str(p.get("_id")),
                "email_count": p.get("email_count"),
                "ip_count": p.get("ip_count"),
                "phone_count": p.get("phone_count"),
                "created_at": p.get("created_at"),
            }

        error_scan_rows = await self.compliance_error_scans.find({}).sort("created_at", -1).limit(1).to_list(1)
        error_scan = None
        if error_scan_rows:
            e = error_scan_rows[0]
            error_scan = {
                "id": str(e.get("_id")),
                "error_count": e.get("error_count"),
                "warning_count": e.get("warning_count"),
                "line_count": e.get("line_count"),
                "recent_errors": e.get("recent_errors") or [],
                "recent_warnings": e.get("recent_warnings") or [],
                "source": e.get("source"),
                "created_at": e.get("created_at"),
            }

        db_scan_rows = await self.compliance_db_scans.find({}).sort("created_at", -1).limit(1).to_list(1)
        db_scan = None
        if db_scan_rows:
            d = db_scan_rows[0]
            db_scan = {
                "id": str(d.get("_id")),
                "db_ok": d.get("db_ok"),
                "db_latency_ms": d.get("db_latency_ms"),
                "connections": d.get("connections"),
                "collections": d.get("collections"),
                "source": d.get("source"),
                "created_at": d.get("created_at"),
            }

        api_scan_rows = await self.compliance_api_scans.find({}).sort("created_at", -1).limit(1).to_list(1)
        api_scan = None
        if api_scan_rows:
            a = api_scan_rows[0]
            api_scan = {
                "id": str(a.get("_id")),
                "range_days": a.get("range_days"),
                "total_requests": a.get("total_requests"),
                "status_4xx": a.get("status_4xx"),
                "status_5xx": a.get("status_5xx"),
                "top_endpoints": a.get("top_endpoints") or [],
                "source": a.get("source"),
                "created_at": a.get("created_at"),
            }

        fe_scan_rows = await self.compliance_frontend_scans.find({}).sort("created_at", -1).limit(1).to_list(1)
        fe_scan = None
        if fe_scan_rows:
            f = fe_scan_rows[0]
            fe_scan = {
                "id": str(f.get("_id")),
                "dist_present": f.get("dist_present"),
                "build_present": f.get("build_present"),
                "dist_mtime": f.get("dist_mtime"),
                "build_mtime": f.get("build_mtime"),
                "source": f.get("source"),
                "created_at": f.get("created_at"),
            }

        dep_scan_rows = await self.compliance_dependency_scans.find({}).sort("created_at", -1).limit(1).to_list(1)
        dep_scan = None
        if dep_scan_rows:
            ds = dep_scan_rows[0]
            dep_scan = {
                "id": str(ds.get("_id")),
                "status": ds.get("status"),
                "files": ds.get("files") or [],
                "note": ds.get("note"),
                "source": ds.get("source"),
                "created_at": ds.get("created_at"),
            }

        storage_scan_rows = await self.compliance_storage_scans.find({}).sort("created_at", -1).limit(1).to_list(1)
        storage_scan = None
        if storage_scan_rows:
            ss = storage_scan_rows[0]
            storage_scan = {
                "id": str(ss.get("_id")),
                "disk_total": ss.get("disk_total"),
                "disk_used": ss.get("disk_used"),
                "disk_free": ss.get("disk_free"),
                "uploads_bytes": ss.get("uploads_bytes"),
                "artifacts_bytes": ss.get("artifacts_bytes"),
                "source": ss.get("source"),
                "created_at": ss.get("created_at"),
            }

        auth_scan_rows = await self.compliance_auth_scans.find({}).sort("created_at", -1).limit(1).to_list(1)
        auth_scan = None
        if auth_scan_rows:
            au = auth_scan_rows[0]
            auth_scan = {
                "id": str(au.get("_id")),
                "admin_sessions": au.get("admin_sessions"),
                "user_sessions": au.get("user_sessions"),
                "blocked_ips": au.get("blocked_ips"),
                "critical_flags": au.get("critical_flags"),
                "recent_admin_logins": au.get("recent_admin_logins"),
                "source": au.get("source"),
                "created_at": au.get("created_at"),
            }

        reviews = await self.compliance_access_reviews.find({}).sort("created_at", -1).limit(10).to_list(10)
        admin_ids = [r.get("admin_id") for r in reviews if r.get("admin_id")]
        admin_map = {}
        if admin_ids:
            admins = await self.admin_users.find({"_id": {"$in": admin_ids}}).to_list(None)
            admin_map = {a["_id"]: a for a in admins}
        reviews_out = []
        for r in reviews:
            admin = admin_map.get(r.get("admin_id"))
            reviews_out.append(
                {
                    "id": str(r.get("_id")),
                    "admin_id": str(r.get("admin_id")) if r.get("admin_id") else None,
                    "admin_email": admin.get("email") if admin else None,
                    "scope": r.get("scope"),
                    "notes": r.get("notes"),
                    "created_at": r.get("created_at"),
                }
            )

        purge_runs = await self.compliance_purge_runs.find({}).sort("created_at", -1).limit(10).to_list(10)
        purge_out = []
        for r in purge_runs:
            purge_out.append(
                {
                    "id": str(r.get("_id")),
                    "status": r.get("status"),
                    "records_deleted": r.get("records_deleted"),
                    "created_at": r.get("created_at"),
                    "completed_at": r.get("completed_at"),
                }
            )

        policies = await self.compliance_policies.find({}).sort("name", 1).to_list(50)
        policy_out = []
        for p in policies:
            policy_out.append(
                {
                    "id": str(p.get("_id")),
                    "name": p.get("name"),
                    "category": p.get("category"),
                    "description": p.get("description"),
                    "updated_at": p.get("updated_at"),
                }
            )
        policy_ids = [ObjectId(p.get("id")) for p in policy_out if p.get("id") and ObjectId.is_valid(p.get("id"))]
        ack_rows = []
        if policy_ids:
            ack_rows = await self.compliance_policy_ack.find(
                {"policy_id": {"$in": policy_ids}}
            ).sort("created_at", -1).to_list(200)
        ack_admin_ids = [a.get("admin_id") for a in ack_rows if a.get("admin_id")]
        ack_admin_map = {}
        if ack_admin_ids:
            admins = await self.admin_users.find({"_id": {"$in": ack_admin_ids}}).to_list(None)
            ack_admin_map = {a["_id"]: a for a in admins}
        ack_out = []
        for a in ack_rows:
            admin = ack_admin_map.get(a.get("admin_id"))
            ack_out.append(
                {
                    "id": str(a.get("_id")),
                    "policy_id": str(a.get("policy_id")) if a.get("policy_id") else None,
                    "admin_id": str(a.get("admin_id")) if a.get("admin_id") else None,
                    "admin_email": admin.get("email") if admin else None,
                    "acknowledged": bool(a.get("acknowledged", True)),
                    "created_at": a.get("created_at"),
                }
            )

        history_rows = await self.compliance_badge_history.find({}).sort("created_at", -1).limit(50).to_list(50)
        history_out = []
        for h in history_rows:
            history_out.append(
                {
                    "id": str(h.get("_id")),
                    "badge_id": str(h.get("badge_id")) if h.get("badge_id") else None,
                    "before": h.get("before"),
                    "after": h.get("after"),
                    "created_at": h.get("created_at"),
                }
            )

        jobs = await self.compliance_jobs.find({}).sort("created_at", -1).limit(20).to_list(20)
        jobs_out = []
        for j in jobs:
            jobs_out.append(
                {
                    "id": str(j.get("_id")),
                    "type": j.get("type"),
                    "schedule": j.get("schedule"),
                    "status": j.get("status"),
                    "next_run_at": j.get("next_run_at"),
                    "created_at": j.get("created_at"),
                }
            )

        runs = await self.compliance_job_runs.find({}).sort("created_at", -1).limit(20).to_list(20)
        runs_out = []
        for r in runs:
            runs_out.append(
                {
                    "id": str(r.get("_id")),
                    "job_id": str(r.get("job_id")) if r.get("job_id") else None,
                    "type": r.get("type"),
                    "status": r.get("status"),
                    "message": r.get("message"),
                    "created_at": r.get("created_at"),
                }
            )

        return {
            "badges": badge_out,
            "pii_scan": pii,
            "error_scan": error_scan,
            "db_scan": db_scan,
            "api_scan": api_scan,
            "frontend_scan": fe_scan,
            "dependency_scan": dep_scan,
            "storage_scan": storage_scan,
            "auth_scan": auth_scan,
            "access_reviews": reviews_out,
            "purge_runs": purge_out,
            "policies": policy_out,
            "policy_ack": ack_out,
            "badge_history": history_out,
            "jobs": jobs_out,
            "job_runs": runs_out,
        }

    async def record_access_review(self, admin_id: str | None = None, payload: dict | None = None):
        payload = payload or {}
        doc = {
            "admin_id": ObjectId(admin_id) if admin_id and ObjectId.is_valid(admin_id) else None,
            "scope": payload.get("scope") or "admin_access",
            "notes": payload.get("notes"),
            "created_at": now_utc(),
        }
        await self.compliance_access_reviews.insert_one(doc)
        return {"recorded": True}

    async def record_purge_run(self, payload: dict | None = None):
        payload = payload or {}
        doc = {
            "status": payload.get("status") or "completed",
            "records_deleted": payload.get("records_deleted") or 0,
            "created_at": now_utc(),
            "completed_at": payload.get("completed_at") or now_utc(),
        }
        await self.compliance_purge_runs.insert_one(doc)
        return {"recorded": True}

    async def record_pii_scan(self, payload: dict | None = None):
        payload = payload or {}
        doc = {
            "email_count": payload.get("email_count") or 0,
            "ip_count": payload.get("ip_count") or 0,
            "phone_count": payload.get("phone_count") or 0,
            "breakdown": payload.get("breakdown") or {},
            "source": payload.get("source") or "manual",
            "created_at": now_utc(),
        }
        await self.compliance_pii_scans.insert_one(doc)
        return {"recorded": True}

    async def record_error_scan(self, payload: dict | None = None):
        payload = payload or {}
        doc = {
            "error_count": payload.get("error_count") or 0,
            "warning_count": payload.get("warning_count") or 0,
            "line_count": payload.get("line_count") or 0,
            "recent_errors": payload.get("recent_errors") or [],
            "recent_warnings": payload.get("recent_warnings") or [],
            "source": payload.get("source") or "manual",
            "created_at": now_utc(),
        }
        await self.compliance_error_scans.insert_one(doc)
        return {"recorded": True}

    async def record_db_scan(self, payload: dict | None = None):
        payload = payload or {}
        doc = {
            "db_ok": payload.get("db_ok"),
            "db_latency_ms": payload.get("db_latency_ms"),
            "connections": payload.get("connections"),
            "collections": payload.get("collections"),
            "source": payload.get("source") or "manual",
            "created_at": now_utc(),
        }
        await self.compliance_db_scans.insert_one(doc)
        return {"recorded": True}

    async def record_api_error_scan(self, payload: dict | None = None):
        payload = payload or {}
        doc = {
            "range_days": payload.get("range_days") or 1,
            "total_requests": payload.get("total_requests") or 0,
            "status_4xx": payload.get("status_4xx") or 0,
            "status_5xx": payload.get("status_5xx") or 0,
            "top_endpoints": payload.get("top_endpoints") or [],
            "source": payload.get("source") or "manual",
            "created_at": now_utc(),
        }
        await self.compliance_api_scans.insert_one(doc)
        return {"recorded": True}

    async def record_frontend_scan(self, payload: dict | None = None):
        payload = payload or {}
        doc = {
            "dist_present": bool(payload.get("dist_present")),
            "build_present": bool(payload.get("build_present")),
            "dist_mtime": payload.get("dist_mtime"),
            "build_mtime": payload.get("build_mtime"),
            "source": payload.get("source") or "manual",
            "created_at": now_utc(),
        }
        await self.compliance_frontend_scans.insert_one(doc)
        return {"recorded": True}

    async def record_dependency_scan(self, payload: dict | None = None):
        payload = payload or {}
        doc = {
            "status": payload.get("status") or "not_configured",
            "files": payload.get("files") or [],
            "note": payload.get("note"),
            "source": payload.get("source") or "manual",
            "created_at": now_utc(),
        }
        await self.compliance_dependency_scans.insert_one(doc)
        return {"recorded": True}

    async def record_storage_scan(self, payload: dict | None = None):
        payload = payload or {}
        doc = {
            "disk_total": payload.get("disk_total"),
            "disk_used": payload.get("disk_used"),
            "disk_free": payload.get("disk_free"),
            "uploads_bytes": payload.get("uploads_bytes"),
            "artifacts_bytes": payload.get("artifacts_bytes"),
            "source": payload.get("source") or "manual",
            "created_at": now_utc(),
        }
        await self.compliance_storage_scans.insert_one(doc)
        return {"recorded": True}

    async def record_auth_scan(self, payload: dict | None = None):
        payload = payload or {}
        doc = {
            "admin_sessions": payload.get("admin_sessions") or 0,
            "user_sessions": payload.get("user_sessions") or 0,
            "blocked_ips": payload.get("blocked_ips") or 0,
            "critical_flags": payload.get("critical_flags") or 0,
            "recent_admin_logins": payload.get("recent_admin_logins") or 0,
            "source": payload.get("source") or "manual",
            "created_at": now_utc(),
        }
        await self.compliance_auth_scans.insert_one(doc)
        return {"recorded": True}

    async def update_compliance_badge(self, badge_id: str | None, payload: dict):
        if badge_id and not ObjectId.is_valid(badge_id):
            raise ValueError("Invalid badge id")
        updates = {
            "name": payload.get("name"),
            "status": payload.get("status"),
            "evidence": payload.get("evidence") or [],
            "updated_at": now_utc(),
        }
        if badge_id:
            existing = await self.compliance_badges.find_one({"_id": ObjectId(badge_id)})
            await self.compliance_badge_history.insert_one(
                {
                    "badge_id": ObjectId(badge_id),
                    "before": existing,
                    "after": updates,
                    "created_at": now_utc(),
                }
            )
            await self.compliance_badges.update_one({"_id": ObjectId(badge_id)}, {"$set": updates})
        else:
            res = await self.compliance_badges.insert_one(updates)
            await self.compliance_badge_history.insert_one(
                {
                    "badge_id": res.inserted_id,
                    "before": None,
                    "after": updates,
                    "created_at": now_utc(),
                }
            )
        return {"updated": True}

    async def update_policy_ack(self, policy_id: str, admin_id: str | None = None, acknowledged: bool = True):
        if not ObjectId.is_valid(policy_id):
            raise ValueError("Invalid policy id")
        doc = {
            "policy_id": ObjectId(policy_id),
            "admin_id": ObjectId(admin_id) if admin_id and ObjectId.is_valid(admin_id) else None,
            "acknowledged": bool(acknowledged),
            "created_at": now_utc(),
        }
        await self.compliance_policy_ack.insert_one(doc)
        return {"recorded": True}

    def _schedule_to_seconds(self, schedule: str | None):
        if not schedule:
            return None
        s = str(schedule).strip()
        if not s:
            return None
        if " " in s:
            parts = s.split()
            if len(parts) >= 5:
                minute = parts[0]
                if minute.startswith("*/"):
                    try:
                        n = int(minute.replace("*/", ""))
                        return max(60, n * 60)
                    except Exception:
                        return None
        if s.isdigit():
            return int(s)
        unit = s[-1]
        try:
            val = int(s[:-1])
        except Exception:
            return None
        if unit == "s":
            return val
        if unit == "m":
            return val * 60
        if unit == "h":
            return val * 3600
        if unit == "d":
            return val * 86400
        return None

    async def create_compliance_job(self, payload: dict):
        interval_seconds = self._schedule_to_seconds(payload.get("schedule"))
        next_run = now_utc() + timedelta(seconds=interval_seconds) if interval_seconds else None
        doc = {
            "type": payload.get("type"),
            "schedule": payload.get("schedule"),
            "status": payload.get("status") or "scheduled",
            "next_run_at": payload.get("next_run_at") or next_run,
            "created_at": now_utc(),
        }
        await self.compliance_jobs.insert_one(doc)
        return {"created": True}

    async def ensure_compliance_job(self, job_type: str, schedule: str):
        if not job_type:
            return {"created": False}
        existing = await self.compliance_jobs.find_one({"type": job_type})
        if existing:
            return {"created": False}
        return await self.create_compliance_job(
            {"type": job_type, "schedule": schedule, "status": "scheduled"}
        )

    async def ensure_default_compliance_jobs(self, schedule: str):
        for job_type in [
            "pii_scan",
            "error_scan",
            "db_scan",
            "api_error_scan",
            "frontend_scan",
            "dependency_scan",
            "storage_scan",
            "auth_scan",
        ]:
            await self.ensure_compliance_job(job_type, schedule)

    async def update_compliance_job(self, job_id: str, payload: dict):
        if not ObjectId.is_valid(job_id):
            raise ValueError("Invalid job id")
        updates = {}
        for key in ["type", "schedule", "status", "next_run_at"]:
            if key in payload:
                updates[key] = payload.get(key)
        if "schedule" in updates:
            interval_seconds = self._schedule_to_seconds(updates.get("schedule"))
            if interval_seconds:
                updates["next_run_at"] = now_utc() + timedelta(seconds=interval_seconds)
        if not updates:
            return {"updated": False}
        updates["updated_at"] = now_utc()
        await self.compliance_jobs.update_one({"_id": ObjectId(job_id)}, {"$set": updates})
        return {"updated": True}

    async def process_compliance_jobs(self):
        now = now_utc()
        jobs = await self.compliance_jobs.find({"status": "scheduled"}).to_list(50)
        for j in jobs:
            next_run = j.get("next_run_at")
            if next_run and isinstance(next_run, datetime) and next_run > now:
                continue
            job_type = j.get("type")
            run_status = "completed"
            run_message = None
            if job_type == "pii_scan":
                try:
                    await self.run_pii_scan(source="scheduled")
                except Exception as e:
                    run_status = "failed"
                    run_message = str(e)
            elif job_type == "purge_run":
                await self.compliance_purge_runs.insert_one(
                    {
                        "status": "completed",
                        "records_deleted": 0,
                        "created_at": now_utc(),
                        "completed_at": now_utc(),
                        "source": "scheduled",
                    }
                )
            elif job_type == "error_scan":
                try:
                    await self.run_error_scan(source="scheduled")
                except Exception as e:
                    run_status = "failed"
                    run_message = str(e)
            elif job_type == "db_scan":
                try:
                    await self.run_db_scan(source="scheduled")
                except Exception as e:
                    run_status = "failed"
                    run_message = str(e)
            elif job_type == "api_error_scan":
                try:
                    await self.run_api_error_scan(source="scheduled")
                except Exception as e:
                    run_status = "failed"
                    run_message = str(e)
            elif job_type == "frontend_scan":
                try:
                    await self.run_frontend_scan(source="scheduled")
                except Exception as e:
                    run_status = "failed"
                    run_message = str(e)
            elif job_type == "dependency_scan":
                try:
                    await self.run_dependency_scan(source="scheduled")
                except Exception as e:
                    run_status = "failed"
                    run_message = str(e)
            elif job_type == "storage_scan":
                try:
                    await self.run_storage_scan(source="scheduled")
                except Exception as e:
                    run_status = "failed"
                    run_message = str(e)
            elif job_type == "auth_scan":
                try:
                    await self.run_auth_scan(source="scheduled")
                except Exception as e:
                    run_status = "failed"
                    run_message = str(e)
            interval_seconds = self._schedule_to_seconds(j.get("schedule"))
            next_run_at = now_utc() + timedelta(seconds=interval_seconds) if interval_seconds else None
            await self.compliance_jobs.update_one(
                {"_id": j.get("_id")},
                {"$set": {"last_run_at": now_utc(), "next_run_at": next_run_at}},
            )
            await self.compliance_job_runs.insert_one(
                {
                    "job_id": j.get("_id"),
                    "type": job_type,
                    "status": run_status,
                    "message": run_message,
                    "created_at": now_utc(),
                }
            )

    async def run_pii_scan(self, source: str = "manual"):
        email_regex = r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}"
        ip_regex = r"\b(?:\d{1,3}\.){3}\d{1,3}\b"
        phone_regex = r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b"

        breakdown = {}

        def _rx(pattern: str):
            return {"$regex": pattern, "$options": "i"}

        # Users
        users_email = await self.users.count_documents({"email": _rx(email_regex)})
        users_name = await self.users.count_documents({"name": _rx(email_regex)})
        breakdown["users"] = {"email": users_email, "name": users_name}

        # Feedback
        feedback_email = await self.feedback.count_documents({"message": _rx(email_regex)})
        feedback_ip = await self.feedback.count_documents({"message": _rx(ip_regex)})
        feedback_phone = await self.feedback.count_documents({"message": _rx(phone_regex)})
        breakdown["feedback"] = {"email": feedback_email, "ip": feedback_ip, "phone": feedback_phone}

        # Queries
        query_email = await self.queries.count_documents({"text": _rx(email_regex)})
        query_email2 = await self.queries.count_documents({"input_text": _rx(email_regex)})
        query_ip = await self.queries.count_documents({"text": _rx(ip_regex)})
        query_ip2 = await self.queries.count_documents({"input_text": _rx(ip_regex)})
        query_phone = await self.queries.count_documents({"text": _rx(phone_regex)})
        query_phone2 = await self.queries.count_documents({"input_text": _rx(phone_regex)})
        breakdown["queries"] = {
            "email": query_email + query_email2,
            "ip": query_ip + query_ip2,
            "phone": query_phone + query_phone2,
        }

        # Notes
        notes_email = await self.notes.count_documents({"content": _rx(email_regex)})
        notes_ip = await self.notes.count_documents({"content": _rx(ip_regex)})
        notes_phone = await self.notes.count_documents({"content": _rx(phone_regex)})
        breakdown["notes"] = {"email": notes_email, "ip": notes_ip, "phone": notes_phone}

        # Papers
        papers_email = await self.papers.count_documents({"title": _rx(email_regex)})
        papers_email2 = await self.papers.count_documents({"abstract": _rx(email_regex)})
        papers_ip = await self.papers.count_documents({"title": _rx(ip_regex)})
        papers_ip2 = await self.papers.count_documents({"abstract": _rx(ip_regex)})
        papers_phone = await self.papers.count_documents({"title": _rx(phone_regex)})
        papers_phone2 = await self.papers.count_documents({"abstract": _rx(phone_regex)})
        breakdown["papers"] = {
            "email": papers_email + papers_email2,
            "ip": papers_ip + papers_ip2,
            "phone": papers_phone + papers_phone2,
        }

        # Summaries (paper_summaries.content)
        summaries_email = await self.paper_summaries.count_documents({"content": _rx(email_regex)})
        summaries_ip = await self.paper_summaries.count_documents({"content": _rx(ip_regex)})
        summaries_phone = await self.paper_summaries.count_documents({"content": _rx(phone_regex)})
        breakdown["summaries"] = {
            "email": summaries_email,
            "ip": summaries_ip,
            "phone": summaries_phone,
        }

        # Uploads metadata (queries.file.filename)
        uploads_email = await self.queries.count_documents({"file.filename": _rx(email_regex)})
        uploads_ip = await self.queries.count_documents({"file.filename": _rx(ip_regex)})
        uploads_phone = await self.queries.count_documents({"file.filename": _rx(phone_regex)})
        breakdown["uploads"] = {
            "email": uploads_email,
            "ip": uploads_ip,
            "phone": uploads_phone,
        }

        email_total = (
            users_email
            + users_name
            + feedback_email
            + breakdown["queries"]["email"]
            + notes_email
            + breakdown["papers"]["email"]
            + breakdown["summaries"]["email"]
            + breakdown["uploads"]["email"]
        )
        ip_total = feedback_ip + breakdown["queries"]["ip"] + notes_ip + breakdown["papers"]["ip"] + breakdown["summaries"]["ip"] + breakdown["uploads"]["ip"]
        phone_total = feedback_phone + breakdown["queries"]["phone"] + notes_phone + breakdown["papers"]["phone"] + breakdown["summaries"]["phone"] + breakdown["uploads"]["phone"]

        await self.record_pii_scan(
            {
                "email_count": email_total,
                "ip_count": ip_total,
                "phone_count": phone_total,
                "breakdown": breakdown,
                "source": source,
            }
        )
        return {
            "email_count": email_total,
            "ip_count": ip_total,
            "phone_count": phone_total,
            "breakdown": breakdown,
        }

    async def run_error_scan(self, source: str = "manual", max_lines: int = 2000):
        log_path = os.path.join(os.path.dirname(__file__), "..", "logs", "app.log")
        log_path = os.path.abspath(log_path)
        try:
            if not os.path.exists(log_path):
                payload = {
                    "error_count": 0,
                    "warning_count": 0,
                    "line_count": 0,
                    "recent_errors": [],
                    "recent_warnings": [],
                    "source": source,
                }
                await self.record_error_scan(payload)
                return payload

            with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except Exception as e:
            payload = {
                "error_count": 0,
                "warning_count": 0,
                "line_count": 0,
                "recent_errors": [{"line": str(e)}],
                "recent_warnings": [],
                "source": source,
            }
            await self.record_error_scan(payload)
            return payload

        tail = lines[-max_lines:] if max_lines and max_lines > 0 else lines
        error_lines = [ln.strip() for ln in tail if "ERROR" in ln]
        warning_lines = [ln.strip() for ln in tail if "WARNING" in ln]

        payload = {
            "error_count": len(error_lines),
            "warning_count": len(warning_lines),
            "line_count": len(tail),
            "recent_errors": error_lines[-10:],
            "recent_warnings": warning_lines[-10:],
            "source": source,
        }
        await self.record_error_scan(payload)
        return payload

    async def run_db_scan(self, source: str = "manual"):
        db_ok = False
        db_latency_ms = None
        connections = None
        collections = None
        try:
            t0 = time.perf_counter()
            await self._db.command("ping")
            db_latency_ms = int((time.perf_counter() - t0) * 1000)
            db_ok = True
        except Exception:
            db_ok = False

        try:
            status = await self._db.command("serverStatus")
            conn = status.get("connections") or {}
            connections = {
                "current": conn.get("current"),
                "available": conn.get("available"),
                "totalCreated": conn.get("totalCreated"),
            }
        except Exception:
            connections = None

        try:
            collections = len(await self._db.list_collection_names())
        except Exception:
            collections = None

        payload = {
            "db_ok": db_ok,
            "db_latency_ms": db_latency_ms,
            "connections": connections,
            "collections": collections,
            "source": source,
        }
        await self.record_db_scan(payload)
        return payload

    async def run_api_error_scan(self, source: str = "manual", range_days: int = 1):
        start = now_ist() - timedelta(days=range_days)
        start_date = start.strftime("%Y-%m-%d")
        totals_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {
                "$group": {
                    "_id": None,
                    "count": {"$sum": "$count"},
                    "status_4xx": {"$sum": {"$ifNull": ["$status_4xx", 0]}},
                    "status_5xx": {"$sum": {"$ifNull": ["$status_5xx", 0]}},
                }
            },
        ]
        totals_rows = await self.api_usage_col.aggregate(totals_pipeline).to_list(1)
        totals = totals_rows[0] if totals_rows else {}
        total_requests = int(totals.get("count", 0) or 0)
        status_4xx = int(totals.get("status_4xx", 0) or 0)
        status_5xx = int(totals.get("status_5xx", 0) or 0)

        top_pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {
                "$group": {
                    "_id": "$endpoint",
                    "count": {"$sum": "$count"},
                    "status_4xx": {"$sum": {"$ifNull": ["$status_4xx", 0]}},
                    "status_5xx": {"$sum": {"$ifNull": ["$status_5xx", 0]}},
                }
            },
            {"$sort": {"status_5xx": -1, "status_4xx": -1, "count": -1}},
            {"$limit": 10},
        ]
        rows = await self.api_usage_col.aggregate(top_pipeline).to_list(10)
        top_endpoints = [
            {
                "endpoint": r.get("_id"),
                "count": int(r.get("count", 0)),
                "status_4xx": int(r.get("status_4xx", 0)),
                "status_5xx": int(r.get("status_5xx", 0)),
            }
            for r in rows
        ]
        payload = {
            "range_days": range_days,
            "total_requests": total_requests,
            "status_4xx": status_4xx,
            "status_5xx": status_5xx,
            "top_endpoints": top_endpoints,
            "source": source,
        }
        await self.record_api_error_scan(payload)
        return payload

    async def run_frontend_scan(self, source: str = "manual"):
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        frontend_dir = os.path.join(repo_root, "frontend")
        dist_dir = os.path.join(frontend_dir, "dist")
        build_dir = os.path.join(frontend_dir, "build")
        dist_present = os.path.isdir(dist_dir)
        build_present = os.path.isdir(build_dir)
        dist_mtime = int(os.path.getmtime(dist_dir)) if dist_present else None
        build_mtime = int(os.path.getmtime(build_dir)) if build_present else None
        payload = {
            "dist_present": dist_present,
            "build_present": build_present,
            "dist_mtime": dist_mtime,
            "build_mtime": build_mtime,
            "source": source,
        }
        await self.record_frontend_scan(payload)
        return payload

    def _dir_size(self, path: str, max_files: int = 20000) -> int | None:
        if not os.path.exists(path):
            return None
        total = 0
        seen = 0
        for root, _, files in os.walk(path):
            for name in files:
                try:
                    total += os.path.getsize(os.path.join(root, name))
                except Exception:
                    pass
                seen += 1
                if max_files and seen >= max_files:
                    return total
        return total

    async def run_dependency_scan(self, source: str = "manual"):
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        files = []
        for rel in [
            "backend/requirements.txt",
            "backend/pyproject.toml",
            "frontend/package-lock.json",
            "frontend/pnpm-lock.yaml",
            "frontend/yarn.lock",
            "frontend/package.json",
        ]:
            p = os.path.join(repo_root, rel)
            if os.path.exists(p):
                files.append(rel)
        payload = {
            "status": "not_configured",
            "files": files,
            "note": "Vulnerability audit not configured. Install pip-audit/npm audit to enable.",
            "source": source,
        }
        await self.record_dependency_scan(payload)
        return payload

    async def run_storage_scan(self, source: str = "manual"):
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
        artifacts_dir = os.path.join(os.path.dirname(__file__), "..", "artifacts")
        try:
            usage = shutil.disk_usage(repo_root)
            disk_total = int(usage.total)
            disk_used = int(usage.used)
            disk_free = int(usage.free)
        except Exception:
            disk_total = disk_used = disk_free = None
        payload = {
            "disk_total": disk_total,
            "disk_used": disk_used,
            "disk_free": disk_free,
            "uploads_bytes": self._dir_size(os.path.abspath(uploads_dir)),
            "artifacts_bytes": self._dir_size(os.path.abspath(artifacts_dir)),
            "source": source,
        }
        await self.record_storage_scan(payload)
        return payload

    async def run_auth_scan(self, source: str = "manual"):
        admin_sessions = await self.admin_auth_sessions.count_documents({"revoked": {"$ne": True}})
        user_sessions = await self.refresh_tokens.count_documents({"revoked": {"$ne": True}})
        blocked_ips = await self.blocked_ips.count_documents({})
        critical_flags = await self.abuse_flags.count_documents({"severity": "critical", "resolved": {"$ne": True}})
        since = now_ist() - timedelta(days=1)
        audit = self._db["admin_audit_logs"]
        recent_admin_logins = await audit.count_documents(
            {"action": "login", "created_at": {"$gte": since}}
        )
        payload = {
            "admin_sessions": int(admin_sessions),
            "user_sessions": int(user_sessions),
            "blocked_ips": int(blocked_ips),
            "critical_flags": int(critical_flags),
            "recent_admin_logins": int(recent_admin_logins),
            "source": source,
        }
        await self.record_auth_scan(payload)
        return payload

    async def _top_api_users(self, limit: int = 10, range_days: int | None = None):
        match = {}
        if range_days:
            start = now_ist() - timedelta(days=range_days)
            match = {"date": {"$gte": start.strftime("%Y-%m-%d")}}
        pipeline = []
        if match:
            pipeline.append({"$match": match})
        pipeline.extend(
            [
                {"$group": {"_id": "$user_id", "count": {"$sum": "$count"}}},
                {"$sort": {"count": -1}},
                {"$limit": limit},
            ]
        )
        rows = await self.api_usage_col.aggregate(pipeline).to_list(limit)
        user_ids = [r["_id"] for r in rows if r.get("_id")]
        users_map = {}
        if user_ids:
            users = await self.users.find({"_id": {"$in": user_ids}}).to_list(None)
            users_map = {u["_id"]: u for u in users}
        out = []
        for r in rows:
            uid = r.get("_id")
            user = users_map.get(uid)
            out.append(
                {
                    "user_id": str(uid) if uid else None,
                    "name": user.get("name") if user else None,
                    "email": user.get("email") if user else None,
                    "count": r["count"],
                }
            )
        return out

    async def _kpi_trends(self, range_days: int = 30):
        now = now_ist()
        last_7 = now - timedelta(days=7)
        last_range = now - timedelta(days=range_days)
        kpi = {
            "users_7d": await self.users.count_documents({"created_at": {"$gte": last_7}}),
            "users_range": await self.users.count_documents({"created_at": {"$gte": last_range}}),
            "queries_7d": await self.queries.count_documents({"created_at": {"$gte": last_7}}),
            "queries_range": await self.queries.count_documents({"created_at": {"$gte": last_range}}),
            "papers_7d": await self.papers.count_documents({"created_at": {"$gte": last_7}}),
            "papers_range": await self.papers.count_documents({"created_at": {"$gte": last_range}}),
        }
        return kpi

    async def _top_user_activity(self, limit: int = 8):
        pipeline = [
            {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        rows = await self.queries.aggregate(pipeline).to_list(limit)
        user_ids = [r["_id"] for r in rows if r["_id"]]
        users_map = {}
        if user_ids:
            users = await self.users.find({"_id": {"$in": user_ids}}).to_list(None)
            users_map = {u["_id"]: u for u in users}
        out = []
        for r in rows:
            uid = r["_id"]
            user = users_map.get(uid)
            out.append(
                {
                    "user_id": str(uid) if uid else None,
                    "email": user.get("email") if user else None,
                    "count": r["count"],
                }
            )
        return out

    async def _recent_admin_actions(self, limit: int = 8):
        audit = self._db["admin_audit_logs"]
        rows = await audit.find({}).sort("created_at", -1).limit(limit).to_list(limit)
        out = []
        for r in rows:
            out.append(
                {
                    "id": str(r["_id"]),
                    "admin_id": str(r.get("admin_id")) if r.get("admin_id") else None,
                    "action": r.get("action"),
                    "created_at": r.get("created_at"),
                }
            )
        return out

    async def _compute_system_health(self):
        db_ok = False
        db_latency_ms = None
        db_connections = None
        try:
            t0 = time.perf_counter()
            await self._db.command("ping")
            db_latency_ms = int((time.perf_counter() - t0) * 1000)
            db_ok = True
        except Exception:
            db_ok = False

        gemini_ok = False
        gemini_latency_ms = None
        gemini_base = settings.GEMINI_API_BASE or "https://generativelanguage.googleapis.com/v1beta"
        if settings.GEMINI_API_KEY:
            try:
                t0 = time.perf_counter()
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.get(f"{gemini_base}/models", params={"key": settings.GEMINI_API_KEY})
                    resp.raise_for_status()
                gemini_latency_ms = int((time.perf_counter() - t0) * 1000)
                gemini_ok = True
            except Exception:
                gemini_ok = False

        redis_ok = None
        redis_url = os.getenv("REDIS_URL", "").strip()
        if redis_url and redis:
            try:
                client = redis.from_url(redis_url, decode_responses=True)
                await client.ping()
                redis_ok = True
            except Exception:
                redis_ok = False

        try:
            status = await self._db.command("serverStatus")
            conn = status.get("connections") or {}
            db_connections = {
                "current": conn.get("current"),
                "available": conn.get("available"),
                "totalCreated": conn.get("totalCreated"),
            }
        except Exception:
            db_connections = None

        disk_total = disk_used = disk_free = None
        try:
            usage = shutil.disk_usage(os.getcwd())
            disk_total = int(usage.total)
            disk_used = int(usage.used)
            disk_free = int(usage.free)
        except Exception:
            pass

        cpu_pct = mem_total = mem_used = None
        try:
            import psutil  # type: ignore
            cpu_pct = float(psutil.cpu_percent(interval=0.1))
            vm = psutil.virtual_memory()
            mem_total = int(vm.total)
            mem_used = int(vm.used)
        except Exception:
            pass

        restart_count = None
        try:
            meta = await self._db["system_health_meta"].find_one({"_id": "restart_count"})
            restart_count = int(meta.get("value", 0)) if meta else None
        except Exception:
            restart_count = None

        return {
            "db_ok": db_ok,
            "gemini_ok": gemini_ok,
            "redis_ok": redis_ok,
            "server_time": now_ist(),
            "uptime_seconds": int((now_utc() - _STARTED_AT).total_seconds()),
            "restart_count": restart_count,
            "services": [
                {"name": "database", "status": "ok" if db_ok else "down"},
                {"name": "gemini", "status": "ok" if gemini_ok else "down"},
                {"name": "redis", "status": "ok" if redis_ok else "unknown" if redis_ok is None else "down"},
            ],
            "workers": [
                {
                    "name": "health_snapshot",
                    "status": "running",
                    "interval_seconds": int(os.getenv("SYSTEM_HEALTH_SNAPSHOT_INTERVAL_SECONDS", "300")),
                }
            ],
            "resources": {
                "cpu_pct": cpu_pct,
                "mem_total": mem_total,
                "mem_used": mem_used,
                "disk_total": disk_total,
                "disk_used": disk_used,
                "disk_free": disk_free,
            },
            "latency": {
                "db_ms": db_latency_ms,
                "gemini_ms": gemini_latency_ms,
            },
            "db_connections": db_connections,
            "io": {
                "disk_io": None,
                "log_volume": None,
            },
            "dependencies": [
                {"name": "db", "status": "healthy" if db_ok else "degraded"},
                {"name": "gemini", "status": "healthy" if gemini_ok else "degraded"},
                {"name": "redis", "status": "healthy" if redis_ok else "unknown" if redis_ok is None else "degraded"},
            ],
        }

    async def system_health(self):
        payload = await self._compute_system_health()

        incidents = await self.abuse_flags.find(
            {"resolved": {"$ne": True}, "severity": "critical"}
        ).sort("created_at", -1).limit(10).to_list(10)
        incident_list = []
        for f in incidents:
            incident_list.append(
                {
                    "id": str(f.get("_id")),
                    "type": "abuse_flag",
                    "title": f.get("reason") or "Critical abuse flag",
                    "created_at": f.get("created_at"),
                }
            )

        since = now_ist() - timedelta(hours=24)
        history_rows = await self.system_health_snapshots.find(
            {"ts": {"$gte": since}}
        ).sort("ts", -1).limit(288).to_list(288)
        history = [
            {
                "ts": r.get("ts"),
                "db_ok": r.get("db_ok"),
                "gemini_ok": r.get("gemini_ok"),
                "redis_ok": r.get("redis_ok"),
                "cpu_pct": r.get("cpu_pct"),
                "mem_used": r.get("mem_used"),
                "mem_total": r.get("mem_total"),
                "disk_used": r.get("disk_used"),
                "disk_total": r.get("disk_total"),
            }
            for r in history_rows
        ]

        payload.update(
            {
                "incidents": incident_list,
                "history": history,
            }
        )
        return payload

    async def record_system_health_snapshot(self):
        payload = await self._compute_system_health()
        resources = payload.get("resources") or {}
        latency = payload.get("latency") or {}
        doc = {
            "ts": payload.get("server_time"),
            "db_ok": payload.get("db_ok"),
            "gemini_ok": payload.get("gemini_ok"),
            "redis_ok": payload.get("redis_ok"),
            "db_latency_ms": latency.get("db_ms"),
            "gemini_latency_ms": latency.get("gemini_ms"),
            "cpu_pct": resources.get("cpu_pct"),
            "mem_total": resources.get("mem_total"),
            "mem_used": resources.get("mem_used"),
            "disk_total": resources.get("disk_total"),
            "disk_used": resources.get("disk_used"),
            "disk_free": resources.get("disk_free"),
        }
        await self.system_health_snapshots.insert_one(doc)
        return {"recorded": True}

    async def export_user_data(self, user_id: str):
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")
        from app.services.auth_service import AuthService

        service = AuthService(db=self._db)
        return await service.export_data(user_id)

    async def user_sessions(self, page: int = 1, limit: int = 50):
        skip = max(page - 1, 0) * limit
        rows = await self.refresh_tokens.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        user_ids = list({r.get("user_id") for r in rows if r.get("user_id")})
        users_map = {}
        if user_ids:
            users = await self.users.find({"_id": {"$in": user_ids}}).to_list(None)
            users_map = {u["_id"]: u for u in users}
        items = []
        for r in rows:
            uid = r.get("user_id")
            user = users_map.get(uid)
            items.append(
                {
                    "id": str(r.get("_id")),
                    "user_id": str(uid) if uid else None,
                    "user_email": user.get("email") if user else None,
                    "created_at": r.get("created_at"),
                    "expires_at": r.get("expires_at"),
                    "revoked": r.get("revoked", False),
                    "user_agent": r.get("user_agent"),
                    "ip": r.get("ip"),
                }
            )
        total = await self.refresh_tokens.count_documents({})
        return {"items": items, "page": page, "limit": limit, "total": total}

    async def revoke_user_session(self, session_id: str) -> dict:
        if not ObjectId.is_valid(session_id):
            raise ValueError("Invalid session id")
        res = await self.refresh_tokens.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        return {"revoked": res.modified_count == 1}

    async def force_logout_users(self) -> dict:
        res = await self.refresh_tokens.update_many(
            {"revoked": {"$ne": True}},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        return {"revoked": res.modified_count}

    async def force_logout_admins(self) -> dict:
        res = await self.admin_auth_sessions.update_many(
            {"revoked": {"$ne": True}},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        return {"revoked": res.modified_count}

    async def revoke_all_admin_api_keys(self) -> dict:
        res = await self.admin_api_keys.update_many(
            {"revoked": {"$ne": True}},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        return {"revoked": res.modified_count}

    async def test_email(self, to_email: str | None = None) -> dict:
        settings_service = AdminSettingsService(db=self._db)
        cfg = await settings_service.get_settings()
        smtp_host = (cfg.get("smtp_host") or "").strip()
        smtp_port = int(cfg.get("smtp_port") or 587)
        smtp_user = (cfg.get("smtp_user") or "").strip()
        smtp_password = cfg.get("smtp_password") or ""
        smtp_from = (cfg.get("smtp_from") or smtp_user or "no-reply@example.com").strip()
        alert_email = (cfg.get("alert_email") or "").strip()
        recipients = [e.strip() for e in (cfg.get("alert_recipients") or "").split(",") if e.strip()]

        target = (to_email or alert_email or (recipients[0] if recipients else "")).strip()
        if not target:
            raise ValueError("No recipient email configured")
        if not smtp_host:
            raise ValueError("SMTP host is not configured")

        msg = EmailMessage()
        msg["Subject"] = "Admin Settings Test Email"
        msg["From"] = smtp_from
        msg["To"] = target
        msg.set_content("This is a test email from Admin Settings.")

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            try:
                server.starttls()
                server.ehlo()
            except Exception:
                pass
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)
        return {"sent": True, "to": target}

    async def _count_by_user(self, col, user_ids: list):
        pipeline = [
            {"$match": {"user_id": {"$in": user_ids}}},
            {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
        ]
        rows = await col.aggregate(pipeline).to_list(None)
        return {r["_id"]: r["count"] for r in rows}

    async def _activity_by_user(self, user_ids: list, days: int = 7):
        if not user_ids:
            return {}
        start = now_ist() - timedelta(days=days)
        pipeline = [
            {"$match": {"user_id": {"$in": user_ids}, "created_at": {"$gte": start}}},
            {
                "$group": {
                    "_id": {
                        "user_id": "$user_id",
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.date": 1}},
        ]
        rows = await self.queries.aggregate(pipeline).to_list(None)
        out = {uid: [] for uid in user_ids}
        for r in rows:
            uid = r["_id"]["user_id"]
            out.setdefault(uid, []).append({"date": r["_id"]["date"], "count": r["count"]})
        return out

    async def update_user(self, user_id: str, payload: dict):
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")
        updates = {}
        if "is_active" in payload:
            updates["is_active"] = bool(payload["is_active"])
        if not updates:
            return {"updated": False}
        updates["updated_at"] = now_utc()
        await self.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
        return {"updated": True}

    async def delete_user(self, user_id: str):
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")
        from app.services.auth_service import AuthService
        service = AuthService(db=self._db)
        return await service.delete_account(user_id)

    async def delete_user_data(self, user_id: str):
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")
        from app.services.auth_service import AuthService
        service = AuthService(db=self._db)
        return await service.delete_account_data(user_id)
