from datetime import datetime
from app.core.time_utils import now_ist
from app.repositories.base_repo import BaseRepo


def now_utc():
    return now_ist()


class PaperGraphRepo(BaseRepo):
    collection_name = "paper_graph"

    async def get_edges(self, paper_id: str, limit: int = 50):
        cursor = (
            self.col.find({"paper_id": paper_id})
            .sort("score", -1)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def save_edge(self, paper_id: str, related_id: str, relation_type: str, score: float):
        return await self.col.update_one(
            {"paper_id": paper_id, "related_paper_id": related_id},
            {
                "$setOnInsert": {
                    "paper_id": paper_id,
                    "related_paper_id": related_id,
                    "created_at": now_utc(),
                },
                "$set": {"relation_type": relation_type},
                "$max": {"score": score},
            },
            upsert=True,
        )

    async def bulk_upsert_edges(self, edges: list):
        if not edges:
            return None
        ops = []
        for e in edges:
            ops.append(
                {
                    "updateOne": {
                        "filter": {
                            "paper_id": e["paper_id"],
                            "related_paper_id": e["related_paper_id"],
                        },
                        "update": {
                            "$setOnInsert": {
                                "paper_id": e["paper_id"],
                                "related_paper_id": e["related_paper_id"],
                                "created_at": e.get("created_at") or now_utc(),
                            },
                            "$set": {"relation_type": e["relation_type"]},
                            "$max": {"score": e["score"]},
                        },
                        "upsert": True,
                    }
                }
            )
        return await self.col.bulk_write(ops, ordered=False)
