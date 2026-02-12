// src/api/auth.api.ts
import api from "./axios";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name?: string;
  email: string;
  password: string;
};

export type UserMeResponse = {
  id: string;
  name: string;
  email: string;
  role?: string;
  created_at?: string;
  last_login_at?: string;
  analytics_opt_out?: boolean;
};

export type AccountUsageResponse = {
  counts: {
    collections: number;
    collection_items: number;
    queries: number;
    papers: number;
    summaries: number;
    notes: number;
    downloads: number;
    chat_sessions: number;
    chat_messages: number;
    feedback: number;
  };
  total_records: number;
  last_login_at?: string;
};

export type PreferencesPayload = {
  analytics_opt_out?: boolean;
};

/* ================= AUTH ================= */

export async function apiLogin(payload: LoginPayload) {
  const res = await api.post("/auth/login", payload);
  return res.data;
}

export async function apiRegister(payload: RegisterPayload) {
  const res = await api.post("/auth/register", payload);
  return res.data;
}

export async function apiForgotPassword(email: string) {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
}

export async function apiResetPassword(token: string, password: string) {
  const res = await api.post("/auth/reset-password", {
    reset_token: token,
    new_password: password,
  });
  return res.data;
}

export async function apiLogoutAll() {
  const res = await api.post("/auth/logout-all");
  return res.data;
}

/* ================= PROFILE ================= */

// ✅ Fetch logged-in user details from backend
export async function apiGetMe(): Promise<UserMeResponse> {
  const res = await api.get("/auth/me"); // 🔁 change only if backend route differs
  return res.data;
}

export async function apiDeleteAccount() {
  const res = await api.delete("/auth/me");
  return res.data;
}

export async function apiDeleteAccountData() {
  const res = await api.delete("/auth/me/data");
  return res.data;
}

export async function apiAccountUsage(): Promise<AccountUsageResponse> {
  const res = await api.get("/auth/usage");
  return res.data;
}

export async function apiExportAllData() {
  const res = await api.get("/auth/export");
  return res.data;
}

export async function apiUpdatePreferences(payload: PreferencesPayload) {
  const res = await api.patch("/auth/preferences", payload);
  return res.data;
}
