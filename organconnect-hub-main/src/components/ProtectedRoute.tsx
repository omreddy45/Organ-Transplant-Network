import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth, Role } from "@/contexts/AuthContext";

interface Props {
  allowedRoles?: Role[];
  children: ReactNode;
}

export const ProtectedRoute = ({ allowedRoles, children }: Props) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/404" replace />;
  return <>{children}</>;
};
