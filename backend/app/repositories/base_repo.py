from typing import Any, Dict
from app.db.mongo import get_db

class BaseRepo:
    collection_name: str

    def __init__(self, db=None):
        self._db = db if db is not None else get_db()

    @property
    def col(self):
        return self._db[self.collection_name]

    async def find_one(self, query: Dict[str, Any]):
        return await self.col.find_one(query)

    async def insert(self, doc: Dict[str, Any]):
        res = await self.col.insert_one(doc)
        return res
    
    async def insert_many(self, docs: list[Dict[str, Any]]):
        return await self.col.insert_many(docs)

    async def update_one(self, query, update, **kwargs):
        return await self.col.update_one(query, update, **kwargs)

    async def delete_one(self, query):
        return await self.col.delete_one(query)

    async def delete_many(self, query):
        return await self.col.delete_many(query)

    async def count(self, query):
        return await self.col.count_documents(query)
