export interface Student {
  studentId: string;
  name: string;
  email: string;
}

export interface Operator {
  operatorId: string;
  name: string;
  role: string;
}

export type Role = "STUDENT" | "OPERATOR" | "ADMIN" | "MANAGEMENT";

// Người dùng đang đăng nhập / tài khoản mẫu dùng cho đăng nhập giả lập (UC20).
// userId trùng studentId (SVxxx), operatorId (OPxxx) hoặc id admin/ban quản lý.
export interface CurrentUser {
  userId: string;
  name: string;
  role: Role;
  email?: string;
}
