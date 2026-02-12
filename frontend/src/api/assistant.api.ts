import api from "./axios";

export type Prediction = {
  label: string;
  score: number;
};

export type PaperItem = {
  title: string;
  url?: string | null;
  authors?: string[] | null;
  year?: number | null;
  venue?: string | null;
  abstract?: string | null;
  source?: string | null;
  paper_uid?: string | null;
};

export type SavedPaper = {
  id: string;
  user_id: string;
  title: string;
  abstract?: string | null;
  url?: string | null;
  authors?: string[] | null;
  year?: number | null;
  venue?: string | null;
  source?: string | null;
  file_path?: string | null;
  subject_area?: string | null;
  created_at?: string;
};

export type QueryResponse = {
  subject_area: string;
  model_confidence: number;
  top_predictions: Prediction[];
  top_papers: PaperItem[];
  gpt_answer?: string | null;
  meta?: Record<string, unknown>;
};

export type HistoryItem = {
  id: string;
  user_id: string;
  created_at: string;

  // from /query-text pipeline
  text?: string;
  subject_area?: string;
  confidence?: number;
  top_predictions?: Prediction[];
  papers?: PaperItem[];
  gpt_answer?: string | null;

  // from /analyze-text legacy (old)
  input_type?: string;
  input_text?: string;
  predicted_topics?: Prediction[];
};

export type HistoryResponse = {
  items: HistoryItem[];
  total: number;
  limit: number;
};

export async function apiQueryText(text: string) {
  const res = await api.post<QueryResponse>("/assistant/query-text", { text });
  return res.data;
}

export async function apiQueryFile(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await api.post<QueryResponse>("/assistant/query-file", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}

export async function apiHistory(limit = 20, skip = 0) {
  const safeLimit = Math.min(limit, 100);
  const res = await api.get<HistoryResponse>("/assistant/history", {
    params: { limit: safeLimit, skip },
  });
  return res.data;
}

export async function apiDeleteHistoryItem(id: string) {
  const res = await api.delete(`/assistant/history/${id}`);
  return res.data;
}

export async function apiDeleteAllHistory() {
  const res = await api.delete(`/assistant/history`);
  return res.data;
}

export async function apiListSavedPapers(limit = 20, skip = 0) {
  const safeLimit = Math.min(limit, 100);
  const res = await api.get<SavedPaper[]>("/papers/saved", { params: { limit: safeLimit, skip } });
  return res.data;
}

export async function apiSavePaper(payload: PaperItem & { subject_area?: string }) {
  const res = await api.post<SavedPaper>("/papers/save", payload);
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("saved-papers-updated", { detail: res.data })
      );
      localStorage.setItem("saved_papers_updated_at", String(Date.now()));
    } catch {
      /* ignore */
    }
  }
  return res.data;
}

export type QueryPaper = PaperItem & {
  id?: string;
  query_id?: string;
  subject_area?: string | null;
  created_at?: string;
};

export async function apiPapersByQuery(queryId: string, limit = 10) {
  const res = await api.get<QueryPaper[]>("/papers/by-query", {
    params: { query_id: queryId, limit },
  });
  return res.data;
}

export async function apiHistoryById(queryId: string) {
  const res = await api.get<HistoryItem>(`/history/${queryId}`);
  return res.data;
}

export async function apiPaperDetail(queryId: string, paperUid: string) {
  const res = await api.get<PaperItem>(`/papers/queries/${queryId}/papers/${paperUid}`);
  return res.data;
}
