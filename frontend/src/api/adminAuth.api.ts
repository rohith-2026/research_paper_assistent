import adminApi from "./adminAxios";

export type AdminLoginPayload = {
  email: string;
  password: string;
};

export async function apiAdminLogin(payload: AdminLoginPayload) {
  const res = await adminApi.post("/admin/auth/login", payload);
  return res.data;
}

export async function apiAdminMe() {
  const res = await adminApi.get("/admin/auth/me");
  return res.data;
}

export async function apiAdminLogout() {
  const res = await adminApi.post("/admin/auth/logout");
  return res.data;
}

export async function apiAdminSessions() {
  const res = await adminApi.get("/admin/auth/sessions");
  return res.data;
}

export async function apiAdminRevokeSession(sessionId: string) {
  const res = await adminApi.delete(`/admin/auth/sessions/${sessionId}`);
  return res.data;
}
