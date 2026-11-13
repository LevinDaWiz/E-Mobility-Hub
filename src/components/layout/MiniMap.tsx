import { Link } from "react-router-dom";
import { OVERLOAD_THRESHOLD, WARNING_THRESHOLD } from "../../config/constants";
import { HUB_MAP_PINS } from "../../config/mapPositions";
import { useStore } from "../../store";
import { computeHubStats } from "../../utils/hubStats";

// Bản đồ minh hoạ (không dùng bản đồ thật): các Hub là chấm có nhãn, màu theo mức sử dụng.
export function MiniMap() {
  const hubs = useStore((s) => s.hubs);
  const slots = useStore((s) => s.parkingSlots);
  const ports = useStore((s) => s.chargingPorts);
  const vehicles = useStore((s) => s.vehicles);

  return (
    <div className="relative h-60 overflow-hidden rounded-xl border border-slate-200 bg-brand-50">
      {/* "Đường" và "khối nhà" trang trí */}
      <div className="absolute left-0 right-0 top-[48%] h-4 bg-white" />
      <div className="absolute bottom-0 left-[48%] top-0 w-4 bg-white" />
      <div className="absolute left-[8%] top-[8%] h-[28%] w-[34%] rounded bg-slate-200/70" />
      <div className="absolute bottom-[16%] right-[8%] h-[26%] w-[32%] rounded bg-slate-200/70" />

      {hubs.map((hub) => {
        const pin = HUB_MAP_PINS[hub.hubId];
        if (!pin) return null;
        const { utilization } = computeHubStats({ parkingSlots: slots, chargingPorts: ports, vehicles }, hub.hubId);
        const color =
          utilization > OVERLOAD_THRESHOLD
            ? "bg-rose-600"
            : utilization >= WARNING_THRESHOLD
              ? "bg-amber-500"
              : "bg-brand-700";
        return (
          <Link
            key={hub.hubId}
            to="/app/hubs"
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          >
            <span className={`block rounded-md px-2.5 py-1 text-xs font-bold text-white shadow ${color}`}>Hub</span>
            <span className="mt-0.5 block rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow">
              {pin.label}
            </span>
          </Link>
        );
      })}

      {/* Vị trí của bạn */}
      <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-200 ring-4 ring-brand-200/50">
        <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-700" />
      </span>
    </div>
  );
}
