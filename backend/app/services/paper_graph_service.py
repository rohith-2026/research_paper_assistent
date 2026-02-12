from __future__ import annotations

from datetime import datetime
from app.core.time_utils import now_ist
from typing import List

from bson import ObjectId

from app.repositories.graph_repo import GraphRepo
from app.repositories.query_repo import QueryRepo
from app.repositories.paper_repo import PaperRepo
from app.repositories.analytics_repo import AnalyticsRepo
from app.utils.similarity import cosine_similarity, keyword_overlap_score, year_proximity_score


def now_utc():
    return now_ist()


class PaperGraphService:
    def __init__(self, db=None):
        self.graph = GraphRepo(db=db)
        self.queries = QueryRepo(db=db)
        self.papers = PaperRepo(db=db)
        self.analytics = AnalyticsRepo(db=db)
        self.threshold = 0.55

    async def build_from_query(self, user_id: str, query_id: str):
        if not ObjectId.is_valid(query_id):
            raise ValueError("Invalid query id")
        q = await self.queries.get_by_id(ObjectId(query_id), ObjectId(user_id))
        if not q:
            raise ValueError("Query not found")

        papers = q.get("papers") or []
        edges = self._build_edges(papers)
        await self.graph.bulk_insert(edges)

        nodes, edges_out = await self._graph_output(papers, edges, user_id=user_id)
        await self.analytics.emit(
            ObjectId(user_id),
            "graph_built",
            {"paper_id": None, "nodes": len(nodes), "edges": len(edges_out)},
        )
        return {"nodes": nodes, "edges": edges_out}

    async def get_graph_for_paper(self, user_id: str, paper_id: str, limit: int = 50):
        related = await self.graph.get_related(paper_id, limit=limit)
        paper_uids = [paper_id] + [r.get("related_paper_id") for r in related if r.get("related_paper_id")]
        titles = await self._resolve_titles(ObjectId(user_id), paper_uids)

        nodes = [
            {"id": pid, "label": titles.get(pid) or pid, "type": "paper"}
            for pid in set(paper_uids)
        ]
        edges = [
            {
                "from": r["paper_id"],
                "to": r["related_paper_id"],
                "weight": r.get("weight", 0.0),
                "relation": r.get("relation_type"),
            }
            for r in related
        ]
        return {"nodes": nodes, "edges": edges}

    async def get_neighbors(self, paper_id: str, limit: int = 20):
        related = await self.graph.get_related(paper_id, limit=limit)
        return [
            {
                "from": r["paper_id"],
                "to": r["related_paper_id"],
                "weight": r.get("weight", 0.0),
                "relation": r.get("relation_type"),
            }
            for r in related
        ]

    def _build_edges(self, papers: List[dict]) -> List[dict]:
        items = [self._normalize_paper(p) for p in papers]
        items = [p for p in items if p["paper_id"]]
        edges = []
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                score, relation = self._score(items[i], items[j])
                if score >= self.threshold:
                    edges.append(
                        {
                            "paper_id": items[i]["paper_id"],
                            "related_paper_id": items[j]["paper_id"],
                            "relation_type": relation,
                            "weight": score,
                            "created_at": now_utc(),
                        }
                    )
                    edges.append(
                        {
                            "paper_id": items[j]["paper_id"],
                            "related_paper_id": items[i]["paper_id"],
                            "relation_type": relation,
                            "weight": score,
                            "created_at": now_utc(),
                        }
                    )
        return edges

    def _score(self, a: dict, b: dict) -> tuple[float, str]:
        text_a = f"{a.get('title','')} {a.get('abstract','')}"
        text_b = f"{b.get('title','')} {b.get('abstract','')}"
        keyword = keyword_overlap_score(text_a, text_b)
        embed = cosine_similarity(self._hash_vec(text_a), self._hash_vec(text_b))
        author = self._author_overlap(a.get("authors"), b.get("authors"))
        year = year_proximity_score(a.get("year"), b.get("year"))

        score = (
            0.35 * keyword
            + 0.35 * embed
            + 0.2 * author
            + 0.1 * year
        )
        relation = self._dominant_relation(
            {"similarity": embed, "same_subject": keyword, "author_overlap": author}
        )
        return round(score, 4), relation

    def _normalize_paper(self, paper: dict) -> dict:
        return {
            "paper_id": paper.get("paper_uid") or paper.get("paper_id") or paper.get("url") or paper.get("id"),
            "title": paper.get("title") or "",
            "abstract": paper.get("abstract") or "",
            "authors": paper.get("authors") or [],
            "year": paper.get("year"),
            "subject": paper.get("subject_area"),
        }

    def _hash_vec(self, text: str, dim: int = 256) -> List[float]:
        import hashlib
        vec = [0.0] * dim
        for token in (text or "").lower().split():
            digest = hashlib.md5(token.encode("utf-8")).hexdigest()
            idx = int(digest[:8], 16) % dim
            vec[idx] += 1.0
        return vec

    def _author_overlap(self, a, b) -> float:
        if not a or not b:
            return 0.0
        a_set = set([x.strip().lower() for x in a if x])
        b_set = set([x.strip().lower() for x in b if x])
        if not a_set or not b_set:
            return 0.0
        return len(a_set & b_set) / max(1, len(a_set | b_set))

    def _dominant_relation(self, scores: dict) -> str:
        rel = max(scores.items(), key=lambda x: x[1])[0]
        return rel

    async def _resolve_titles(self, user_id: ObjectId, paper_uids: list) -> dict:
        title_map = {}
        rows = await self.papers.list_by_paper_uids(user_id, paper_uids)
        for r in rows:
            puid = r.get("paper_uid")
            if puid:
                title_map[puid] = r.get("title")

        object_ids = []
        for pid in paper_uids:
            if ObjectId.is_valid(pid):
                object_ids.append(ObjectId(pid))
        if object_ids:
            rows_by_id = await self.papers.list_by_ids_for_user(object_ids, user_id)
            for r in rows_by_id:
                title_map[str(r.get("_id"))] = r.get("title")

        return title_map

    async def _graph_output(self, papers: list, edges: list, user_id: str):
        ids = set([p.get("paper_uid") for p in papers if p.get("paper_uid")])
        for e in edges:
            ids.add(e.get("paper_id"))
            ids.add(e.get("related_paper_id"))
        titles = await self._resolve_titles(ObjectId(user_id), list(ids))
        nodes = [{"id": pid, "label": titles.get(pid) or pid, "type": "paper"} for pid in ids]
        edges_out = [
            {
                "from": e["paper_id"],
                "to": e["related_paper_id"],
                "weight": e.get("weight", 0.0),
                "relation": e.get("relation_type"),
            }
            for e in edges
        ]
        return nodes, edges_out
