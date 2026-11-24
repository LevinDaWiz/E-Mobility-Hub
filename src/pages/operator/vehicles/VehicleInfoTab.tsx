import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, Modal, Progress } from "../../../components/ui";
import { OperationsService } from "../../../services/operationsService";
import { deleteVehicle, getDeleteBlocker } from "../../../services/vehicleAdminService";
import { useStore } from "../../../store";
import { TicketStatus, TicketType, VehicleStatus, VehicleType } from "../../../types";
import { resourceCode } from "../../../utils/resourceCode";
import { VehicleFormModal } from "./VehicleFormModal";

// Tab "Thông tin": xem, chỉnh sửa, báo sự cố và xóa phương tiện.
export function VehicleInfoTab() {
  const { vehicleId = "" } = useParams();
  const navigate = useNavigate();
  const vehicle = useStore((s) => s.vehicles.find((v) => v.vehicleId === vehicleId));
  const hub = useStore((s) => s.hubs.find((h) => h.hubId === vehicle?.currentHubId));
  const slot = useStore((s) => s.parkingSlots.find((p) => p.vehicleId === vehicleId));
  const allTickets = useStore((s) => s.tickets);
  const openTickets = allTickets.filter((t) => t.targetId === vehicleId && t.status !== TicketStatus.CLOSED);

  const canEdit = useStore((s) => s.currentUser.role === "ADMIN"); // chỉ Admin sửa / xóa xe
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  if (!vehicle) return null;

  const barColor = vehicle.batteryLevel < 20 ? "bg-rose-500" : vehicle.batteryLevel < 50 ? "bg-amber-500" : "bg-emerald-500";

  const askDelete = () => {
    const reason = getDeleteBlocker(vehicle.vehicleId);
    if (reason) setBlockedReason(reason);
    else setConfirmDelete(true);
  };

  const doDelete = () => {
    const result = deleteVehicle(vehicle.vehicleId);
    setConfirmDelete(false);
    if (result.ok) navigate("/admin/vehicles");
    else setBlockedReason(result.reason);
  };

  const reportFault = () =>
    OperationsService.handleIncident({
      ticketId: "",
      type: TicketType.VEHICLE_FAULT,
      targetId: vehicle.vehicleId,
      hubId: vehicle.currentHubId,
      description: `Báo hỏng thủ công từ Quản trị viên cho xe ${vehicle.vehicleId}`,
      status: TicketStatus.OPEN,
    });

  const rows: Array<[string, ReactNode]> = [
    ["Mã xe (QR / IoT ID)", <span className="font-semibold">{vehicle.vehicleId}</span>],
    ["Loại phương tiện", vehicle.type === VehicleType.E_BIKE ? "Xe đạp điện" : "Xe máy điện"],
    ["Trạng thái", <Badge value={vehicle.status} />],
    [
      "Hub hiện tại",
      hub ? (
        <Link to={`/admin/hubs/${hub.hubId}`} className="font-medium text-brand-700 hover:underline">
          {hub.name}
        </Link>
      ) : (
        vehicle.currentHubId
      ),
    ],
    ["Chỗ đỗ", slot ? resourceCode(slot.slotId, slot.hubId) : vehicle.status === VehicleStatus.IN_USE ? "Đang trên đường" : "Chưa gắn chỗ đỗ"],
    ["Ticket sự cố đang mở", openTickets.length === 0 ? "Không có" : `${openTickets.length} ticket`],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card
        title="Thông tin phương tiện"
        actions={
          canEdit ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                Chỉnh sửa
              </Button>
              <Button size="sm" variant="danger" onClick={askDelete}>
                Xóa
              </Button>
            </div>
          ) : undefined
        }
      >
        <dl className="divide-y divide-slate-100 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-right text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="space-y-6">
        <Card title="Mức pin">
          <Progress value={vehicle.batteryLevel} barClassName={barColor} label={`${vehicle.batteryLevel}%`} />
          <p className="mt-2 text-xs text-slate-500">~{Math.round((vehicle.batteryLevel / 100) * 45)} km di chuyển</p>
        </Card>

        <Card title="Thao tác nhanh">
          <div className="space-y-2 text-sm">
            {vehicle.status === VehicleStatus.FAULTY ? (
              <p className="text-rose-600">Xe đang bảo trì. Chỉnh sửa và đổi trạng thái về “Sẵn sàng” khi đã sửa xong.</p>
            ) : (
              <Button size="sm" variant="secondary" onClick={reportFault}>
                Báo sự cố
              </Button>
            )}
            <p className="text-xs text-slate-400">
              Xe đang được đặt, sử dụng hoặc sạc không thể đổi Hub / trạng thái hay xóa cho đến khi hoàn tất.
              {!canEdit && " Chỉ Quản trị viên (Admin) mới được thêm, sửa hoặc xóa phương tiện."}
            </p>
          </div>
        </Card>
      </div>

      {editing && canEdit && (
        <VehicleFormModal vehicle={vehicle} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />
      )}

      <Modal
        open={confirmDelete}
        title="Xóa phương tiện"
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={doDelete}>
              Xóa phương tiện
            </Button>
          </>
        }
      >
        <p className="text-slate-700">
          Xóa xe <strong>{vehicle.vehicleId}</strong> khỏi hệ thống? Chỗ đỗ đang gắn với xe sẽ được giải phóng và các ticket sự cố
          đang mở của xe sẽ được đóng. Không thể hoàn tác.
        </p>
      </Modal>

      <Modal
        open={blockedReason !== null}
        title="Không thể xóa phương tiện"
        onClose={() => setBlockedReason(null)}
        footer={<Button onClick={() => setBlockedReason(null)}>Đã hiểu</Button>}
      >
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="font-semibold text-slate-900">Phương tiện: {vehicle.vehicleId}</p>
          <p className="mt-1 text-red-700">Lý do: {blockedReason}</p>
        </div>
        <p className="mt-3 text-slate-500">Thao tác đã hủy, dữ liệu giữ nguyên. Hãy xử lý xong rồi thử lại.</p>
      </Modal>
    </div>
  );
}
