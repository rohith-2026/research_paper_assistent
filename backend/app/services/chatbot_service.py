import os
from datetime import datetime
from app.core.time_utils import now_ist
from typing import List

from bson import ObjectId

from app.repositories.chat_repo import ChatSessionRepo, ChatMessageRepo
from app.repositories.summary_repo import SummaryRepository
from app.repositories.graph_repo import GraphRepo
from app.repositories.paper_repo import PaperRepo
from app.repositories.query_repo import QueryRepo
from app.repositories.note_repo import NoteRepo
from app.repositories.analytics_repo import AnalyticsRepo
from app.repositories.api_usage_repo import ApiUsageRepo
from app.repositories.user_repo import UserRepo
from app.utils.gemini_client import GeminiClient
from app.utils.prompt_builder import PromptBuilder


def now_utc():
    return now_ist()


class ChatbotService:
    """
    Context-aware research chatbot using Gemini API.
    """

    def __init__(self, db=None):
        self.sessions = ChatSessionRepo(db=db)
        self.messages = ChatMessageRepo(db=db)
        self.summaries = SummaryRepository(db=db)
        self.graph = GraphRepo(db=db)
        self.papers = PaperRepo(db=db)
        self.queries = QueryRepo(db=db)
        self.notes = NoteRepo(db=db)
        self.analytics = AnalyticsRepo(db=db)
        self.api_usage = ApiUsageRepo(db=db)
        self.users = UserRepo(db=db)
        self.llm = GeminiClient(model_env="GEMINI_MODEL", default_model="gemini-2.5-flash-lite")
        self.prompts = PromptBuilder(
            max_chars=int(os.getenv("CHATBOT_MAX_CONTEXT_CHARS", "12000"))
        )

        self.max_history = int(os.getenv("CHATBOT_MAX_MESSAGES", "20"))
        self.max_session_messages = int(os.getenv("CHATBOT_MAX_SESSION_MESSAGES", "200"))

    async def create_session(self, user_id: str, title: str | None = None) -> str:
        doc = {
            "user_id": ObjectId(user_id),
            "title": (title or "New session").strip()[:120],
            "created_at": now_utc(),
            "last_used_at": now_utc(),
        }
        res = await self.sessions.create_session(ObjectId(user_id), doc["title"])
        return str(res.inserted_id)

    async def list_sessions(self, user_id: str, limit: int = 50) -> List[dict]:
        rows = await self.sessions.list_sessions(ObjectId(user_id), limit=limit)
        return [self._serialize_session(r) for r in rows]

    async def rename_session(self, user_id: str, session_id: str, title: str) -> dict:
        session = await self.sessions.get_for_user(
            ObjectId(user_id), ObjectId(session_id)
        )
        if not session:
            raise ValueError("Session not found")
        clean_title = (title or "").strip()[:120]
        if not clean_title:
            raise ValueError("Title required")
        await self.sessions.update_title(ObjectId(user_id), ObjectId(session_id), clean_title)
        updated = await self.sessions.get_for_user(ObjectId(user_id), ObjectId(session_id))
        return self._serialize_session(updated)

    async def clear_session_messages(self, user_id: str, session_id: str) -> dict:
        session = await self.sessions.get_for_user(
            ObjectId(user_id), ObjectId(session_id)
        )
        if not session:
            raise ValueError("Session not found")
        res = await self.messages.delete_for_user_session(
            ObjectId(user_id), ObjectId(session_id)
        )
        return {"deleted_count": res.deleted_count}

    async def delete_session(self, user_id: str, session_id: str) -> dict:
        session = await self.sessions.get_for_user(
            ObjectId(user_id), ObjectId(session_id)
        )
        if not session:
            raise ValueError("Session not found")
        await self.messages.delete_for_user_session(
            ObjectId(user_id), ObjectId(session_id)
        )
        res = await self.sessions.delete_session(
            ObjectId(user_id), ObjectId(session_id)
        )
        return {"deleted": res.deleted_count > 0}

    async def get_messages(self, user_id: str, session_id: str, limit: int = 50) -> List[dict]:
        rows = await self.messages.messages_for_user_session(
            ObjectId(user_id), ObjectId(session_id), limit=limit
        )
        return [self._serialize_message(r) for r in rows]

    async def ask(
        self,
        user_id: str,
        message: str,
        session_id: str | None,
        paper_ids: list | None,
        request_meta: dict | None = None,
    ) -> dict:
        if not message or not message.strip():
            raise ValueError("Message required")

        if session_id:
            session = await self.sessions.get_for_user(
                ObjectId(user_id), ObjectId(session_id)
            )
            if not session:
                raise ValueError("Session not found")
        else:
            session_id = await self.create_session(user_id=user_id, title=message[:60])

        msg_count = await self.messages.count_for_user_session(
            ObjectId(user_id), ObjectId(session_id)
        )
        if msg_count >= self.max_session_messages:
            raise ValueError("Session message limit reached")

        prompt, context_papers = await self._build_context(
            user_id=user_id,
            session_id=session_id,
            message=message,
            paper_ids=paper_ids or [],
        )

        start = now_utc()
        answer = await self.llm.generate(
            prompt=prompt,
            fallback_text="Insufficient information in current papers.",
        )
        if answer.strip() == "Insufficient information in current papers.":
            fallback_prompt = (
                "You are a helpful research assistant. Answer the user's question clearly and concisely.\n\n"
                f"User: {message.strip()}"
            )
            answer = await self.llm.generate(
                prompt=fallback_prompt,
                fallback_text="Sorry, I can't answer that right now.",
            )
        end = now_utc()

        await self._persist_message(user_id, session_id, "user", message)
        await self._persist_message(
            user_id, session_id, "assistant", answer, meta={"context_papers": context_papers}
        )

        await self._log_analytics(
            user_id=user_id,
            session_id=session_id,
            context_papers=context_papers,
            prompt=prompt,
            response=answer,
        )
        latency_ms = max(0, int((end - start).total_seconds() * 1000))
        tokens = len(prompt) + len(answer)
        await self._log_api_usage(
            user_id=user_id,
            endpoint="/chat/message",
            status_code=200,
            latency_ms=latency_ms,
            tokens=tokens,
            model=self.llm.model,
            ip=request_meta.get("ip") if request_meta else None,
            user_agent=request_meta.get("user_agent") if request_meta else None,
            source=request_meta.get("source") if request_meta else "api",
        )

        return {"answer": answer, "sources": context_papers}

    async def _build_context(
        self,
        user_id: str,
        session_id: str,
        message: str,
        paper_ids: list,
    ) -> tuple[str, list]:
        system_text = (
            "You are a research assistant. Answer ONLY using the provided context. "
            'If context is insufficient, say: "Insufficient information in current papers." '
            "Cite paper titles when answering. Do not hallucinate. Be concise and structured."
        )

        recent_msgs = await self.messages.recent_for_user_session(
            ObjectId(user_id), ObjectId(session_id), limit=self.max_history
        )

        titles = await self._paper_titles(user_id, paper_ids)
        paper_uids = await self._paper_uids(user_id, paper_ids)
        paper_refs = await self._paper_refs(user_id, paper_ids)
        summary_docs = await self.summaries.list_for_refs(
            user_id=user_id,
            refs=paper_refs,
            summary_type="short",
        )

        related_titles = []
        related_edges = []
        if paper_ids:
            primary_id = paper_ids[0]
            primary_uid = paper_uids.get(primary_id) or primary_id
            related = await self.graph.get_related(primary_uid, limit=10)
            related_edges = related or []
            for r in related_edges:
                rid = r.get("related_paper_id")
                if rid:
                    related_titles.append(rid)

        notes = await self._notes_for_papers(user_id, paper_ids)

        queries = []
        subject = await self.queries.latest_subject_for_user(ObjectId(user_id))
        if subject:
            queries.append({"subject_area": subject})

        summaries_for_prompt = []
        for s in summary_docs:
            qid = str(s.get("query_id")) if s.get("query_id") else None
            uid = s.get("paper_uid")
            title = None
            if uid:
                title = await self._title_by_paper_uid(user_id, uid)
            summaries_for_prompt.append(
                {
                    "paper_uid": uid,
                    "query_id": qid,
                    "title": title,
                    "content": s.get("content"),
                }
            )

        prompt = self.prompts.build(
            system_instructions=system_text,
            user_question=message,
            history=recent_msgs,
            queries=queries,
            summaries=summaries_for_prompt,
            graph_edges=related_edges,
            notes=notes,
        )

        sources = []
        title_by_uid = await self._paper_titles_by_uid(user_id, list(paper_uids.values()))
        for s in summary_docs:
            uid = s.get("paper_uid")
            if uid:
                sources.append(title_by_uid.get(uid) or uid)

        related_title_map = await self._paper_titles_by_uid(user_id, related_titles)
        for rid in related_titles:
            sources.append(related_title_map.get(rid) or rid)
        return prompt, sources

    async def _paper_titles(self, user_id: str, paper_ids: list):
        ids = [ObjectId(pid) for pid in paper_ids if ObjectId.is_valid(pid)]
        if not ids:
            return {}
        rows = await self.papers.list_by_ids_for_user(ids, ObjectId(user_id))
        return {str(r["_id"]): r.get("title") for r in rows}

    async def _paper_uids(self, user_id: str, paper_ids: list):
        ids = [ObjectId(pid) for pid in paper_ids if ObjectId.is_valid(pid)]
        if not ids:
            return {}
        rows = await self.papers.list_by_ids_for_user(ids, ObjectId(user_id))
        return {str(r["_id"]): r.get("paper_uid") for r in rows if r.get("paper_uid")}

    async def _paper_refs(self, user_id: str, paper_ids: list):
        ids = [ObjectId(pid) for pid in paper_ids if ObjectId.is_valid(pid)]
        if not ids:
            return []
        rows = await self.papers.list_by_ids_for_user(ids, ObjectId(user_id))
        refs = []
        for r in rows:
            if r.get("query_id") and r.get("paper_uid"):
                refs.append(
                    {
                        "query_id": r.get("query_id"),
                        "paper_uid": r.get("paper_uid"),
                    }
                )
        return refs

    async def _title_by_paper_uid(self, user_id: str, paper_uid: str):
        if not paper_uid:
            return None
        rows = await self.papers.list_by_paper_uids(ObjectId(user_id), [paper_uid])
        if not rows:
            return None
        return rows[0].get("title")

    async def _paper_titles_by_uid(self, user_id: str, paper_uids: list):
        if not paper_uids:
            return {}
        rows = await self.papers.list_by_paper_uids(ObjectId(user_id), paper_uids)
        return {r.get("paper_uid"): r.get("title") for r in rows if r.get("paper_uid")}

    async def _notes_for_papers(self, user_id: str, paper_ids: list):
        if not paper_ids:
            return []
        notes = []
        for pid in paper_ids[:5]:
            if not ObjectId.is_valid(pid):
                continue
            rows = await self.notes.list_for_paper(ObjectId(user_id), ObjectId(pid))
            for n in rows[:3]:
                content = (n.get("content") or "").strip()
                if content:
                    notes.append(content)
        return notes

    async def _persist_message(self, user_id: str, session_id: str, role: str, content: str, meta=None):
        doc = {
            "user_id": ObjectId(user_id),
            "session_id": ObjectId(session_id),
            "role": role,
            "content": content,
            "meta": meta or {},
            "created_at": now_utc(),
        }
        await self.messages.add_message(
            ObjectId(session_id),
            ObjectId(user_id),
            role,
            content,
            meta or {},
        )
        await self.sessions.update_last_used(
            ObjectId(user_id), ObjectId(session_id), now_utc()
        )

    async def _log_analytics(self, user_id: str, session_id: str, context_papers: list, prompt: str, response: str):
        await self.analytics.emit(
            ObjectId(user_id),
            "chat_message",
            {
                "session_id": session_id,
                "model": self.llm.model,
                "context_papers": len(context_papers),
                "prompt_length": len(prompt),
                "response_length": len(response),
            },
        )

    async def _log_api_usage(
        self,
        user_id: str,
        endpoint: str,
        status_code: int | None = None,
        latency_ms: int | None = None,
        tokens: int | None = None,
        model: str | None = None,
        ip: str | None = None,
        user_agent: str | None = None,
        source: str | None = None,
    ):
        user = await self.users.get_by_id(ObjectId(user_id))
        if user and user.get("analytics_opt_out"):
            return
        date_str = now_utc().strftime("%Y-%m-%d")
        inc = {"count": 1}
        if status_code is not None:
            if 200 <= status_code < 300:
                inc["status_2xx"] = 1
            elif 400 <= status_code < 500:
                inc["status_4xx"] = 1
            elif status_code >= 500:
                inc["status_5xx"] = 1
        if latency_ms is not None:
            inc["total_latency_ms"] = int(latency_ms)
            bucket = "gt_2000"
            if latency_ms <= 250:
                bucket = "le_250"
            elif latency_ms <= 500:
                bucket = "le_500"
            elif latency_ms <= 1000:
                bucket = "le_1000"
            elif latency_ms <= 2000:
                bucket = "le_2000"
            inc[f"latency_bucket.{bucket}"] = 1
        if tokens is not None:
            inc["total_tokens"] = int(tokens)
        if model:
            inc[f"model_tokens.{model}"] = int(tokens or 0)
        if source:
            source_key = str(source).replace(".", "_")
            inc[f"source_counts.{source_key}"] = 1

        update = {"$inc": inc}
        set_fields = {}
        if ip:
            set_fields["last_ip"] = ip
        if user_agent:
            set_fields["last_user_agent"] = user_agent
        if source:
            set_fields["source"] = source
        if set_fields:
            update["$set"] = set_fields

        await self.api_usage.update_one(
            {"user_id": ObjectId(user_id), "endpoint": endpoint, "date": date_str},
            update,
            upsert=True,
        )

    def _serialize_session(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        doc["user_id"] = str(doc["user_id"])
        return doc

    def _serialize_message(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        doc["user_id"] = str(doc["user_id"])
        doc["session_id"] = str(doc["session_id"])
        return doc
