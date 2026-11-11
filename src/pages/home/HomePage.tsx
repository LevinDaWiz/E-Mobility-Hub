import { Badge, Card, Progress } from "../../components/ui";
import { OVERLOAD_THRESHOLD } from "../../config/constants";
import { useHubStats } from "../../hooks/useHubStats";
import { useStore } from "../../store";
import { utilizationBarClass } from "../../styles/statusColors";
import type { Hub } from "../../types";

function HubCard({ hub }: { hub: Hub }) {
  const stats = useHubStats(hub.hubId);
  const overloaded = stats.utilization > OVERLOAD_THRESHOLD;

  return (
    <Card
      title={hub.name}
      actions={<Badge value={overloaded ? "CRITICAL" : "INFO"} label={hub.type} />}
    >
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

// Trang chủ tạm: xác nhận store, seed data và các hàm dùng chung hoạt động.
export function HomePage() {
  const hubs = useStore((s) => s.hubs);
  const vehicleCount = useStore((s) => s.vehicles.length);
  const user = useStore((s) => s.currentUser);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Smart E-Mobility Hub</h1>
        <p className="text-sm text-slate-500">
          Xin chào {user.name}. Mạng lưới hiện có {hubs.length} Hub và {vehicleCount} xe dùng chung.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {hubs.map((hub) => (
          <HubCard key={hub.hubId} hub={hub} />
        ))}
      </div>
    </div>
  );
}
