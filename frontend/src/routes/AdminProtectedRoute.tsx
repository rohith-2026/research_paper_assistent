import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAdminAuth } from "../admin/useAdminAuth";

export default function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
