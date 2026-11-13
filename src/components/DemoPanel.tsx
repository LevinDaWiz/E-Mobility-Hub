import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SIM_SPEEDS } from "../config/constants";
import { ROLE_LABELS } from "../config/roles";
import { homePathForRole, LOGIN_PATH } from "../routes/paths";
import { useStore } from "../store";
import { Button } from "./ui";

// Panel điều khiển demo (M1 sẽ bổ sung: Metro surge, gây lỗi cổng / xe).
// Có thể đổi nhanh tài khoản mà không cần đi qua màn hình đăng nhập.
export function DemoPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const clock = useStore((s) => s.clock);
  const accounts = useStore((s) => s.accounts);
  const user = useStore((s) => s.currentUser);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const setClockSpeed = useStore((s) => s.setClockSpeed);
  const setClockRunning = useStore((s) => s.setClockRunning);
  const resetAll = useStore((s) => s.resetAll);

  const switchAccount = (userId: string) => {
    const account = accounts.find((a) => a.userId === userId);
    if (!account) return;
    login(userId);
    navigate(homePathForRole(account.role));
  };

  return (
    <div className="fixed bottom-20 right-3 z-40 sm:bottom-4 sm:right-4">
      {open ? (
        <div className="w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Demo controls</h2>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>

          <label className="mb-1 block text-xs font-medium text-slate-500">Đổi nhanh tài khoản</label>
          <select
            className="mb-3 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            value={isAuthenticated ? user.userId : ""}
            onChange={(e) => switchAccount(e.target.value)}
          >
            {!isAuthenticated && <option value="">(chưa đăng nhập)</option>}
            {accounts.map((a) => (
              <option key={a.userId} value={a.userId}>
                {ROLE_LABELS[a.role]} – {a.userId} {a.name}
              </option>
            ))}
          </select>

          <p className="mb-2 font-mono text-xs text-slate-600">
            Giờ mô phỏng: {new Date(clock.now).toLocaleTimeString("vi-VN")}
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SIM_SPEEDS.map((speed) => (
              <Button
                key={speed}
                size="sm"
                variant={clock.speed === speed ? "primary" : "secondary"}
                onClick={() => setClockSpeed(speed)}
              >
                ×{speed}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setClockRunning(!clock.running)}>
              {clock.running ? "Tạm dừng" : "Tiếp tục"}
            </Button>
            <Button size="sm" variant="danger" onClick={resetAll}>
              Reset dữ liệu
            </Button>
            {isAuthenticated && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  logout();
                  navigate(LOGIN_PATH);
                }}
              >
                Đăng xuất
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          ⚙ Demo
        </Button>
      )}
    </div>
  );
}
