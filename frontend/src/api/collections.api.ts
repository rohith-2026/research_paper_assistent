import api from "./axios";

export type Collection = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  tags?: string[];
};

export type CollectionItem = {
  id: string;
  collection_id: string;
  paper_id: string;
  added_at: string;
};

export async function apiListCollections() {
  const res = await api.get<Collection[]>("/collections");
  return res.data;
}

export async function apiCreateCollection(name: string) {
  const res = await api.post<Collection>("/collections", { name });
  return res.data;
}

export async function apiRenameCollection(collection_id: string, name: string) {
  const res = await api.put(`/collections/${collection_id}`, { name });
  return res.data;
}

export async function apiUpdateCollectionTags(collection_id: string, tags: string[]) {
  const res = await api.put(`/collections/${collection_id}/tags`, { tags });
  return res.data;
}

export async function apiDeleteCollection(collection_id: string) {
  const res = await api.delete(`/collections/${collection_id}`);
  return res.data;
}

export async function apiListCollectionItems(collection_id: string) {
  const res = await api.get<CollectionItem[]>(`/collections/${collection_id}/items`);
  return res.data;
}

export async function apiAddCollectionItem(collection_id: string, paper_id: string) {
  const res = await api.post<CollectionItem>(`/collections/${collection_id}/items`, {
    paper_id,
  });
  return res.data;
}

export async function apiRemoveCollectionItem(collection_id: string, paper_id: string) {
  const res = await api.delete(`/collections/${collection_id}/items/${paper_id}`);
  return res.data;
}

export async function apiReorderCollections(ordered_ids: string[]) {
  const res = await api.put(`/collections/reorder`, { ordered_ids });
  return res.data;
}
