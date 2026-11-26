import { useStore } from "../store";

// ===== M1: lưu phiên đăng nhập để F5 không phải đăng nhập lại =====
// Chỉ lưu userId + hạn dùng (không lưu mật khẩu). Dữ liệu nghiệp vụ vẫn nằm trong bộ nhớ và về seed khi tải lại trang.
// localStorage có thể không dùng được (chế độ riêng tư, bị chặn) nên mọi thao tác đều bọc try/catch.

const SESSION_KEY = "emh.auth.session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 giờ

interface StoredSession {
  userId: string;
  expiresAt: number;
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof data.userId !== "string" || typeof data.expiresAt !== "number") return null;
    return { userId: data.userId, expiresAt: data.expiresAt };
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* bỏ qua: chỉ mất khả năng giữ phiên khi F5 */
  }
}

let started = false;

// Gọi MỘT lần trước khi render: khôi phục phiên còn hạn rồi theo dõi đăng nhập / đăng xuất để cập nhật.
export function initSession(): void {
  if (started) return;
  started = true;

  const saved = readSession();
  if (saved) {
    const store = useStore.getState();
    const known = store.accounts.some((a) => a.userId === saved.userId);
    if (known && saved.expiresAt > Date.now()) store.login(saved.userId);
    else writeSession(null);
  }

  // Đăng nhập, đăng xuất hoặc đổi tài khoản (kể cả bằng khung Demo) đều cập nhật phiên.
  useStore.subscribe((state, prev) => {
    if (state.isAuthenticated === prev.isAuthenticated && state.currentUser.userId === prev.currentUser.userId) return;
    if (state.isAuthenticated) writeSession({ userId: state.currentUser.userId, expiresAt: Date.now() + SESSION_TTL_MS });
    else writeSession(null);
  });
}
