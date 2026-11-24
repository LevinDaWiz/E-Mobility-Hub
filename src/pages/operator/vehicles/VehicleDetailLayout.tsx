import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { Badge } from "../../../components/ui";
import { useStore } from "../../../store";
import { VehicleType } from "../../../types";

const TABS = [
  { label: "Thông tin", suffix: "", end: true },
  { label: "Lịch sử chuyến", suffix: "/trips", end: false },
  { label: "Sự cố", suffix: "/incidents", end: false },
];

// Khung chi tiết một phương tiện: tiêu đề, trạng thái và các tab (Thông tin, Lịch sử chuyến, Sự cố).
export function VehicleDetailLayout() {
  const { vehicleId = "" } = useParams();
  const { pathname } = useLocation();
  const vehicle = useStore((s) => s.vehicles.find((v) => v.vehicleId === vehicleId));
  const hubName = useStore((s) => s.hubs.find((h) => h.hubId === vehicle?.currentHubId)?.name);

  if (!vehicle) {
    return (
      <div className="space-y-3">
        <p className="text-slate-600">Không tìm thấy phương tiện “{vehicleId}” (có thể đã bị xóa).</p>
        <Link to="/admin/vehicles" className="text-sm font-semibold text-brand-700">
          ← Về danh sách phương tiện
        </Link>
      </div>
    );
  }

  const base = `/admin/vehicles/${vehicle.vehicleId}`;
  const currentTab = TABS.find((t) => t.suffix !== "" && pathname.endsWith(t.suffix));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">
            <Link to="/admin/vehicles" className="hover:underline">
              Phương tiện
            </Link>{" "}
            / {vehicle.vehicleId}
            {currentTab ? ` / ${currentTab.label}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-brand-950">{vehicle.vehicleId}</h1>
            <Badge value={vehicle.status} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {vehicle.type === VehicleType.E_BIKE ? "Xe đạp điện" : "Xe máy điện"} · {hubName ?? vehicle.currentHubId} · Pin{" "}
            {vehicle.batteryLevel}%
          </p>
        </div>
        <Link to="/admin/vehicles" className="rounded-md bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Về danh sách
        </Link>
      </div>

      <nav className="inline-flex flex-wrap gap-1 rounded-lg bg-brand-50 p-1" aria-label="Các tab của phương tiện">
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
