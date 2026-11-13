import { AUTH_DELAY_MS } from "../config/constants";
import { useStore } from "../store";
import type { AuthAdapter, CurrentUser, Student } from "../types";

// ===== M1 sở hữu (UC20): đăng nhập SSO giả lập =====
// Quy ước demo (hiện trong khung "Tài khoản demo" ở màn hình IdP):
//   - Sinh viên: MSSV hoặc email + mật khẩu bất kỳ (khác rỗng).
//   - Nhân sự: admin / operator1 / operator2 / manager + mật khẩu bất kỳ (khác rỗng).
//   - Mật khẩu "timeout" → Identity System không phản hồi; "expired" → hết phiên xác thực.

export type AuthErrorCode = "INVALID_ACCOUNT" | "IDENTITY_UNAVAILABLE" | "SESSION_EXPIRED";

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
    this.code = code;
  }
}

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_ACCOUNT: "Tài khoản không hợp lệ",
  IDENTITY_UNAVAILABLE: "Identity System không phản hồi",
  SESSION_EXPIRED: "Hết phiên xác thực",
};

const STAFF_ALIASES: Record<string, string> = {
  admin: "AD001",
  operator1: "OP001",
  operator2: "OP002",
  manager: "MG001",
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function checkPassword(password: string): void {
  if (password === "timeout") throw new AuthError("IDENTITY_UNAVAILABLE");
  if (password === "expired") throw new AuthError("SESSION_EXPIRED");
  if (password.trim() === "") throw new AuthError("INVALID_ACCOUNT");
}

// Thay bằng adapter thật khi nối University Identity System. token = JSON {username, password}.
export const mockAuthAdapter: AuthAdapter = {
  async authenticate(token: string): Promise<Student> {
    const { username, password } = JSON.parse(token) as { username: string; password: string };
    await wait(AUTH_DELAY_MS);
    checkPassword(password);

    const key = username.trim().toLowerCase();
    const student = useStore
      .getState()
      .students.find((s) => s.studentId === key || s.email.toLowerCase() === key);
    if (!student) throw new AuthError("INVALID_ACCOUNT");
    return student;
  },
};

// Trả về tài khoản đăng nhập thành công; ném AuthError nếu thất bại. Chưa ghi vào store.
export async function signIn(username: string, password: string): Promise<CurrentUser> {
  const { accounts } = useStore.getState();
  const staffId = STAFF_ALIASES[username.trim().toLowerCase()];

  if (staffId) {
    await wait(AUTH_DELAY_MS);
    checkPassword(password);
    const staff = accounts.find((a) => a.userId === staffId);
    if (!staff) throw new AuthError("INVALID_ACCOUNT");
    return staff;
  }

  const student = await mockAuthAdapter.authenticate(JSON.stringify({ username, password }));
  const account = accounts.find((a) => a.userId === student.studentId);
  if (!account) throw new AuthError("INVALID_ACCOUNT");
  return account;
}
