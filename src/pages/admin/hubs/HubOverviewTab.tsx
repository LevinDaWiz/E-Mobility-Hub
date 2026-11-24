import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Card, Progress, StatCard } from "../../../components/ui";
import { useHubStats } from "../../../hooks/useHubStats";
import { useStore } from "../../../store";
import { utilizationBarClass } from "../../../styles/statusColors";
import { AlertSeverity } from "../../../types";
import { formatDateTime } from "../../../utils/format";
import { getHubAlerts, getHubDisplayStatus, HUB_STATUS_LABELS, maxAlertSeverity } from "../../../utils/hubStatus";

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <div className="text-sm font-bold text-brand-950">{children}</div>
    </div>
  );
}

// Tab "Tổng quan" của Hub (UC11): số liệu chính, thông tin, tài nguyên, cảnh báo.
export function HubOverviewTab() {
  const { hubId = "" } = useParams();
  const hub = useStore((s) => s.hubs.find((h) => h.hubId === hubId));
  const alerts = useStore((s) => s.alerts);
  const stats = useHubStats(hubId);
  if (!hub) return null;

  const status = getHubDisplayStatus(hub, stats.utilization);
  const items = getHubAlerts(hub, stats, alerts);
  const top = maxAlertSeverity(items);
  const critical = top === AlertSeverity.CRITICAL;
  const pct = Math.round(stats.utilization * 100);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Xe / Sức chứa" value={`${stats.occupiedSlots} / ${hub.parkingCapacity}`} />
        <StatCard label="Chỗ đỗ chưa có xe" value={hub.parkingCapacity - stats.occupiedSlots} />
        <StatCard label="Cổng sạc khả dụng" value={`${stats.freePorts} / ${stats.totalPorts}`} />
        <StatCard label="Mức sử dụng Hub" value={`${pct}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Thông tin Hub">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <InfoItem label="Hub ID">{hub.hubId}</InfoItem>
            <InfoItem label="Tên Hub">{hub.name}</InfoItem>
            <InfoItem label="Vị trí">{hub.location}</InfoItem>
            <InfoItem label="Trạng thái">
              <Badge value={status} label={HUB_STATUS_LABELS[status]} />
            </InfoItem>
            <InfoItem label="Capacity">{hub.parkingCapacity}</InfoItem>
            <InfoItem label="Cập nhật lần cuối">{formatDateTime(hub.updatedAt)}</InfoItem>
          </div>
          <Link to={`/admin/vehicles?hub=${hub.hubId}`} className="mt-3 inline-block text-xs font-semibold text-brand-700">
            Xem phương tiện tại Hub này →
          </Link>
        </Card>

        <Card title="Tổng quan tài nguyên">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Phương tiện</dt>
              <dd className="font-bold">{stats.occupiedSlots}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Chỗ đỗ</dt>
              <dd className="font-bold">
                {stats.occupiedSlots} / {hub.parkingCapacity}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Cổng sạc</dt>
              <dd className="font-bold">
                {stats.freePorts} / {stats.totalPorts}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Tài nguyên lỗi</dt>
              <dd className="font-bold text-red-700">{stats.faultyPorts + stats.faultyVehicles}</dd>
            </div>
          </dl>
          <div className="mt-3">
            <Progress
              value={stats.utilization * 100}
              label={`Hub occupancy · ${pct}%`}
              barClassName={utilizationBarClass(stats.utilization, hub.thresholds.overload, hub.thresholds.parkingWarning)}
            />
          </div>
        </Card>
      </div>

      {items.length > 0 ? (
        <section
          className={`rounded-xl border px-5 py-4 ${critical ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={`text-xl font-bold ${critical ? "text-red-700" : "text-amber-700"}`}>
                {items.length} cảnh báo · {critical ? "Critical" : "Warning"}
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                {items.map((item) => (
                  <li key={`${item.source}-${item.message}`}>{item.message}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                Ngưỡng cảnh báo chỗ đỗ: {Math.round(hub.thresholds.parkingWarning * 100)}%. Xử lý quá tải thuộc Nhân viên vận hành (UC15).
              </p>
            </div>
            <Link to="/admin/overload" className="rounded-md bg-brand-700 px-8 py-2.5 text-sm font-medium text-white hover:opacity-90">
              Xem chi tiết
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
          Không có cảnh báo. Hub đang hoạt động trong ngưỡng cho phép.
        </section>
      )}
    </div>
  );
}
