import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, Pagination, StatCard, Table, type Column } from "../../../components/ui";
import { usePagination } from "../../../hooks/usePagination";
import { importHubs } from "../../../services/hubConfigService";
import { useStore } from "../../../store";
import { inputClass } from "../../../styles/formClasses";
import { utilizationBarClass } from "../../../styles/statusColors";
import { AlertSeverity, HubOperationalStatus, type Hub } from "../../../types";
import { computeHubStats, type HubStats } from "../../../utils/hubStats";
import {
  getHubAlerts,
  getHubDisplayStatus,
  HUB_STATUS_LABELS,
  maxAlertSeverity,
  type HubDisplayStatus,
} from "../../../utils/hubStatus";
import { AddHubModal } from "./AddHubModal";
import { ImportModal } from "./ImportModal";

interface HubRow {
  hub: Hub;
  stats: HubStats;
  status: HubDisplayStatus;
  alert: AlertSeverity | null;
}

// UC11: danh sách Hub (giám sát) + UC19: thêm Hub, nhập từ tệp (chỉ Quản trị viên).
export function HubListPage() {
  const hubs = useStore((s) => s.hubs);
  const slots = useStore((s) => s.parkingSlots);
  const ports = useStore((s) => s.chargingPorts);
  const vehicles = useStore((s) => s.vehicles);
  const alerts = useStore((s) => s.alerts);
  const canEdit = useStore((s) => s.currentUser.role === "ADMIN");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | HubDisplayStatus>("ALL");
  const [areaFilter, setAreaFilter] = useState("ALL");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  const rows = useMemo<HubRow[]>(
    () =>
      hubs.map((hub) => {
        const stats = computeHubStats({ parkingSlots: slots, chargingPorts: ports, vehicles }, hub.hubId);
        return {
          hub,
          stats,
          status: getHubDisplayStatus(hub, stats.utilization),
          alert: maxAlertSeverity(getHubAlerts(hub, stats, alerts)),
        };
      }),
    [hubs, slots, ports, vehicles, alerts],
  );
  const areas = useMemo(() => [...new Set(hubs.map((h) => h.area))].sort(), [hubs]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    return (
      (q === "" || r.hub.name.toLowerCase().includes(q) || r.hub.hubId.toLowerCase().includes(q)) &&
      (statusFilter === "ALL" || r.status === statusFilter) &&
      (areaFilter === "ALL" || r.hub.area === areaFilter)
    );
  });
  const pg = usePagination(filtered);

  const count = (pred: (r: HubRow) => boolean) => rows.filter(pred).length;
  const columns: Column<HubRow>[] = [
    {
      header: "Hub",
      cell: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.hub.name}</p>
          <p className="text-[11px] text-slate-500">{r.hub.hubId}</p>
        </div>
      ),
    },
    { header: "Trạng thái", cell: (r) => <Badge value={r.status} label={HUB_STATUS_LABELS[r.status]} /> },
    { header: "Xe", cell: (r) => r.stats.occupiedSlots },
    { header: "Chỗ đỗ", cell: (r) => `${r.stats.occupiedSlots}/${r.hub.parkingCapacity}` },
    { header: "Cổng sạc", cell: (r) => `${r.stats.freePorts}/${r.stats.totalPorts}` },
    {
      header: "Mức sử dụng",
      className: "min-w-44",
      cell: (r) =>
        r.hub.operationalStatus === HubOperationalStatus.UNAVAILABLE ? (
          "—"
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${utilizationBarClass(r.stats.utilization, r.hub.thresholds.overload, r.hub.thresholds.parkingWarning)}`}
                style={{ width: `${Math.min(100, r.stats.utilization * 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold">{Math.round(r.stats.utilization * 100)}%</span>
          </div>
        ),
    },
    {
      header: "Cảnh báo",
      cell: (r) =>
        r.alert === null ? (
          "—"
        ) : (
          <Badge value={r.alert} label={r.alert === AlertSeverity.CRITICAL ? "Critical" : r.alert === AlertSeverity.WARNING ? "Warning" : "Info"} />
        ),
    },
    {
      header: "",
      cell: (r) => (
        <Link
          to={`/admin/hubs/${r.hub.hubId}`}
          className="inline-block rounded-full bg-brand-100 px-4 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-200"
        >
          Chi tiết
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Quản trị vận hành</p>
        <h1 className="text-3xl font-bold text-brand-950">Hub &amp; chỗ đỗ</h1>
        <p className="text-sm text-brand-700">Quản lý trạng thái, sức chứa, chỗ đỗ và cổng sạc của các Mobility Hub.</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className={`${inputClass()} max-w-sm flex-1`}
            placeholder="Tìm Hub..."
            aria-label="Tìm Hub"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              pg.setPage(1);
            }}
          />
          <select
            className={`${inputClass()} w-auto`}
            aria-label="Trạng thái"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "ALL" | HubDisplayStatus);
              pg.setPage(1);
            }}
          >
            <option value="ALL">Trạng thái ▾</option>
            {(Object.keys(HUB_STATUS_LABELS) as HubDisplayStatus[]).map((s) => (
              <option key={s} value={s}>
                {HUB_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className={`${inputClass()} w-auto`}
            aria-label="Khu vực"
            value={areaFilter}
            onChange={(e) => {
              setAreaFilter(e.target.value);
              pg.setPage(1);
            }}
          >
            <option value="ALL">Khu vực ▾</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {canEdit && (
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={() => setImporting(true)}>
                Nhập từ tệp
              </Button>
              <Button onClick={() => setAdding(true)}>+ Thêm Hub</Button>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng Hub" value={rows.length} />
        <StatCard label="Đang hoạt động" value={count((r) => r.hub.operationalStatus === HubOperationalStatus.AVAILABLE)} />
        <StatCard label="Có nguy cơ quá tải / quá tải" value={count((r) => r.status === "AT_RISK" || r.status === "OVERLOADED")} />
        <StatCard label="Bảo trì / không khả dụng" value={count((r) => r.status === "MAINTENANCE" || r.status === "UNAVAILABLE")} />
      </div>

      <Card>
        <Table columns={columns} rows={pg.pageItems} rowKey={(r) => r.hub.hubId} empty="Không có Hub nào phù hợp" />
        <Pagination page={pg.page} pageCount={pg.pageCount} from={pg.from} to={pg.to} total={pg.total} noun="Hub" onChange={pg.setPage} />
      </Card>

      {adding && (
        <AddHubModal
          onClose={() => setAdding(false)}
          onOpenImport={() => {
            setAdding(false);
            setImporting(true);
          }}
        />
      )}
      <ImportModal
        open={importing}
        title="Nhập Hub từ tệp"
        columnsHint="hubId, name, type, location, capacity, initialSlots, initialPorts, status"
        onClose={() => setImporting(false)}
        onImport={importHubs}
      />
    </div>
  );
}
