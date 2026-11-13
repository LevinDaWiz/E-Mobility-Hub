import type { Role } from "../types";

export const STUDENT_HOME = "/app";
export const ADMIN_HOME = "/admin";
export const LOGIN_PATH = "/login";

export const STAFF_ROLES: Role[] = ["OPERATOR", "ADMIN", "MANAGEMENT"];

// Trang chủ theo vai trò: sinh viên vào app mobile, còn lại vào site quản trị.
export function homePathForRole(role: Role): string {
  return role === "STUDENT" ? STUDENT_HOME : ADMIN_HOME;
}
