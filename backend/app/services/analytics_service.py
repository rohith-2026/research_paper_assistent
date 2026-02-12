from datetime import datetime, timedelta
from app.core.time_utils import IST

from app.repositories.analytics_repo import AnalyticsRepo
from app.utils.analytics_math import moving_average, growth_rate, normalize


class AnalyticsService:
    def __init__(self, db=None):
        self.repo = AnalyticsRepo(db=db)

    async def overview(self, user_id):
        total_queries = await self.repo.count_queries(user_id)
        papers_saved = await self.repo.count_papers(user_id)
        avg_conf = await self.repo.avg_confidence(user_id)
        avg_conf = round(avg_conf, 4) if avg_conf else 0.0

        top_subjects = await self.repo.subject_distribution(user_id, limit=5)
        top_subjects = [{"subject": r["_id"], "count": r["count"]} for r in top_subjects if r["_id"]]

        return {
            "total_queries": total_queries,
            "avg_confidence": avg_conf,
            "top_subjects": top_subjects,
            "papers_saved": papers_saved,
        }

    async def confidence(self, user_id, start: datetime | None = None, end: datetime | None = None):
        rows = await self.repo.confidence_daily(user_id, start=start, end=end)
        values = [r["avg"] for r in rows]
        ma = moving_average(values, window=3)

        daily = []
        for i, r in enumerate(rows):
            daily.append(
                {
                    "date": r["_id"],
                    "avg": round(r["avg"], 4) if r["avg"] is not None else 0.0,
                    "ma": round(ma[i], 4) if i < len(ma) else None,
                    "count": r.get("count", 0),
                }
            )

        drift = 0.0
        if len(values) >= 2:
            drift = growth_rate(values[-2], values[-1])

        return {"daily": daily, "drift": round(drift, 4)}

    async def subjects(self, user_id, start: datetime | None = None, end: datetime | None = None):
        rows = await self.repo.subjects_over_time(user_id, start=start, end=end, limit=5)
        out = {}
        for r in rows:
            date = r["_id"]["date"]
            subject = r["_id"]["subject"]
            out.setdefault(subject, []).append({"date": date, "count": r["count"]})
        return out

    async def api_usage(self, user_id, start_date: str | None = None, end_date: str | None = None):
        rows = await self.repo.api_usage_by_endpoint(user_id, start_date=start_date, end_date=end_date)
        max_count = max([r["count"] for r in rows], default=0)
        return {
            "endpoints": [
                {
                    "endpoint": r["_id"],
                    "count": r["count"],
                    "normalized": normalize(r["count"], 0.0, float(max_count)),
                }
                for r in rows
            ]
        }

    def parse_dates(self, start_date: str | None, end_date: str | None):
        start = None
        end = None
        if start_date:
            start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=IST)
        if end_date:
            end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=IST) + timedelta(days=1)
        return start, end
