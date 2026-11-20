import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { Badge } from "../../../components/ui";
import { useHubStats } from "../../../hooks/useHubStats";
import { useStore } from "../../../store";
import { formatTime } from "../../../utils/format";
import { getHubDisplayStatus, HUB_STATUS_LABELS } from "../../../utils/hubStatus";

const TABS = [
  { label: "Tổng quan", suffix: "", end: true },
  { label: "Chỗ đỗ", suffix: "/slots", end: false },
  { label: "Cổng sạc", suffix: "/ports", end: false },
  { label: "Cấu hình", suffix: "/config", end: false },
];

// Khung chi tiết một Hub: tiêu đề, trạng thái, 4 tab (Tổng quan, Chỗ đỗ, Cổng sạc, Cấu hình).
export function HubDetailLayout() {
  const { hubId = "" } = useParams();
  const { pathname } = useLocation();
  const hub = useStore((s) => s.hubs.find((h) => h.hubId === hubId));
  const stats = useHubStats(hubId);

  if (!hub) {
    return (
      <div className="space-y-3">
        <p className="text-slate-600">Không tìm thấy Hub “{hubId}”.</p>
        <Link to="/admin/hubs" className="text-sm font-semibold text-brand-700">
          ← Về danh sách Hub
        </Link>
      </div>
    );
  }

  const base = `/admin/hubs/${hub.hubId}`;
  const status = getHubDisplayStatus(hub, stats.utilization);
  const currentTab = TABS.find((t) => t.suffix !== "" && pathname.endsWith(t.suffix));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">
            <Link to="/admin/hubs" className="hover:underline">
              Hub &amp; chỗ đỗ
            </Link>{" "}
            / {hub.area}
            {currentTab ? ` / ${currentTab.label}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-brand-950">{hub.name}</h1>
            <Badge value={status} label={HUB_STATUS_LABELS[status]} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Hub ID: {hub.hubId} · Khu vực: {hub.area} · Cập nhật lần cuối: {formatTime(hub.updatedAt)}
          </p>
        </div>
        <Link to="/admin/hubs" className="rounded-md bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Về danh sách
        </Link>
      </div>

      <nav className="inline-flex flex-wrap gap-1 rounded-lg bg-brand-50 p-1" aria-label="Các tab của Hub">
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            to={`${base}${tab.suffix}`}
            end={tab.end}
            className={({ isActive }) =>
              `rounded-md px-6 py-1.5 text-sm font-medium ${isActive ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-white"}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
