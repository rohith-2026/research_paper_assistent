import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AuthContext, User } from "./AuthContext";

const TOKEN_KEY = "rpa_access_token";
const REFRESH_KEY = "rpa_refresh_token";
const USER_KEY = "rpa_user";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  });
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  });

  const login = (token: string, u?: User | null) => {
    localStorage.setItem(TOKEN_KEY, token);
    setAccessToken(token);

    if (u) {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
    } else {
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setAccessToken(null);
    setUser(null);
  };

  useEffect(() => {
    const handler = () => {
      logout();
      toast.error("Session expired. Please sign in again.");
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      user,
      isAuthenticated: !!accessToken,
      login,
      logout,
    }),
    [accessToken, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

