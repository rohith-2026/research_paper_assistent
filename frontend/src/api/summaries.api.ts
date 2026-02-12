import api from "./axios";

export type SummaryType = "short" | "detailed";

export type SummaryItem = {
  id: string;
  query_id: string;
  paper_uid: string;
  summary_type: SummaryType;
  content: string;
  created_at: string;
};

export type SummaryListResponse = {
  items: SummaryItem[];
};

export async function apiGenerateSummary(
  query_id: string,
  paper_uid: string,
  summary_type: SummaryType
) {
  const res = await api.post<SummaryItem>("/summaries/generate", {
    query_id,
    paper_uid,
    summary_type,
  });
  return res.data;
}

export async function apiListSummaries(query_id: string, paper_uid: string) {
  const res = await api.get<SummaryListResponse>(`/summaries/${query_id}/${paper_uid}`);
  return res.data;
}
