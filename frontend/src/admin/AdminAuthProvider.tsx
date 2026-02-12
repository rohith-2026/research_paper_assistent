import { useEffect, useMemo, useState } from "react";
import { AdminAuthContext, AdminUser } from "./AdminAuthContext";

const ADMIN_TOKEN_KEY = "rpa_admin_access_token";
const ADMIN_USER_KEY = "rpa_admin_user";

export default function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  });
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const login = (token: string, u?: AdminUser | null) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    setAccessToken(token);
    if (u) {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(u));
      setAdmin(u);
    }
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    setAccessToken(null);
    setAdmin(null);
  };

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("admin:logout", handler);
    return () => window.removeEventListener("admin:logout", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!accessToken) return;
    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      if (payload?.type && !["admin_access", "access"].includes(payload.type)) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_USER_KEY);
        setAccessToken(null);
        setAdmin(null);
      }
    } catch {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
      setAccessToken(null);
      setAdmin(null);
    }
  }, [accessToken]);

  const value = useMemo(
    () => ({
      accessToken,
      admin,
      isAuthenticated: !!accessToken,
      login,
      logout,
    }),
    [accessToken, admin]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
