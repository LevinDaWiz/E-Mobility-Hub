import type { Role } from "../types";

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Sinh viên",
  OPERATOR: "Vận hành",
  ADMIN: "Quản trị",
  MANAGEMENT: "Ban quản lý",
};

export const ROLES: Role[] = ["STUDENT", "OPERATOR", "ADMIN", "MANAGEMENT"];
