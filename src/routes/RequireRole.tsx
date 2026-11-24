import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useStore } from "../store";
import type { Role } from "../types";
import { homePathForRole, LOGIN_PATH } from "./paths";

interface RequireRoleProps {
  allow: Role[];
  children: ReactNode;
}

// Chặn truy cập: chưa đăng nhập → /login; sai vai trò → về trang chủ đúng vai trò.
export function RequireRole({ allow, children }: RequireRoleProps) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const role = useStore((s) => s.currentUser.role);

  if (!isAuthenticated) return <Navigate to={LOGIN_PATH} replace />;
  if (!allow.includes(role)) return <Navigate to={homePathForRole(role)} replace />;
  return <>{children}</>;
}
