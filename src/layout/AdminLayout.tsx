import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../components/layout/Logo";
import { NotificationBell } from "../components/NotificationBell";
import { ROLE_LABELS } from "../config/roles";
import { appModules } from "../routes/modules";
import { LOGIN_PATH } from "../routes/paths";
import { useStore } from "../store";
import type { AdminNavItem } from "../routes/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

function isSectionActive(item: AdminNavItem, pathname: string): boolean {
  if (item.children?.some((c) => pathname === c.path || pathname.startsWith(`${c.path}/`))) return true;
  if (item.path === "/admin") return pathname === "/admin";
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

const linkClass = (isActive: boolean) =>
  `flex items-center gap-3 rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors ${
    isActive ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10"
  }`;

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);

  const items = appModules
    .filter((m) => m.area === "admin")
    .flatMap((m) => m.adminNav ?? [])
    .filter((item) => item.roles.includes(user.role))
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex h-full flex-col bg-brand-900 text-white">
      <div className="flex items-center gap-3 px-5 py-6">
        <Logo className="h-9 w-auto rounded bg-white/95 p-0.5" />
        <div className="leading-tight">
          <p className="text-lg font-bold">E-Mobility Hub</p>
          <p className="text-xs text-white/75">Quản trị vận hành</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Menu quản trị">
        {items.map((item) => (
          <div key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === "/admin"}
              onClick={onNavigate}
              className={({ isActive }) => linkClass(isActive)}
            >
              <span aria-hidden="true" className="w-5 text-center">
                {item.icon ?? "≡"}
              </span>
              {item.label}
            </NavLink>
            {item.children && isSectionActive(item, pathname) && (
              <div className="mb-1 ml-8 mt-1 space-y-0.5 border-l border-white/20 pl-3">
                {item.children.map((child) => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-1.5 text-sm ${
                        isActive ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10"
                      }`
                    }
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-bold text-slate-900">
          {initials(user.name)}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-brand-100">{user.name}</p>
          <p className="text-xs text-white/65">{ROLE_LABELS[user.role]}</p>
        </div>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs text-white/75 hover:bg-white/10"
          onClick={() => {
            logout();
            navigate(LOGIN_PATH);
          }}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

// Khung site quản trị: sidebar cố định (màn hình lớn) hoặc ngăn kéo (màn hình nhỏ) + nội dung.
export function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block">
        <Sidebar />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/50" />
          <aside className="absolute inset-y-0 left-0 w-72" onClick={(e) => e.stopPropagation()}>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-lg text-slate-700 hover:bg-slate-100 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Mở menu"
          >
            ☰
          </button>
          <span className="hidden text-sm text-slate-500 lg:inline">Smart E-Mobility Hub · Quản trị vận hành</span>
          <NotificationBell />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
