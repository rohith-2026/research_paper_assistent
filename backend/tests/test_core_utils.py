import asyncio

from app.repositories.base_repo import BaseRepo
from app.services.paper_search_service import PaperSearchService
from app.utils.links import google_scholar_search_url


class _FakeResult:
    def __init__(self, inserted_id="fake-id"):
        self.inserted_id = inserted_id


class _FakeCollection:
    def __init__(self):
        self.last_update_kwargs = None
        self.last_update_args = None
        self.last_insert_doc = None

    async def insert_one(self, doc):
        self.last_insert_doc = doc
        return _FakeResult()

    async def update_one(self, query, update, **kwargs):
        self.last_update_args = (query, update)
        self.last_update_kwargs = kwargs
        return {"ok": 1}

    async def find_one(self, query):
        return None

    async def delete_one(self, query):
        return None

    async def delete_many(self, query):
        return None

    async def count_documents(self, query):
        return 0


class _FakeDB:
    def __init__(self):
        self._col = _FakeCollection()

    def __getitem__(self, name):
        return self._col


class _TestRepo(BaseRepo):
    collection_name = "test"


def test_base_repo_insert_returns_result():
    repo = _TestRepo(db=_FakeDB())
    res = asyncio.run(repo.insert({"x": 1}))
    assert hasattr(res, "inserted_id")


def test_base_repo_update_one_accepts_kwargs():
    db = _FakeDB()
    repo = _TestRepo(db=db)
    asyncio.run(repo.update_one({"a": 1}, {"$set": {"b": 2}}, upsert=True))
    assert db._col.last_update_kwargs.get("upsert") is True


def test_google_scholar_search_url():
    url = google_scholar_search_url("Hello World")
    assert url.startswith("https://scholar.google.com/scholar?q=")


def test_arxiv_helpers_parse_basic_fields():
    xml = (
        "<entry>"
        "<id>http://arxiv.org/abs/1234.5678</id>"
        "<title>Sample Title</title>"
        "<summary>Sample summary</summary>"
        "<author><name>Jane Doe</name></author>"
        "</entry>"
    )
    svc = PaperSearchService()
    assert svc._find_arxiv_link(xml) == "http://arxiv.org/abs/1234.5678"
    assert svc._tag_value(xml, "title") == "Sample Title"
