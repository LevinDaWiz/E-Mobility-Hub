import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, Button, Card, Progress, Table, type Column } from "../../components/ui";
import { OperationsService } from "../../services/operationsService";
import { useStore } from "../../store";
import { TicketStatus, TicketType, VehicleStatus, VehicleType, type Vehicle } from "../../types";
import { VehicleFormModal } from "./vehicles/VehicleFormModal";

export function VehiclesPage() {
  const [searchParams] = useSearchParams();
  const initialHub = searchParams.get("hub") ?? "ALL";

  const vehicles = useStore((s) => s.vehicles);
  const hubs = useStore((s) => s.hubs);

  const [selectedHub, setSelectedHub] = useState<string>(initialHub);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedBattery, setSelectedBattery] = useState<string>("ALL");
  const [adding, setAdding] = useState(false);
  const canEdit = useStore((s) => s.currentUser.role === "ADMIN"); // chỉ Admin thêm / sửa / xóa xe

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (selectedHub !== "ALL" && v.currentHubId !== selectedHub) return false;
      if (selectedType !== "ALL" && v.type !== selectedType) return false;
      if (selectedStatus !== "ALL" && v.status !== selectedStatus) return false;
      if (selectedBattery === "HIGH" && v.batteryLevel < 80) return false;
      if (selectedBattery === "MEDIUM" && (v.batteryLevel < 20 || v.batteryLevel >= 80)) return false;
      if (selectedBattery === "LOW" && v.batteryLevel >= 20) return false;
      return true;
    });
  }, [vehicles, selectedHub, selectedType, selectedStatus, selectedBattery]);

  const handleReportFault = (v: Vehicle) => {
    OperationsService.handleIncident({
      ticketId: "",
      type: TicketType.VEHICLE_FAULT,
      targetId: v.vehicleId,
      hubId: v.currentHubId,
      description: `Báo hỏng thủ công từ Quản trị viên cho xe ${v.vehicleId}`,
      status: TicketStatus.OPEN,
    });
  };

  const columns: Column<Vehicle>[] = [
    {
      header: "Mã xe",
      cell: (v) => (
        <div>
          <span className="font-semibold text-slate-900">{v.vehicleId}</span>
          <p className="text-xs text-slate-400">QR / IoT ID</p>
        </div>
      ),
    },
    {
      header: "Loại xe",
      cell: (v) => (
        <Badge
          value="INFO"
          label={v.type === VehicleType.E_BIKE ? "Xe đạp điện" : "Xe máy điện"}
        />
      ),
    },
    {
      header: "Hub hiện tại",
      cell: (v) => hubs.find((h) => h.hubId === v.currentHubId)?.name ?? v.currentHubId,
    },
    {
      header: "Mức Pin (%)",
      className: "min-w-40",
      cell: (v) => {
        const barColor =
          v.batteryLevel < 20
            ? "bg-rose-500"
            : v.batteryLevel < 50
            ? "bg-amber-500"
            : "bg-emerald-500";
        return (
          <div className="space-y-1">
            <Progress value={v.batteryLevel} barClassName={barColor} label={`${v.batteryLevel}%`} />
            <span className="text-[11px] text-slate-400">
              ~{Math.round((v.batteryLevel / 100) * 45)} km di chuyển
            </span>
          </div>
        );
      },
    },
    {
      header: "Trạng thái",
      cell: (v) => <Badge value={v.status} />,
    },
    {
      header: "Thao tác",
      className: "text-right",
      cell: (v) => (
        <div className="flex justify-end gap-2">
          <Link
            to={`/admin/vehicles/${v.vehicleId}`}
            className="inline-flex items-center rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Xem thông tin
          </Link>
          {v.status !== VehicleStatus.FAULTY ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleReportFault(v)}
            >
              Báo sự cố
            </Button>
          ) : (
            <span className="text-xs font-medium text-rose-600">Đang bảo trì</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-950">Quản lý Phương tiện toàn mạng</h1>
          <p className="text-sm text-slate-500">
            Theo dõi vị trí, dung lượng pin và trạng thái phục vụ của toàn bộ fleet xe (UC11).
          </p>
        </div>
        {canEdit && <Button onClick={() => setAdding(true)}>+ Thêm phương tiện</Button>}
      </div>

      {/* Thanh lọc nâng cao */}
      <Card title="Bộ lọc phương tiện">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Trạm Hub</label>
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">Tất cả các Hub</option>
              {hubs.map((h) => (
                <option key={h.hubId} value={h.hubId}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Loại phương tiện</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">Tất cả loại xe</option>
              <option value={VehicleType.E_BIKE}>Xe đạp điện</option>
              <option value={VehicleType.E_MOTORBIKE}>Xe máy điện</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Trạng thái xe</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value={VehicleStatus.AVAILABLE}>Sẵn sàng (Available)</option>
              <option value={VehicleStatus.RESERVED}>Đã đặt trước (Reserved)</option>
              <option value={VehicleStatus.IN_USE}>Đang sử dụng (In Use)</option>
              <option value={VehicleStatus.CHARGING}>Đang sạc (Charging)</option>
              <option value={VehicleStatus.FAULTY}>Lỗi / Cần sửa (Faulty)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Mức pin</label>
            <select
              value={selectedBattery}
              onChange={(e) => setSelectedBattery(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">Mọi mức pin</option>
              <option value="HIGH">Pin dồi dào (&gt;80%)</option>
              <option value="MEDIUM">Pin trung bình (20-80%)</option>
              <option value="LOW">Pin yếu (&lt;20%)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Bảng dữ liệu xe */}
      <Card
        title={`Danh sách phương tiện (${filteredVehicles.length} xe)`}
        actions={
          <span className="text-xs text-slate-400">
            Tổng cộng: {vehicles.length} xe toàn hệ thống
          </span>
        }
      >
        <Table
          columns={columns}
          rows={filteredVehicles}
          rowKey={(v) => v.vehicleId}
          empty="Không tìm thấy phương tiện nào phù hợp với bộ lọc."
        />
      </Card>

      {adding && canEdit && (
        <VehicleFormModal
          defaultHubId={selectedHub !== "ALL" ? selectedHub : undefined}
          onClose={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      )}
    </div>
  );
}
