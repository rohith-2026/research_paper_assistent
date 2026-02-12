import axios from "axios";
import { getStoredSettings } from "../utils/settings";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  timeout: 30000,
});

const TOKEN_KEY = "rpa_access_token";
const REFRESH_KEY = "rpa_refresh_token";

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    const headers = (config.headers ?? {}) as any;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  }

  const settings = getStoredSettings();
  if (settings?.usageTracking === false) {
    const headers = (config.headers ?? {}) as any;
    headers["X-Disable-Analytics"] = "true";
    config.headers = headers;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem(REFRESH_KEY);
      if (!refresh) {
        return Promise.reject(error);
      }
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/auth/refresh`,
          { refresh_token: refresh }
        );
        const newToken = res.data?.access_token;
        const newRefresh = res.data?.refresh_token;
        if (newToken) {
          localStorage.setItem(TOKEN_KEY, newToken);
          if (newRefresh) localStorage.setItem(REFRESH_KEY, newRefresh);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
