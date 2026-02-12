# app/services/paper_aggregator_service.py
from typing import List, Dict
import asyncio
import httpx
import hashlib

from app.schemas.assistant import PaperItem
from app.utils.links import google_scholar_search_url


class PaperAggregatorService:
    """
    FREE multi-source paper aggregator.

    Sources:
      - Semantic Scholar (highest quality)
      - OpenAlex
      - Crossref
      - arXiv

    Features:
      - Provider weighting
      - Failure isolation
      - Deduplication
      - Ranking
      - Graph-ready metadata
    """

    PROVIDER_WEIGHT = {
        "Semantic Scholar": 1.0,
        "OpenAlex": 0.9,
        "Crossref": 0.75,
        "arXiv": 0.7,
    }

    TIMEOUT = 20

    async def search_all(self, query: str, limit: int = 10) -> List[PaperItem]:
        query = (query or "").strip()
        if len(query) < 3:
            return []

        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            tasks = [
                self._safe_call(self._search_semantic_scholar, client, query, limit),
                self._safe_call(self._search_openalex, client, query, limit),
                self._safe_call(self._search_crossref, client, query, limit),
                self._safe_call(self._search_arxiv, client, query, limit),
            ]

            results: List[PaperItem] = []
            for chunk in await asyncio.gather(*tasks):
                results.extend(chunk)

        papers = self._dedupe_and_rank(results, limit)
        for p in papers:
            if not p.abstract or not str(p.abstract).strip():
                p.abstract = "NOT_AVAILABLE"
        return papers

    # -------------------------------------------------
    # Safe wrapper (no provider can break pipeline)
    # -------------------------------------------------
    async def _safe_call(self, fn, client: httpx.AsyncClient, query: str, limit: int):
        try:
            return await fn(client, query, limit)
        except Exception:
            return []

    # -------------------------------------------------
    # Ranking + Deduplication
    # -------------------------------------------------
    def _dedupe_and_rank(self, items: List[PaperItem], limit: int) -> List[PaperItem]:
        seen = {}
        for p in items:
            key = self._normalize_title(p.title)
            if not key:
                continue

            if key not in seen:
                seen[key] = p
            else:
                # prefer higher-weight source
                if self.PROVIDER_WEIGHT.get(p.source, 0) > \
                   self.PROVIDER_WEIGHT.get(seen[key].source, 0):
                    seen[key] = p

        ranked = sorted(
            seen.values(),
            key=lambda p: self.PROVIDER_WEIGHT.get(p.source, 0),
            reverse=True,
        )

        out: List[PaperItem] = []
        for p in ranked:
            if not p.url:
                p.url = google_scholar_search_url(p.title)

            # graph-ready stable id
            p.paper_uid = self._paper_uid(p)

            out.append(p)
            if len(out) >= limit:
                break

        return out

    # -------------------------------------------------
    # Helpers
    # -------------------------------------------------
    def _normalize_title(self, title: str) -> str:
        return (title or "").strip().lower()

    def _paper_uid(self, p: PaperItem) -> str:
        base = f"{p.title}|{p.year}|{p.source}"
        return hashlib.sha1(base.encode()).hexdigest()

    # -------------------------------------------------
    # PROVIDERS
    # -------------------------------------------------
    async def _search_semantic_scholar(
        self, client: httpx.AsyncClient, query: str, limit: int
    ) -> List[PaperItem]:
        base = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            "query": query,
            "limit": limit,
            "fields": "title,url,authors,year,venue,abstract"
        }

        r = await client.get(base, params=params)
        r.raise_for_status()
        data = r.json()

        out = []
        for p in data.get("data", []):
            out.append(PaperItem(
                title=p.get("title") or "Untitled",
                url=p.get("url"),
                authors=[a.get("name") for a in p.get("authors", []) if a.get("name")] or None,
                year=p.get("year"),
                venue=p.get("venue"),
                abstract=p.get("abstract"),
                source="Semantic Scholar",
            ))
        return out

    async def _search_openalex(
        self, client: httpx.AsyncClient, query: str, limit: int
    ) -> List[PaperItem]:
        base = "https://api.openalex.org/works"
        params = {"search": query, "per_page": limit}

        r = await client.get(base, params=params)
        r.raise_for_status()
        data = r.json()

        out = []
        for w in data.get("results", []):
            authors = [
                a["author"]["display_name"]
                for a in w.get("authorships", [])
                if a.get("author", {}).get("display_name")
            ]

            loc = w.get("primary_location") or {}
            url = loc.get("landing_page_url") or w.get("doi")
            abstract = self._rebuild_openalex_abstract(w.get("abstract_inverted_index"))

            out.append(PaperItem(
                title=w.get("title") or "Untitled",
                url=url,
                authors=authors or None,
                year=w.get("publication_year"),
                venue=(loc.get("source") or {}).get("display_name"),
                abstract=abstract,
                source="OpenAlex",
            ))
        return out

    async def _search_crossref(
        self, client: httpx.AsyncClient, query: str, limit: int
    ) -> List[PaperItem]:
        base = "https://api.crossref.org/works"
        params = {"query": query, "rows": limit}

        r = await client.get(base, params=params)
        r.raise_for_status()
        data = r.json()

        out = []
        for it in data.get("message", {}).get("items", []):
            authors = [
                f"{a.get('given', '')} {a.get('family', '')}".strip()
                for a in it.get("author", [])
                if a.get("family")
            ]

            issued = (it.get("issued") or {}).get("date-parts", [])
            year = issued[0][0] if issued and issued[0] else None

            out.append(PaperItem(
                title=(it.get("title") or ["Untitled"])[0],
                url=it.get("URL"),
                authors=authors or None,
                year=year,
                venue=(it.get("container-title") or [None])[0],
                abstract="NOT_AVAILABLE",
                source="Crossref",
            ))
        return out

    async def _search_arxiv(
        self, client: httpx.AsyncClient, query: str, limit: int
    ) -> List[PaperItem]:
        base = "http://export.arxiv.org/api/query"
        params = {"search_query": f"all:{query}", "start": 0, "max_results": limit}

        r = await client.get(base, params=params)
        r.raise_for_status()
        xml = r.text

        out = []
        for e in xml.split("<entry>")[1:]:
            title = self._between(e, "<title>", "</title>").replace("\n", " ").strip()
            link = self._between(e, 'href="', '"')
            published = self._between(e, "<published>", "</published>")
            year = int(published[:4]) if published[:4].isdigit() else None
            abstract = self._between(e, "<summary>", "</summary>").replace("\n", " ").strip()

            authors = [
                self._between(c, "<name>", "</name>").strip()
                for c in e.split("<author>")[1:]
            ]

            out.append(PaperItem(
                title=title or "Untitled",
                url=link or None,
                authors=authors or None,
                year=year,
                venue="arXiv",
                abstract=abstract,
                source="arXiv",
            ))
        return out

    def _rebuild_openalex_abstract(self, inverted_index: Dict | None) -> str:
        if not inverted_index:
            return ""
        positions = {}
        for token, pos_list in inverted_index.items():
            for pos in pos_list or []:
                positions[pos] = token
        if not positions:
            return ""
        return " ".join(token for _, token in sorted(positions.items()))

    def _between(self, text: str, a: str, b: str) -> str:
        try:
            return text.split(a, 1)[1].split(b, 1)[0]
        except Exception:
            return ""
