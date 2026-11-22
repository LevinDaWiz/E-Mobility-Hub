import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, ConfirmDeleteModal, Pagination, StatCard, Table, type Column } from "../../../components/ui";
import { usePagination } from "../../../hooks/usePagination";
import { deleteSlot, getDeleteImpact, importSlots, setSlotMaintenance, type DeleteImpact } from "../../../services/hubConfigService";
import { useStore } from "../../../store";
import { inputClass } from "../../../styles/formClasses";
import { SLOT_STATUS_BADGE } from "../../../styles/statusColors";
import { SlotKind, SlotStatus, type ParkingSlot } from "../../../types";
import { formatTime, naturalCompare } from "../../../utils/format";
import { resourceCode } from "../../../utils/resourceCode";
import { BlockedModal, type BlockedInfo } from "./BlockedModal";
import { ImportModal } from "./ImportModal";
import { AddSlotsModal, EditSlotModal } from "./ResourceModals";

// Tab "Chỗ đỗ" (UC11 xem + UC19 cấu hình). Quản trị viên chỉ cấu hình chỗ đỗ; đưa xe vào chỗ thuộc vận hành.
export function HubSlotsTab() {
  const { hubId = "" } = useParams();
  const hub = useStore((s) => s.hubs.find((h) => h.hubId === hubId));
  const allSlots = useStore((s) => s.parkingSlots);
  const canEdit = useStore((s) => s.currentUser.role === "ADMIN");

  const [statusFilter, setStatusFilter] = useState<"ALL" | SlotStatus>("ALL");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<ParkingSlot | null>(null);
  const [blocked, setBlocked] = useState<BlockedInfo | null>(null);
  const [deleting, setDeleting] = useState<DeleteImpact | null>(null);

  const slots = useMemo(
    () => allSlots.filter((s) => s.hubId === hubId).sort((a, b) => naturalCompare(a.slotId, b.slotId)),
    [allSlots, hubId],
  );
  const filtered = slots.filter((s) => {
    const q = search.trim().toLowerCase();
    return (statusFilter === "ALL" || s.status === statusFilter) && (q === "" || resourceCode(s.slotId, hubId).toLowerCase().includes(q));
  });
  const pg = usePagination(filtered);
  if (!hub) return null;

  const count = (status: SlotStatus) => slots.filter((s) => s.status === status).length;

  const toggleMaintenance = (slot: ParkingSlot) => {
    const result = setSlotMaintenance(slot.slotId, slot.status !== SlotStatus.MAINTENANCE);
    if (!result.ok && result.kind === "blocked") setBlocked({ resource: result.resource, reason: result.reason });
  };

  // Xóa: còn xe / lịch đặt thì báo bị chặn; không thì mở popup cảnh báo + xác nhận lại.
  const askDelete = (slot: ParkingSlot) => {
    const impact = getDeleteImpact("slot", slot.slotId);
    if (!impact) return;
    if (impact.blockers.length > 0) {
      setBlocked({ title: "Không thể xóa chỗ đỗ", resource: impact.label, reason: impact.blockers.join(" "), reasons: impact.blockers });
    } else {
      setDeleting(impact);
    }
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const result = deleteSlot(deleting.id);
    setDeleting(null);
    if (!result.ok && result.kind === "blocked") {
      setBlocked({ title: "Không thể xóa chỗ đỗ", resource: result.resource, reason: result.reason, reasons: result.reasons });
    }
  };

  const columns: Column<ParkingSlot>[] = [
    { header: "Slot ID", cell: (s) => <span className="font-bold text-brand-900">{resourceCode(s.slotId, hubId)}</span> },
    { header: "Loại", cell: (s) => (s.kind === SlotKind.SHARED ? "Shared" : "Personal") },
    {
      header: "Trạng thái",
      cell: (s) => <Badge value={s.status} label={SLOT_STATUS_BADGE[s.status].label} className={SLOT_STATUS_BADGE[s.status].className} />,
    },
    {
      header: "Phương tiện",
      cell: (s) =>
        s.status !== SlotStatus.OCCUPIED ? (
          "—"
        ) : s.vehicleId ? (
          <Link to={`/admin/vehicles/${s.vehicleId}`} className="font-medium text-brand-700 hover:underline">
            {s.vehicleId}
          </Link>
        ) : (
          "Xe cá nhân"
        ),
    },
    { header: "Cập nhật", cell: (s) => formatTime(s.updatedAt) },
    ...(canEdit
      ? [
          {
            header: "Thao tác",
            cell: (s: ParkingSlot) => (
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                  Chỉnh sửa
                </Button>
                <Button size="sm" variant="ghost" className="ring-1 ring-slate-300" onClick={() => toggleMaintenance(s)}>
                  {s.status === SlotStatus.MAINTENANCE ? "Bật lại" : "Đặt bảo trì"}
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600 ring-1 ring-red-200" onClick={() => askDelete(s)}>
                  Xóa
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
        <StatCard label="Tổng chỗ đỗ" value={slots.length} />
        <StatCard label="Có xe (Occupied)" value={count(SlotStatus.OCCUPIED)} />
        <StatCard label="Còn trống (Available)" value={count(SlotStatus.FREE)} />
        <StatCard label="Đặt trước / Bảo trì" value={count(SlotStatus.RESERVED) + count(SlotStatus.MAINTENANCE)} />
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <select
            className={`${inputClass()} w-auto`}
            aria-label="Lọc trạng thái"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "ALL" | SlotStatus);
              pg.setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái ▾</option>
            {Object.values(SlotStatus).map((s) => (
              <option key={s} value={s}>
                {SLOT_STATUS_BADGE[s].label}
              </option>
            ))}
          </select>
          <input
            className={`${inputClass()} max-w-xs flex-1`}
            placeholder="Tìm Slot ID"
            aria-label="Tìm Slot ID"
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
              <Button onClick={() => setAdding(true)}>+ Thêm chỗ đỗ</Button>
            </div>
          )}
        </div>
        <Table columns={columns} rows={pg.pageItems} rowKey={(s) => s.slotId} empty="Không có chỗ đỗ nào phù hợp" />
        <Pagination page={pg.page} pageCount={pg.pageCount} from={pg.from} to={pg.to} total={pg.total} noun="chỗ đỗ" onChange={pg.setPage} />
        <p className="mt-3 text-xs text-slate-500">
          Quản trị viên chỉ cấu hình chỗ đỗ (chỉnh sửa, bảo trì, bật/tắt). Việc đưa xe vào chỗ thuộc nghiệp vụ vận hành.
        </p>
      </Card>

      {adding && (
        <AddSlotsModal
          hub={hub}
          onClose={() => setAdding(false)}
          onOpenImport={() => {
            setAdding(false);
            setImporting(true);
          }}
        />
      )}
      {editing && <EditSlotModal slot={editing} hub={hub} onClose={() => setEditing(null)} />}
      <ImportModal
        open={importing}
        title="Nhập chỗ đỗ từ tệp"
        columnsHint="code, kind (SHARED/PERSONAL), status (FREE/MAINTENANCE), sensorId, quantity"
        onClose={() => setImporting(false)}
        onImport={(rows) => importSlots(hubId, rows)}
      />
      {deleting && (
        <ConfirmDeleteModal
          title="Xóa chỗ đỗ"
          label={deleting.label}
          confirmCode={deleting.code}
          consequences={deleting.consequences}
          retained={deleting.retained}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
      <BlockedModal info={blocked} onClose={() => setBlocked(null)} />
    </div>
  );
}
