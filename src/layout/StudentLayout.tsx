import { NavLink, Outlet } from "react-router-dom";
import { Logo } from "../components/layout/Logo";
import { MobileFrame } from "../components/layout/MobileFrame";
import { NotificationBell } from "../components/NotificationBell";
import { STUDENT_TABS } from "../config/studentNav";

// Khung app mobile: header (logo + thông báo), nội dung, thanh tab dưới cùng.
export function StudentLayout() {
  return (
    <MobileFrame>
      <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-6">
        <div className="flex items-center gap-2">
          <Logo className="h-9 w-auto" />
          <div className="leading-tight">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-950">Smart E-Mobility Hub</p>
            <p className="text-xs text-slate-500">ĐHQG-HCM · Di chuyển xanh</p>
          </div>
        </div>
        <NotificationBell label="Thông báo" />
      </header>

      <main className="flex-1 px-5 pb-28 pt-2">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 z-30 grid w-full max-w-[430px] grid-cols-4 border-t border-slate-200 bg-white"
        aria-label="Điều hướng chính"
      >
        {STUDENT_TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-3 text-xs font-medium ${
                isActive ? "bg-brand-100 text-brand-900" : "text-slate-500"
              }`
            }
          >
            <span aria-hidden="true" className="text-base leading-none">
              {tab.icon}
            </span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </MobileFrame>
  );
}
