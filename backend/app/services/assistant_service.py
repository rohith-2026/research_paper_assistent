# app/services/assistant_service.py
import numpy as np
from datetime import datetime
from app.core.time_utils import now_ist
from typing import Dict, Any, List
from bson import ObjectId

from app.repositories.query_repo import QueryRepo
from app.repositories.analytics_repo import AnalyticsRepo
from app.services.paper_aggregator_service import PaperAggregatorService
from app.services.paper_service import PaperService


def now_utc() -> datetime:
    return now_ist()


class AssistantService:
    """
    CORE Assistant Pipeline (FREE / EXTENSIBLE)

    Responsibilities:
      - ML inference
      - Paper discovery
      - Query persistence
      - Analytics emission
      - Graph edge creation

    Does NOT:
      - Summarize papers
      - Chat with user
      - Download files
    """

    def __init__(self, model_service, vectorizer_service, db=None):
        self.model_service = model_service
        self.vectorizer_service = vectorizer_service
        self.paper_search = PaperAggregatorService()
        self.labels = getattr(model_service, "labels", None)
        self.queries = QueryRepo(db=db)
        self.analytics = AnalyticsRepo(db=db)
        self.papers = PaperService(db=db)

    # -------------------------------------------------
    # Prediction
    # -------------------------------------------------
    def analyze_text(self, text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        x = self.vectorizer_service.transform([text])
        preds = self.model_service.predict(x)[0]

        idx = np.argsort(preds)[-top_k:][::-1]

        return [
            {
                "label": self._decode_label(int(i)),
                "score": float(preds[i]),
            }
            for i in idx
        ]

    def _decode_label(self, idx: int) -> str:
        if hasattr(self.model_service, "decode_index"):
            try:
                return self.model_service.decode_index(idx)
            except Exception:
                pass

        if isinstance(self.labels, list) and 0 <= idx < len(self.labels):
            return str(self.labels[idx])

        return f"class_{idx}"

    # -------------------------------------------------
    # Main Query
    # -------------------------------------------------
    async def run_query(
        self,
        user_id: str,
        text: str,
        input_type: str = "text",
    ) -> Dict[str, Any]:

        text = (text or "").strip()
        if len(text) < 3:
            raise ValueError("Query text too short")

        # 1) Predict
        top_preds = self.analyze_text(text, top_k=5)
        subject_area = top_preds[0]["label"]
        confidence = top_preds[0]["score"]

        # 2) Paper search
        papers = await self.paper_search.search_all(
            query=f"{subject_area} {text[:250]}",
            limit=10,
        )

        # 3) Persist query
        doc = {
            "user_id": ObjectId(user_id),
            "input_type": input_type,
            "text": text[:20000],
            "subject_area": subject_area,
            "confidence": float(confidence),
            "top_predictions": top_preds,
            "papers": [p.model_dump() for p in papers],
            "gpt_answer": None,
            "created_at": now_utc(),
        }

        result = await self.queries.insert(doc)
        query_id = str(result.inserted_id)
        await self.papers.save_query_papers(
            user_id=user_id,
            query_id=query_id,
            query_created_at=doc["created_at"],
            subject_area=subject_area,
            papers=[p.model_dump() for p in papers],
        )

        # 4) Analytics event
        await self.analytics.emit(
            ObjectId(user_id),
            "query_created",
            {
                "query_id": ObjectId(query_id),
                "input_type": input_type,
                "subject_area": subject_area,
                "confidence": float(confidence),
            },
        )

        # 5) Response
        return {
            "query_id": query_id,
            "subject_area": subject_area,
            "model_confidence": float(confidence),
            "top_predictions": top_preds,
            "top_papers": [p.model_dump() for p in papers],
            "gpt_answer": None,
            "features": {
                "summaries_enabled": True,
                "chatbot_enabled": True,
                "graph_enabled": True,
                "downloads_enabled": True,
            },
            "meta": {
                "saved": True,
                "input_type": input_type,
                "papers_source": [
                    "SemanticScholar",
                    "Crossref",
                    "OpenAlex",
                    "arXiv",
                ],
            },
        }

    # -------------------------------------------------
    # History
    # -------------------------------------------------
    async def history(
        self,
        user_id: str,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:

        rows = await self.queries.list_by_user(ObjectId(user_id), limit=limit)

        items = []
        for q in rows:
            q["id"] = str(q.pop("_id"))
            q["user_id"] = str(q["user_id"])
            items.append(q)

        return items

    # -------------------------------------------------
    # History Helpers (for routes)
    # -------------------------------------------------
    async def history_paginated(self, user_id: str, limit: int, skip: int):
        uid = ObjectId(user_id)
        total = await self.queries.count({"user_id": uid})
        rows = await self.queries.list_by_user(uid, limit=limit, skip=skip)
        return total, rows

    async def record_quick_analysis(
        self,
        user_id: str,
        input_type: str,
        input_text: str,
        file_meta: dict | None,
        predicted_topics: list,
    ):
        doc = {
            "user_id": ObjectId(user_id),
            "input_type": input_type,
            "input_text": input_text,
            "file": file_meta,
            "predicted_topics": predicted_topics,
            "created_at": now_utc(),
        }
        res = await self.queries.insert(doc)
        return str(res.inserted_id)

    async def delete_history_item(self, user_id: str, history_id: ObjectId):
        return await self.queries.delete_one(
            {"_id": history_id, "user_id": ObjectId(user_id)}
        )

    async def delete_all_history(self, user_id: str):
        return await self.queries.delete_many({"user_id": ObjectId(user_id)})
