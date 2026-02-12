import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../auth/useAuth";

export default function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
