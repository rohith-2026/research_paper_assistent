import api from "./axios";

export type AnalyticsOverview = {
  total_queries: number;
  avg_confidence: number;
  papers_saved: number;
  top_subjects: { subject: string; count: number }[];
};

export type AnalyticsConfidence = {
  daily: { date: string; avg: number; ma?: number | null; count: number }[];
  drift: number;
};

export type AnalyticsSubjects = Record<string, { date: string; count: number }[]>;

export type AnalyticsApiUsage = {
  endpoints: { endpoint: string; count: number; normalized: number }[];
};

export async function apiAnalyticsOverview() {
  const res = await api.get<AnalyticsOverview>("/analytics/overview");
  return res.data;
}

export async function apiAnalyticsConfidence(start_date?: string, end_date?: string) {
  const res = await api.get<AnalyticsConfidence>("/analytics/confidence", {
    params: { start_date, end_date },
  });
  return res.data;
}

export async function apiAnalyticsSubjects(start_date?: string, end_date?: string) {
  const res = await api.get<AnalyticsSubjects>("/analytics/subjects", {
    params: { start_date, end_date },
  });
  return res.data;
}

export async function apiAnalyticsApiUsage(start_date?: string, end_date?: string) {
  const res = await api.get<AnalyticsApiUsage>("/analytics/api-usage", {
    params: { start_date, end_date },
  });
  return res.data;
}
