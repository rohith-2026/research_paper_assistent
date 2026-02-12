# app/services/paper_search_service.py

from typing import List, Optional
import asyncio
import re
import httpx

from app.schemas.assistant import PaperItem


def _clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


class PaperSearchService:
    """
    FREE paper search aggregator:
      - Semantic Scholar (best quality)
      - Crossref (DOI-heavy)
      - arXiv (preprints)
      - OpenAlex (broad coverage)

    Returns merged top 10 papers without duplicates.
    """

    SEMANTIC_URL = "https://api.semanticscholar.org/graph/v1"
    CROSSREF_URL = "https://api.crossref.org/works"
    ARXIV_URL = "http://export.arxiv.org/api/query"
    OPENALEX_URL = "https://api.openalex.org/works"

    async def search(self, query: str, limit: int = 10) -> List[PaperItem]:
        if not query or len(query.strip()) < 3:
            return []

        query = _clean_text(query)

        async with httpx.AsyncClient(timeout=25) as client:
            parts = await asyncio.gather(
                self._search_semantic(client, query, limit=limit),
                self._search_crossref(client, query, limit=limit),
                self._search_arxiv(client, query, limit=limit),
                self._search_openalex(client, query, limit=limit),
                return_exceptions=False,
            )

            results = []
            for chunk in parts:
                results.extend(chunk)

        # OK merge & de-duplicate by URL/title
        final = self._dedupe(results)

        # OK return exactly 10 if possible
        return final[:limit]

    # ----------------------- SOURCES -----------------------

    async def _search_semantic(self, client: httpx.AsyncClient, query: str, limit: int) -> List[PaperItem]:
        params = {
            "query": query,
            "limit": min(limit, 10),
            "fields": "title,url,authors,year,venue,abstract",
        }
        r = await client.get(f"{self.SEMANTIC_URL}/paper/search", params=params)
        if r.status_code != 200:
            return []
        data = r.json()

        out: List[PaperItem] = []
        for p in data.get("data", []):
            authors = [a.get("name") for a in (p.get("authors") or []) if a.get("name")]
            out.append(
                PaperItem(
                    title=p.get("title") or "Untitled",
                    url=p.get("url"),
                    authors=authors or None,
                    year=p.get("year"),
                    venue=p.get("venue"),
                    abstract=p.get("abstract"),
                )
            )
        return out

    async def _search_crossref(self, client: httpx.AsyncClient, query: str, limit: int) -> List[PaperItem]:
        params = {"query": query, "rows": min(limit, 10)}
        r = await client.get(self.CROSSREF_URL, params=params)
        if r.status_code != 200:
            return []
        items = (r.json().get("message") or {}).get("items") or []

        out: List[PaperItem] = []
        for it in items:
            title_list = it.get("title") or []
            title = title_list[0] if title_list else "Untitled"

            doi = it.get("DOI")
            url = f"https://doi.org/{doi}" if doi else it.get("URL")

            year = None
            issued = ((it.get("issued") or {}).get("date-parts") or [])
            if issued and issued[0]:
                year = issued[0][0]

            authors = []
            for a in it.get("author") or []:
                given = a.get("given") or ""
                family = a.get("family") or ""
                nm = (given + " " + family).strip()
                if nm:
                    authors.append(nm)

            out.append(
                PaperItem(
                    title=_clean_text(title),
                    url=url,
                    authors=authors or None,
                    year=year,
                    venue=(it.get("container-title") or [None])[0],
                    abstract=None,
                )
            )
        return out

    async def _search_openalex(self, client: httpx.AsyncClient, query: str, limit: int) -> List[PaperItem]:
        params = {"search": query, "per_page": min(limit, 10)}
        r = await client.get(self.OPENALEX_URL, params=params)
        if r.status_code != 200:
            return []
        results = r.json().get("results") or []

        out: List[PaperItem] = []
        for w in results:
            title = w.get("title") or "Untitled"
            year = w.get("publication_year")
            url = None

            # prefer doi
            doi = w.get("doi")
            if doi:
                url = doi
            else:
                url = (w.get("primary_location") or {}).get("landing_page_url")

            authors = []
            for a in (w.get("authorships") or []):
                nm = ((a.get("author") or {}).get("display_name") or "").strip()
                if nm:
                    authors.append(nm)

            out.append(
                PaperItem(
                    title=_clean_text(title),
                    url=url,
                    authors=authors or None,
                    year=year,
                    venue=((w.get("host_venue") or {}).get("display_name")),
                    abstract=None,
                )
            )
        return out

    async def _search_arxiv(self, client: httpx.AsyncClient, query: str, limit: int) -> List[PaperItem]:
        # arXiv returns XML feed
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": min(limit, 10),
        }
        r = await client.get(self.ARXIV_URL, params=params)
        if r.status_code != 200:
            return []

        text = r.text or ""
        # quick parse (without XML libs)
        entries = text.split("<entry>")
        if len(entries) <= 1:
            return []

        out: List[PaperItem] = []
        for e in entries[1:]:
            title = self._tag_value(e, "title")
            link = self._find_arxiv_link(e)
            summary = self._tag_value(e, "summary")

            authors = re.findall(r"<name>(.*?)</name>", e, flags=re.S)
            year = None
            published = self._tag_value(e, "published")
            if published and len(published) >= 4:
                year = int(published[:4])

            out.append(
                PaperItem(
                    title=_clean_text(title) or "Untitled",
                    url=link,
                    authors=[_clean_text(a) for a in authors] or None,
                    year=year,
                    venue="arXiv",
                    abstract=_clean_text(summary) if summary else None,
                )
            )
        return out

    # ----------------------- HELPERS -----------------------

    def _dedupe(self, items: List[PaperItem]) -> List[PaperItem]:
        seen = set()
        final: List[PaperItem] = []
        for p in items:
            key = (p.url or "").strip().lower() or (p.title or "").strip().lower()
            if not key:
                continue
            if key in seen:
                continue
            seen.add(key)
            final.append(p)
        return final

    def _tag_value(self, xml: str, tag: str) -> Optional[str]:
        m = re.search(rf"<{tag}>(.*?)</{tag}>", xml, flags=re.S)
        return m.group(1).strip() if m else None

    def _find_arxiv_link(self, xml: str) -> Optional[str]:
        # find first id link
        m = re.search(r"<id>(.*?)</id>", xml, flags=re.S)
        return m.group(1).strip() if m else None
