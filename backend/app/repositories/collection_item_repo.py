from app.repositories.base_repo import BaseRepo

class CollectionItemRepo(BaseRepo):
    collection_name = "collection_items"

    async def items_in_collection(self, collection_id):
        return await self.col.find({
            "collection_id": collection_id
        }).to_list(None)
