import axios, { type InternalAxiosRequestConfig } from "axios";

type AdminAxiosConfig = InternalAxiosRequestConfig & {
  skipAdminLogout?: boolean;
};

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  timeout: 30000,
});

const ADMIN_TOKEN_KEY = "rpa_admin_access_token";

adminApi.interceptors.request.use((config) => {
  const raw = localStorage.getItem(ADMIN_TOKEN_KEY);
  const token = raw ? raw.replace(/^"|"$/g, "").replace(/^Bearer\s+/i, "").trim() : "";
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.type && !["admin_access", "access"].includes(payload.type)) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        window.dispatchEvent(new CustomEvent("admin:logout"));
        return config;
      }
    } catch {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      window.dispatchEvent(new CustomEvent("admin:logout"));
      return config;
    }
    const headers = (config.headers ?? {}) as any;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  }
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    const cfg = error?.config as AdminAxiosConfig | undefined;
    const skipLogout = Boolean(cfg?.skipAdminLogout);
    if (error?.response?.status === 401 && !skipLogout) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      window.dispatchEvent(new CustomEvent("admin:logout"));
    }
    return Promise.reject(error);
  }
);

export default adminApi;
