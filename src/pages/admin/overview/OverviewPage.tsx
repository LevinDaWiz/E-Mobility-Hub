import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DataSourcePanel } from "../../../components/DataSourcePanel";
import { Badge, Card, Progress, Table, type Column } from "../../../components/ui";
import { useStore } from "../../../store";
import { utilizationBarClass } from "../../../styles/statusColors";
import { PortStatus, SlotStatus, VehicleStatus, type Alert, type Hub } from "../../../types";
import { computeHubStats } from "../../../utils/hubStats";
import { getHubDisplayStatus, HUB_STATUS_LABELS } from "../../../utils/hubStatus";

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-brand-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Tổng quan site quản trị (UC11, M1): chỉ số mạng lưới, trạng thái nguồn dữ liệu, bảng Hub, cảnh báo mở.
export function OverviewPage() {
  const hubs = useStore((s) => s.hubs);
  const slots = useStore((s) => s.parkingSlots);
  const ports = useStore((s) => s.chargingPorts);
  const vehicles = useStore((s) => s.vehicles);
  const alerts = useStore((s) => s.alerts);
  const tickets = useStore((s) => s.tickets);

  const stateInput = useMemo(() => ({ parkingSlots: slots, chargingPorts: ports, vehicles }), [slots, ports, vehicles]);
  const totalSlots = slots.length;
  const usedSlots = slots.filter((p) => p.status === SlotStatus.OCCUPIED || p.status === SlotStatus.RESERVED).length;
  const availableVehicles = vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE).length;
  const faults =
    vehicles.filter((v) => v.status === VehicleStatus.FAULTY).length +
    ports.filter((p) => p.status === PortStatus.FAULTY).length;
  const openAlerts = alerts.filter((a) => !a.resolved);
  const openTickets = tickets.filter((t) => t.status !== "CLOSED").length;

  const hubColumns: Column<Hub>[] = [
    {
      header: "Hub",
      cell: (h) => (
        <Link to={`/admin/hubs/${h.hubId}`} className="font-medium text-brand-700 hover:underline">
          {h.name}
        </Link>
      ),
    },
    {
      header: "Trạng thái",
      cell: (h) => {
        const status = getHubDisplayStatus(h, computeHubStats(stateInput, h.hubId).utilization);
        return <Badge value={status} label={HUB_STATUS_LABELS[status]} />;
      },
    },
    {
      header: "Mức sử dụng",
      className: "min-w-40",
      cell: (h) => {
        const u = computeHubStats(stateInput, h.hubId).utilization;
        return <Progress value={u * 100} barClassName={utilizationBarClass(u, h.thresholds.overload, h.thresholds.parkingWarning)} />;
      },
    },
    {
      header: "Chỗ trống",
      cell: (h) => {
        const s = computeHubStats(stateInput, h.hubId);
        return `${s.freeSlots}/${s.totalSlots}`;
      },
    },
    {
      header: "Cổng sạc trống",
      cell: (h) => {
        const s = computeHubStats(stateInput, h.hubId);
        return `${s.freePorts}/${s.totalPorts}`;
      },
    },
    { header: "Xe sẵn sàng", cell: (h) => computeHubStats(stateInput, h.hubId).availableVehicles },
    {
      header: "Lỗi",
      cell: (h) => {
        const s = computeHubStats(stateInput, h.hubId);
        const n = s.faultyVehicles + s.faultyPorts;
        return n > 0 ? <Badge value="FAULTY" label={String(n)} /> : "0";
      },
    },
  ];

  const alertColumns: Column<Alert>[] = [
    { header: "Mức độ", cell: (a) => <Badge value={a.severity} /> },
    { header: "Hub", cell: (a) => hubs.find((h) => h.hubId === a.hubId)?.name ?? a.hubId },
    { header: "Loại", cell: (a) => a.type },
    { header: "Thời gian", cell: (a) => new Date(a.createdAt).toLocaleTimeString("vi-VN") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-950">Tổng quan</h1>
        <p className="text-sm text-slate-500">Giám sát mạng lưới Hub theo thời gian thực (UC11).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Hub đang hoạt động" value={String(hubs.length)} />
        <Kpi
          label="Chỗ đỗ đã dùng"
          value={totalSlots === 0 ? "0%" : `${Math.round((usedSlots / totalSlots) * 100)}%`}
          hint={`${usedSlots}/${totalSlots} chỗ`}
        />
        <Kpi label="Xe sẵn sàng" value={`${availableVehicles}/${vehicles.length}`} hint="Xe dùng chung" />
        <Kpi label="Sự cố đang mở" value={String(faults + openTickets)} hint={`${faults} thiết bị lỗi · ${openTickets} ticket`} />
      </div>

      <DataSourcePanel />

      <Card
        title="Các Hub"
        actions={
          <Link to="/admin/hubs" className="text-xs font-medium text-brand-700">
            Quản lý Hub &amp; chỗ đỗ ›
          </Link>
        }
      >
        <Table columns={hubColumns} rows={hubs} rowKey={(h) => h.hubId} />
      </Card>

      <Card
        title={`Cảnh báo đang mở (${openAlerts.length})`}
        actions={
          <Link to="/admin/overload" className="text-xs font-medium text-brand-700">
            Xử lý quá tải ›
          </Link>
        }
      >
        <Table
          columns={alertColumns}
          rows={openAlerts}
          rowKey={(a) => a.alertId}
          empty="Chưa có cảnh báo. Thử Metro surge ở Demo controls."
        />
      </Card>
    </div>
  );
}
