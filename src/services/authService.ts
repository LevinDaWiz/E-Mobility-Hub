import { AUTH_DELAY_MS } from "../config/constants";
import { CREDENTIALS } from "../data/credentials";
import { useStore } from "../store";
import type { AuthAdapter, CurrentUser, Student } from "../types";
import { verifyPassword } from "../utils/passwordHash";

// ===== M1 sở hữu (UC20): đăng nhập SSO giả lập, có kiểm tra mật khẩu băm và khóa khi nhập sai nhiều lần =====
// Tài khoản mẫu và mật khẩu demo (123456) ghi ở README. Mật khẩu được băm PBKDF2 và so với `data/credentials.ts`.
// Mật khẩu đặc biệt "timeout" → Identity System không phản hồi; "expired" → hết phiên xác thực (để demo màn hình lỗi).
// Lưu ý: đây vẫn là xác thực phía trình duyệt (demo), không thay được xác thực ở server.

export type AuthErrorCode = "INVALID_ACCOUNT" | "IDENTITY_UNAVAILABLE" | "SESSION_EXPIRED" | "ACCOUNT_LOCKED";

export class AuthError extends Error {
  code: AuthErrorCode;
  retryAfterMs?: number; // ACCOUNT_LOCKED: còn bao lâu nữa được thử lại
  attemptsLeft?: number; // INVALID_ACCOUNT: số lần thử còn lại trước khi bị khóa
  constructor(code: AuthErrorCode, extra: { retryAfterMs?: number; attemptsLeft?: number } = {}) {
    super(code);
    this.name = "AuthError";
    this.code = code;
    this.retryAfterMs = extra.retryAfterMs;
    this.attemptsLeft = extra.attemptsLeft;
  }
}

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_ACCOUNT: "Tài khoản không hợp lệ",
  IDENTITY_UNAVAILABLE: "Identity System không phản hồi",
  SESSION_EXPIRED: "Hết phiên xác thực",
  ACCOUNT_LOCKED: "Tài khoản tạm khóa do nhập sai nhiều lần",
};

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 5 * 60 * 1000; // dùng giờ thật (không phải đồng hồ mô phỏng)

const STAFF_ALIASES: Record<string, string> = {
  admin: "AD001",
  operator1: "OP001",
  operator2: "OP002",
  manager: "MG001",
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ----- Đếm lần nhập sai (lưu localStorage để F5 không xóa được; lỗi lưu trữ thì chỉ đếm trong bộ nhớ) -----
const ATTEMPTS_KEY = "emh.auth.attempts";
interface AttemptState {
  count: number;
  lockedUntil: number;
}
let memoryAttempts: Record<string, AttemptState> = {};

function loadAttempts(): Record<string, AttemptState> {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (raw) memoryAttempts = JSON.parse(raw) as Record<string, AttemptState>;
  } catch {
    /* dùng bản trong bộ nhớ */
  }
  return memoryAttempts;
}

function saveAttempts(all: Record<string, AttemptState>): void {
  memoryAttempts = all;
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  } catch {
    /* bỏ qua */
  }
}

function lockRemainingMs(key: string): number {
  const entry = loadAttempts()[key];
  return entry ? Math.max(0, entry.lockedUntil - Date.now()) : 0;
}

// Ghi nhận một lần sai; ném AuthError (khóa hoặc sai kèm số lần còn lại).
function failAttempt(key: string): never {
  const all = { ...loadAttempts() };
  const prev = all[key];
  // Hết thời gian khóa thì đếm lại từ đầu.
  const count = prev && prev.lockedUntil > 0 && prev.lockedUntil <= Date.now() ? 1 : (prev?.count ?? 0) + 1;
  if (count >= MAX_FAILED_ATTEMPTS) {
    all[key] = { count, lockedUntil: Date.now() + LOCK_DURATION_MS };
    saveAttempts(all);
    throw new AuthError("ACCOUNT_LOCKED", { retryAfterMs: LOCK_DURATION_MS });
  }
  all[key] = { count, lockedUntil: 0 };
  saveAttempts(all);
  throw new AuthError("INVALID_ACCOUNT", { attemptsLeft: MAX_FAILED_ATTEMPTS - count });
}

function clearAttempts(key: string): void {
  const all = { ...loadAttempts() };
  if (key in all) {
    delete all[key];
    saveAttempts(all);
  }
}

// ----- Kiểm tra thông tin đăng nhập -----
function checkSpecialPassword(password: string): void {
  if (password === "timeout") throw new AuthError("IDENTITY_UNAVAILABLE");
  if (password === "expired") throw new AuthError("SESSION_EXPIRED");
  if (password.trim() === "") throw new AuthError("INVALID_ACCOUNT");
}

// userId = null khi tên đăng nhập không tồn tại; vẫn băm một lần để thời gian phản hồi giống nhau.
async function verifyCredentials(userId: string | null, password: string): Promise<boolean> {
  const credential = userId ? CREDENTIALS[userId] : undefined;
  if (!credential) {
    await verifyPassword(password, CREDENTIALS["2112345"]);
    return false;
  }
  return verifyPassword(password, credential);
}

// Thay bằng adapter thật khi nối University Identity System. token = JSON {username, password}.
export const mockAuthAdapter: AuthAdapter = {
  async authenticate(token: string): Promise<Student> {
    const { username, password } = JSON.parse(token) as { username: string; password: string };
    await wait(AUTH_DELAY_MS);
    checkSpecialPassword(password);

    const key = username.trim().toLowerCase();
    const remaining = lockRemainingMs(key);
    if (remaining > 0) throw new AuthError("ACCOUNT_LOCKED", { retryAfterMs: remaining });

    const student =
      useStore.getState().students.find((s) => s.studentId === key || s.email.toLowerCase() === key) ?? null;
    if (!(await verifyCredentials(student?.studentId ?? null, password))) failAttempt(key);
    clearAttempts(key);
    return student as Student;
  },
};

// Trả về tài khoản đăng nhập thành công; ném AuthError nếu thất bại. Chưa ghi vào store.
export async function signIn(username: string, password: string): Promise<CurrentUser> {
  const { accounts } = useStore.getState();
  const key = username.trim().toLowerCase();
  const staffId = STAFF_ALIASES[key];

  if (staffId) {
    await wait(AUTH_DELAY_MS);
    checkSpecialPassword(password);
    const remaining = lockRemainingMs(key);
    if (remaining > 0) throw new AuthError("ACCOUNT_LOCKED", { retryAfterMs: remaining });
    if (!(await verifyCredentials(staffId, password))) failAttempt(key);
    clearAttempts(key);
    const staff = accounts.find((a) => a.userId === staffId);
    if (!staff) throw new AuthError("INVALID_ACCOUNT");
    return staff;
  }

  const student = await mockAuthAdapter.authenticate(JSON.stringify({ username, password }));
  const account = accounts.find((a) => a.userId === student.studentId);
  if (!account) throw new AuthError("INVALID_ACCOUNT");
  return account;
}
