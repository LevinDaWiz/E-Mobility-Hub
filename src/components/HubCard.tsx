import { OVERLOAD_THRESHOLD } from "../config/constants";
import { useHubStats } from "../hooks/useHubStats";
import { utilizationBarClass } from "../styles/statusColors";
import type { Hub } from "../types";
import { Badge, Card, Progress } from "./ui";

// Thẻ tóm tắt một Hub (mức sử dụng chỗ đỗ, xe sẵn sàng, cổng sạc, lỗi). Dùng ở app mobile và site quản trị.
export function HubCard({ hub }: { hub: Hub }) {
  const stats = useHubStats(hub.hubId);
  const overloaded = stats.utilization > OVERLOAD_THRESHOLD;

  return (
    <Card title={hub.name} actions={<Badge value={overloaded ? "CRITICAL" : "INFO"} label={hub.type} />}>
      <p className="mb-3 text-xs text-slate-500">{hub.location}</p>
      <Progress
        value={stats.utilization * 100}
        label={`Chỗ đỗ: ${stats.occupiedSlots + stats.reservedSlots}/${stats.totalSlots}`}
        barClassName={utilizationBarClass(stats.utilization)}
      />
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-slate-50 py-2">
          <dd className="text-base font-semibold text-slate-900">{stats.availableVehicles}</dd>
          <dt className="text-slate-500">Xe sẵn sàng</dt>
        </div>
        <div className="rounded-md bg-slate-50 py-2">
          <dd className="text-base font-semibold text-slate-900">
            {stats.freePorts}/{stats.totalPorts}
          </dd>
          <dt className="text-slate-500">Cổng sạc trống</dt>
        </div>
        <div className="rounded-md bg-slate-50 py-2">
          <dd className="text-base font-semibold text-slate-900">{stats.faultyVehicles + stats.faultyPorts}</dd>
          <dt className="text-slate-500">Lỗi</dt>
        </div>
      </dl>
    </Card>
  );
}
