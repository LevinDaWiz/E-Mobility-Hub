import { Navigate } from "react-router-dom";
import { useStore } from "../store";
import { homePathForRole, LOGIN_PATH } from "./paths";

export function RootRedirect() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const role = useStore((s) => s.currentUser.role);
  return <Navigate to={isAuthenticated ? homePathForRole(role) : LOGIN_PATH} replace />;
}
