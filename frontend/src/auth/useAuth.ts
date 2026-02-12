import { useContext } from "react";
import { AuthContext } from "./AuthContext";

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx;
}
