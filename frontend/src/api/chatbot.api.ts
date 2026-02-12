import api from "./axios";

export type ChatSession = {
  id: string;
  user_id: string;
  title: string;
  created_at?: string | null;
  last_used_at?: string | null;
};

export type ChatMessage = {
  id: string;
  session_id: string;
  user_id: string;
  role: string;
  content: string;
  meta: Record<string, unknown>;
  created_at?: string | null;
};

export type ChatAskResponse = {
  answer: string;
  sources: string[];
};

export async function apiCreateChatSession() {
  const res = await api.post<{ session_id: string }>("/chat/session");
  return res.data;
}

export async function apiListChatSessions(limit = 50) {
  const res = await api.get<ChatSession[]>("/chat/sessions", { params: { limit } });
  return res.data;
}

export async function apiRenameChatSession(session_id: string, title: string) {
  const res = await api.patch<ChatSession>(`/chat/sessions/${session_id}`, { title });
  return res.data;
}

export async function apiGetChatMessages(session_id: string) {
  const res = await api.get<ChatMessage[]>(`/chat/messages/${session_id}`);
  return res.data;
}

export async function apiClearChatMessages(session_id: string) {
  const res = await api.delete(`/chat/messages/${session_id}`);
  return res.data;
}

export async function apiAskChatbot(message: string, session_id?: string | null, paper_ids?: string[]) {
  const res = await api.post<ChatAskResponse>("/chat/message", {
    message,
    session_id: session_id || undefined,
    paper_ids: paper_ids && paper_ids.length ? paper_ids : undefined,
  });
  return res.data;
}

export async function apiDeleteChatSession(session_id: string) {
  const res = await api.delete(`/chat/sessions/${session_id}`);
  return res.data;
}
