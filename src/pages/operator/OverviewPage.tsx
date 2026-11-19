import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DataSourcePanel } from "../../components/DataSourcePanel";
import { Badge, Button, Card, Progress, Table, type Column } from "../../components/ui";
import { OVERLOAD_THRESHOLD, WARNING_THRESHOLD } from "../../config/constants";
import { HUB_MAP_PINS } from "../../config/mapPositions";
import { OperationsService } from "../../services/operationsService";
import { useStore } from "../../store";
import type { OpsAlert } from "../../store/opsSlice";
import { utilizationBarClass } from "../../styles/statusColors";
import { PortStatus, SlotStatus, VehicleStatus, type Hub } from "../../types";
import { computeHubStats } from "../../utils/hubStats";

function KpiCard({
  label,
  value,
  hint,
  status = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  status?: "neutral" | "warning" | "danger" | "success";
}) {
  const borderColor =
    status === "danger"
      ? "border-rose-300 bg-rose-50/40"
      : status === "warning"
      ? "border-amber-300 bg-amber-50/40"
      : status === "success"
      ? "border-emerald-300 bg-emerald-50/40"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-all ${borderColor}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-brand-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Tổng quan site quản trị (UC11). Bản đồ mạng lưới, KPI, Hubs, Cảnh báo hoạt động.
export function OverviewPage() {
  const navigate = useNavigate();
  const hubs = useStore((s) => s.hubs);
  const slots = useStore((s) => s.parkingSlots);
  const ports = useStore((s) => s.chargingPorts);
  const vehicles = useStore((s) => s.vehicles);
  const alerts = useStore((s) => s.alerts);
  const tickets = useStore((s) => s.tickets);

  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);

  const stateInput = { parkingSlots: slots, chargingPorts: ports, vehicles };
  const totalSlots = slots.length;
  const usedSlots = slots.filter((p) => p.status !== SlotStatus.FREE).length;
  const availableVehicles = vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE).length;
  const faults =
    vehicles.filter((v) => v.status === VehicleStatus.FAULTY).length +
    ports.filter((p) => p.status === PortStatus.FAULTY).length;
  const openAlerts = alerts.filter((a) => !a.resolved);
  const openTickets = tickets.filter((t) => t.status !== "CLOSED").length;

  // Lọc Hubs nếu click vào bản đồ
  const displayedHubs = selectedHubId ? hubs.filter((h) => h.hubId === selectedHubId) : hubs;

  const hubColumns: Column<Hub>[] = [
    {
      header: "Hub",
      cell: (h) => (
        <div>
          <span className="font-semibold text-slate-900">{h.name}</span>
          <p className="text-xs text-slate-400">{h.hubId}</p>
        </div>
      ),
    },
    { header: "Loại", cell: (h) => <Badge value="INFO" label={h.type} /> },
    {
      header: "Mức sử dụng",
      className: "min-w-44",
      cell: (h) => {
        const u = computeHubStats(stateInput, h.hubId).utilization;
        const isOver = u > OVERLOAD_THRESHOLD;
        const isWarn = u >= WARNING_THRESHOLD;
        return (
          <div className="space-y-1">
            <Progress
              value={Math.round(u * 100)}
              barClassName={utilizationBarClass(u)}
              label={`${Math.round(u * 100)}%`}
            />
            {isOver && (
              <span className="inline-block text-[11px] font-semibold text-rose-600">
                ⚠ Quá tải ({">"}85%)
              </span>
            )}
            {!isOver && isWarn && (
              <span className="inline-block text-[11px] font-medium text-amber-600">
                ⚡ Tải cao (70-85%)
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Chỗ trống",
      cell: (h) => {
        const s = computeHubStats(stateInput, h.hubId);
        return (
          <span className={s.freeSlots <= 2 ? "font-bold text-rose-600" : "text-slate-700"}>
            {s.freeSlots}/{s.totalSlots}
          </span>
        );
      },
    },
    {
      header: "Cổng sạc trống",
      cell: (h) => {
        const s = computeHubStats(stateInput, h.hubId);
        return `${s.freePorts}/${s.totalPorts}`;
      },
    },
    {
      header: "Xe sẵn sàng",
      cell: (h) => {
        const s = computeHubStats(stateInput, h.hubId);
        return <span className="font-medium text-emerald-700">{s.availableVehicles}</span>;
      },
    },
    {
      header: "Lỗi",
      cell: (h) => {
        const s = computeHubStats(stateInput, h.hubId);
        const n = s.faultyVehicles + s.faultyPorts;
        return n > 0 ? <Badge value="FAULTY" label={`${n} lỗi`} /> : "0";
      },
    },
    {
      header: "Thao tác",
      className: "text-right",
      cell: (h) => {
        const u = computeHubStats(stateInput, h.hubId).utilization;
        return (
          <div className="flex justify-end gap-1.5">
            {u > OVERLOAD_THRESHOLD ? (
              <Button
                size="sm"
                variant="danger"
                onClick={() => navigate("/admin/overload")}
              >
                Giải tỏa
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate(`/admin/vehicles?hub=${h.hubId}`)}
              >
                Xem xe
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const alertColumns: Column<OpsAlert>[] = [
    {
      header: "Mức độ",
      cell: (a) => <Badge value={a.severity} label={a.severity} />,
    },
    {
      header: "Trạm Hub",
      cell: (a) => hubs.find((h) => h.hubId === a.hubId)?.name ?? a.hubId,
    },
    {
      header: "Nội dung cảnh báo",
      cell: (a) => (
        <div>
          <p className="font-medium text-slate-800">{a.message ?? a.type}</p>
          <span className="text-xs text-slate-400">Loại: {a.type}</span>
        </div>
      ),
    },
    {
      header: "Thời gian",
      cell: (a) => new Date(a.createdAt).toLocaleTimeString("vi-VN"),
    },
    {
      header: "Trạng thái",
      cell: (a) =>
        a.acknowledged ? (
          <Badge value="IN_PROGRESS" label="Đã tiếp nhận" />
        ) : (
          <Badge value="OPEN" label="Chưa xử lý" />
        ),
    },
    {
      header: "Hành động",
      className: "text-right",
      cell: (a) => (
        <div className="flex justify-end gap-2">
          {!a.acknowledged && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => OperationsService.acknowledgeAlert(a.alertId)}
            >
              Tiếp nhận
            </Button>
          )}
          {a.type.includes("OVERLOAD") ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate("/admin/overload")}
            >
              Giải tỏa
            </Button>
          ) : (
            <Button
              size="sm"
              variant="danger"
              onClick={() => navigate("/admin/vehicles/incidents")}
            >
              Xử lý
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-950">Tổng quan Điều phối Mạng lưới</h1>
          <p className="text-sm text-slate-500">
            Giám sát trạng thái gần thời gian thực, điều hòa phương tiện và phát hiện sự cố (UC11).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/simulation">
            <Button variant="secondary" size="sm">
              ⚡ Mô phỏng What-if
            </Button>
          </Link>
          <Link to="/admin/vehicles/dispatch">
            <Button variant="primary" size="sm">
              + Lập lệnh điều phối
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Hubs đang hoạt động"
          value={String(hubs.length)}
          hint={`${hubs.filter((h) => computeHubStats(stateInput, h.hubId).utilization > OVERLOAD_THRESHOLD).length} trạm quá tải`}
          status={
            hubs.some((h) => computeHubStats(stateInput, h.hubId).utilization > OVERLOAD_THRESHOLD)
              ? "danger"
              : "neutral"
          }
        />
        <KpiCard
          label="Tỷ lệ chiếm dụng chỗ đỗ"
          value={totalSlots === 0 ? "0%" : `${Math.round((usedSlots / totalSlots) * 100)}%`}
          hint={`${usedSlots}/${totalSlots} chỗ đỗ toàn mạng`}
          status={usedSlots / totalSlots > OVERLOAD_THRESHOLD ? "danger" : "neutral"}
        />
        <KpiCard
          label="Xe sẵn sàng phục vụ"
          value={`${availableVehicles}/${vehicles.length}`}
          hint="Xe dùng chung đạt chuẩn pin"
          status="success"
        />
        <KpiCard
          label="Sự cố & Cảnh báo"
          value={String(faults + openTickets)}
          hint={`${faults} thiết bị lỗi · ${openAlerts.length} cảnh báo mở`}
          status={faults + openAlerts.length > 0 ? "warning" : "neutral"}
        />
      </div>

      <DataSourcePanel />

      {/* Bản đồ trực quan Live Map */}
      <Card
        title="Bản đồ Mạng lưới Hub (Live Map)"
        actions={
          selectedHubId ? (
            <Button size="sm" variant="secondary" onClick={() => setSelectedHubId(null)}>
              Xem toàn bộ ({hubs.length} Hub)
            </Button>
          ) : (
            <span className="text-xs text-slate-400">Nhấp vào trạm để lọc danh sách</span>
          )
        }
      >
        <div className="relative isolate z-0 h-64 w-full overflow-hidden rounded-xl bg-slate-900 p-4">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="absolute bottom-2 left-3 z-10 flex items-center gap-3 text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Bình thường (&lt;70%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Tải cao (70-85%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Quá tải (&gt;85%) / Lỗi
            </span>
          </div>

          <div className="relative h-full w-full">
            {hubs.map((hub) => {
              const pos = HUB_MAP_PINS[hub.hubId] ?? { x: 50, y: 50 };
              const stats = computeHubStats(stateInput, hub.hubId);
              const isOver = stats.utilization > OVERLOAD_THRESHOLD;
              const isWarn = stats.utilization >= WARNING_THRESHOLD;
              const hasFault = stats.faultyVehicles + stats.faultyPorts > 0;
              const isSelected = selectedHubId === hub.hubId;

              const pinColor = isOver || hasFault
                ? "bg-rose-500 ring-rose-300"
                : isWarn
                ? "bg-amber-500 ring-amber-300"
                : "bg-emerald-500 ring-emerald-300";

              return (
                <button
                  key={hub.hubId}
                  onClick={() => setSelectedHubId(isSelected ? null : hub.hubId)}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform hover:scale-110 z-10`}
                >
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-lg ring-2 ${pinColor} ${
                      isSelected ? "ring-4 ring-white" : ""
                    }`}
                  >
                    <span>{hub.name.split(" ")[0]}</span>
                    <span className="rounded-full bg-black/30 px-1 text-[10px]">
                      {Math.round(stats.utilization * 100)}%
                    </span>
                  </div>
                  <div className="hidden group-hover:block absolute bottom-full mb-2 -left-10 w-44 rounded-lg bg-slate-800 p-2 text-left text-xs text-white shadow-xl z-20">
                    <p className="font-bold">{hub.name}</p>
                    <p className="text-[11px] text-slate-300">Xe trống: {stats.availableVehicles}</p>
                    <p className="text-[11px] text-slate-300">Chỗ trống: {stats.freeSlots}/{stats.totalSlots}</p>
                    <p className="text-[11px] text-slate-300">Cổng sạc: {stats.freePorts}/{stats.totalPorts}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Bảng danh sách các Hub */}
      <Card
        title={selectedHubId ? `Chi tiết Hub đang lọc (${displayedHubs[0]?.name})` : "Tình trạng các Trạm Hub"}
        actions={
          <span className="text-xs text-slate-500">
            {displayedHubs.length} trạm hiển thị
          </span>
        }
      >
        <Table columns={hubColumns} rows={displayedHubs} rowKey={(h) => h.hubId} />
      </Card>

      {/* Cảnh báo đang mở */}
      <Card
        title={`Cảnh báo vận hành cần xử lý (${openAlerts.length})`}
        actions={
          <Link to="/admin/overload" className="text-xs font-medium text-brand-700 hover:underline">
            Quản lý quá tải ›
          </Link>
        }
      >
        <Table
          columns={alertColumns}
          rows={openAlerts}
          rowKey={(a) => a.alertId}
          empty="Mạng lưới đang hoạt động an toàn. Chưa có cảnh báo nào phát sinh."
        />
      </Card>
    </div>
  );
}
