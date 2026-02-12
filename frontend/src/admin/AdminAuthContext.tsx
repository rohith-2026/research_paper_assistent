import { createContext } from "react";

export type AdminUser = {
  id: string;
  email?: string;
  role?: string;
};

export type AdminAuthContextType = {
  accessToken: string | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  login: (token: string, admin?: AdminUser | null) => void;
  logout: () => void;
};

export const AdminAuthContext = createContext<AdminAuthContextType>({
  accessToken: null,
  admin: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});
