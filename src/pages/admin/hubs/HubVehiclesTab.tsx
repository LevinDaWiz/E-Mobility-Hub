import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, Pagination, Progress, StatCard, Table, type Column } from "../../../components/ui";
import { usePagination } from "../../../hooks/usePagination";
import { useStore } from "../../../store";
import { inputClass } from "../../../styles/formClasses";
import { VehicleStatus, VehicleType, type Vehicle } from "../../../types";
import { naturalCompare } from "../../../utils/format";
import { VehicleFormModal } from "../../operator/vehicles/VehicleFormModal";

const STATUS_LABELS: Record<VehicleStatus, string> = {
  [VehicleStatus.AVAILABLE]: "Sẵn sàng",
  [VehicleStatus.RESERVED]: "Đã đặt trước",
  [VehicleStatus.IN_USE]: "Đang sử dụng",
  [VehicleStatus.CHARGING]: "Đang sạc",
  [VehicleStatus.FAULTY]: "Lỗi / Cần sửa",
};

// Tab "Phương tiện" của Hub: xe đang thuộc Hub này. Admin thêm xe vào Hub; sửa / xóa ở trang chi tiết xe.
export function HubVehiclesTab() {
  const { hubId = "" } = useParams();
  const hub = useStore((s) => s.hubs.find((h) => h.hubId === hubId));
  const allVehicles = useStore((s) => s.vehicles);
  const canEdit = useStore((s) => s.currentUser.role === "ADMIN");

  const [statusFilter, setStatusFilter] = useState<"ALL" | VehicleStatus>("ALL");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const vehicles = useMemo(
    () => allVehicles.filter((v) => v.currentHubId === hubId).sort((a, b) => naturalCompare(a.vehicleId, b.vehicleId)),
    [allVehicles, hubId],
  );
  const filtered = vehicles.filter((v) => {
    const q = search.trim().toLowerCase();
    return (statusFilter === "ALL" || v.status === statusFilter) && (q === "" || v.vehicleId.toLowerCase().includes(q));
  });
  const pg = usePagination(filtered);
  if (!hub) return null;

  const count = (status: VehicleStatus) => vehicles.filter((v) => v.status === status).length;

  const columns: Column<Vehicle>[] = [
    {
      header: "Mã xe",
      cell: (v) => (
        <Link to={`/admin/vehicles/${v.vehicleId}`} className="font-bold text-brand-900 hover:underline">
          {v.vehicleId}
        </Link>
      ),
    },
    { header: "Loại", cell: (v) => (v.type === VehicleType.E_BIKE ? "Xe đạp điện" : "Xe máy điện") },
    {
      header: "Mức pin",
      className: "min-w-36",
      cell: (v) => (
        <Progress
          value={v.batteryLevel}
          barClassName={v.batteryLevel < 20 ? "bg-rose-500" : v.batteryLevel < 50 ? "bg-amber-500" : "bg-emerald-500"}
          label={`${v.batteryLevel}%`}
        />
      ),
    },
    { header: "Trạng thái", cell: (v) => <Badge value={v.status} label={STATUS_LABELS[v.status]} /> },
    {
      header: "Thao tác",
      cell: (v) => (
        <Link
          to={`/admin/vehicles/${v.vehicleId}`}
          className="inline-flex items-center rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Xem thông tin
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng phương tiện" value={vehicles.length} />
        <StatCard label="Sẵn sàng" value={count(VehicleStatus.AVAILABLE)} />
        <StatCard label="Đang sạc / Đã đặt" value={count(VehicleStatus.CHARGING) + count(VehicleStatus.RESERVED)} />
        <StatCard label="Lỗi" value={count(VehicleStatus.FAULTY)} />
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <select
            className={`${inputClass()} w-auto`}
            aria-label="Lọc trạng thái"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "ALL" | VehicleStatus);
              pg.setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái ▾</option>
            {Object.values(VehicleStatus).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            className={`${inputClass()} max-w-xs flex-1`}
            placeholder="Tìm mã xe"
            aria-label="Tìm mã xe"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              pg.setPage(1);
            }}
          />
          {canEdit && (
            <div className="ml-auto">
              <Button onClick={() => setAdding(true)}>+ Thêm phương tiện</Button>
            </div>
          )}
        </div>
        <Table columns={columns} rows={pg.pageItems} rowKey={(v) => v.vehicleId} empty="Hub chưa có phương tiện nào phù hợp" />
        <Pagination page={pg.page} pageCount={pg.pageCount} from={pg.from} to={pg.to} total={pg.total} noun="phương tiện" onChange={pg.setPage} />
        <p className="mt-3 text-xs text-slate-500">
          Xe đang được sử dụng (trên đường) không nằm trong danh sách vì không còn đỗ tại Hub. Chỉnh sửa hoặc xóa xe ở trang chi
          tiết phương tiện.
        </p>
      </Card>

      {adding && <VehicleFormModal defaultHubId={hub.hubId} onClose={() => setAdding(false)} onSaved={() => setAdding(false)} />}
    </div>
  );
}
