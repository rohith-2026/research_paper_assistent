import { createContext } from "react";

export type User = {
  id?: string;
  name?: string;
  email?: string;
};

export type AuthState = {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user?: User | null) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthState>({} as AuthState);
