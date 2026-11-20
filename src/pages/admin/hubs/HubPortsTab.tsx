import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge, Button, Card, Pagination, StatCard, Table, type Column } from "../../../components/ui";
import { usePagination } from "../../../hooks/usePagination";
import { importPorts, setPortMaintenance } from "../../../services/hubConfigService";
import { useStore } from "../../../store";
import { inputClass } from "../../../styles/formClasses";
import { PORT_STATUS_BADGE } from "../../../styles/statusColors";
import { PortKind, PortStatus, SessionStatus, type ChargingPort } from "../../../types";
import { formatTime, naturalCompare } from "../../../utils/format";
import { resourceCode } from "../../../utils/resourceCode";
import { BlockedModal, type BlockedInfo } from "./BlockedModal";
import { ImportModal } from "./ImportModal";
import { AddPortModal, EditPortModal } from "./ResourceModals";

// Tab "Cổng sạc" (UC11 xem + UC19 cấu hình). Xe nào sạc lúc nào thuộc Quản lý lịch sạc (UC12).
export function HubPortsTab() {
  const { hubId = "" } = useParams();
  const hub = useStore((s) => s.hubs.find((h) => h.hubId === hubId));
  const allPorts = useStore((s) => s.chargingPorts);
  const sessions = useStore((s) => s.chargingSessions);
  const canEdit = useStore((s) => s.currentUser.role === "ADMIN");

  const [statusFilter, setStatusFilter] = useState<"ALL" | PortStatus>("ALL");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<ChargingPort | null>(null);
  const [blocked, setBlocked] = useState<BlockedInfo | null>(null);

  const ports = useMemo(
    () => allPorts.filter((p) => p.hubId === hubId).sort((a, b) => naturalCompare(a.portId, b.portId)),
    [allPorts, hubId],
  );
  const filtered = ports.filter((p) => {
    const q = search.trim().toLowerCase();
    return (statusFilter === "ALL" || p.status === statusFilter) && (q === "" || resourceCode(p.portId, hubId).toLowerCase().includes(q));
  });
  const pg = usePagination(filtered);
  if (!hub) return null;

  const count = (status: PortStatus) => ports.filter((p) => p.status === status).length;
  const currentVehicle = (portId: string) =>
    sessions.find((s) => s.portId === portId && s.status === SessionStatus.CHARGING)?.vehicleId ?? "—";

  const toggleMaintenance = (port: ChargingPort) => {
    const result = setPortMaintenance(port.portId, port.status !== PortStatus.MAINTENANCE);
    if (!result.ok && result.kind === "blocked") setBlocked({ resource: result.resource, reason: result.reason });
  };

  const columns: Column<ChargingPort>[] = [
    { header: "Port ID", cell: (p) => <span className="font-bold text-brand-900">{resourceCode(p.portId, hubId)}</span> },
    { header: "Loại", cell: (p) => (p.kind === PortKind.FAST ? "Fast" : "Standard") },
    {
      header: "Trạng thái",
      cell: (p) => <Badge value={p.status} label={PORT_STATUS_BADGE[p.status].label} className={PORT_STATUS_BADGE[p.status].className} />,
    },
    { header: "Xe hiện tại", cell: (p) => currentVehicle(p.portId) },
    { header: "Công suất", cell: (p) => `${p.powerKw} kW` },
    ...(canEdit
      ? [
          {
            header: "Thao tác",
            cell: (p: ChargingPort) => (
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>
                  Chỉnh sửa
                </Button>
                <Button size="sm" variant="ghost" className="ring-1 ring-slate-300" onClick={() => toggleMaintenance(p)}>
                  {p.status === PortStatus.MAINTENANCE ? "Bật lại" : "Đặt bảo trì"}
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng cổng sạc" value={ports.length} />
        <StatCard label="Khả dụng" value={count(PortStatus.FREE)} />
        <StatCard label="Đang sạc" value={count(PortStatus.CHARGING)} />
        <StatCard label="Lỗi (Fault)" value={count(PortStatus.FAULTY)} tone="danger" />
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <select
            className={`${inputClass()} w-auto`}
            aria-label="Lọc trạng thái"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "ALL" | PortStatus);
              pg.setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái ▾</option>
            {Object.values(PortStatus).map((s) => (
              <option key={s} value={s}>
                {PORT_STATUS_BADGE[s].label}
              </option>
            ))}
          </select>
          <input
            className={`${inputClass()} max-w-xs flex-1`}
            placeholder="Tìm Port ID"
            aria-label="Tìm Port ID"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              pg.setPage(1);
            }}
          />
          {canEdit && (
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={() => setImporting(true)}>
                Nhập từ tệp
              </Button>
              <Button onClick={() => setAdding(true)}>+ Thêm cổng sạc</Button>
            </div>
          )}
        </div>
        <Table columns={columns} rows={pg.pageItems} rowKey={(p) => p.portId} empty="Không có cổng sạc nào phù hợp" />
        <Pagination page={pg.page} pageCount={pg.pageCount} from={pg.from} to={pg.to} total={pg.total} noun="cổng sạc" onChange={pg.setPage} />
        <p className="mt-3 text-xs text-slate-500">
          Quản trị viên chỉ quản lý cổng sạc như tài nguyên. Xe nào sạc lúc nào thuộc Quản lý lịch sạc (UC12). Cập nhật gần nhất:{" "}
          {ports.length > 0 ? formatTime(ports.reduce((m, p) => (p.updatedAt > m ? p.updatedAt : m), ports[0].updatedAt)) : "—"}.
        </p>
      </Card>

      {adding && (
        <AddPortModal
          hub={hub}
          onClose={() => setAdding(false)}
          onOpenImport={() => {
            setAdding(false);
            setImporting(true);
          }}
        />
      )}
      {editing && <EditPortModal port={editing} hub={hub} onClose={() => setEditing(null)} />}
      <ImportModal
        open={importing}
        title="Nhập cổng sạc từ tệp"
        columnsHint="code, kind (FAST/STANDARD), powerKw, dockId, status (FREE/MAINTENANCE)"
        onClose={() => setImporting(false)}
        onImport={(rows) => importPorts(hubId, rows)}
      />
      <BlockedModal info={blocked} onClose={() => setBlocked(null)} />
    </div>
  );
}
