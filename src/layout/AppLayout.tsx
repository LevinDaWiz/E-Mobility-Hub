import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { DemoPanel } from "../components/DemoPanel";
import { NotificationBell } from "../components/NotificationBell";
import { ToastHost } from "../components/ui";
import { ROLE_LABELS, ROLES } from "../config/roles";
import { startTickEngine, stopTickEngine } from "../engine/tickEngine";
import { appModules } from "../routes/modules";
import { useStore } from "../store";
import type { Role } from "../types";

const selectClass = "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm";

export function AppLayout() {
  const user = useStore((s) => s.currentUser);
  const accounts = useStore((s) => s.accounts);
  const switchRole = useStore((s) => s.switchRole);
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  useEffect(() => {
    startTickEngine();
    return stopTickEngine;
  }, []);

  const navItems = appModules.flatMap((m) => m.nav).filter((n) => n.roles.includes(user.role));
  const sameRoleAccounts = accounts.filter((a) => a.role === user.role);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <NavLink to="/" className="text-base font-bold text-indigo-700">
            ⚡ E-Mobility Hub
          </NavLink>

          <div className="ml-auto flex items-center gap-2">
            <select
              aria-label="Vai trò"
              className={selectClass}
              value={user.role}
              onChange={(e) => switchRole(e.target.value as Role)}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            {sameRoleAccounts.length > 1 && (
              <select
                aria-label="Tài khoản"
                className={selectClass}
                value={user.userId}
                onChange={(e) => setCurrentUser(e.target.value)}
              >
                {sameRoleAccounts.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.userId} – {a.name}
                  </option>
                ))}
              </select>
            )}
            <NotificationBell />
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Menu chính">
          {[{ label: "Trang chủ", path: "/" }, ...navItems].map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      <ToastHost />
      <DemoPanel />
    </div>
  );
}
