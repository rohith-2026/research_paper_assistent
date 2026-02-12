import api from "./axios";

export type DownloadFormat = "pdf" | "bibtex" | "csv" | "json" | "notes" | "summary";

export type DownloadItem = {
  id: string;
  user_id: string;
  paper_id: string;
  format: DownloadFormat;
  created_at: string;
};

export async function apiListDownloads() {
  const res = await api.get<DownloadItem[]>("/downloads");
  return res.data;
}

export async function apiRecordDownload(paper_id: string, format: DownloadFormat) {
  const res = await api.post<DownloadItem>("/downloads", { paper_id, format });
  return res.data;
}
