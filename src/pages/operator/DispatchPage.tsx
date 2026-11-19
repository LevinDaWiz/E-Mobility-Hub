import { useMemo, useState } from "react";
import { Badge, Button, Card, Modal, Table, type Column } from "../../components/ui";
import { OVERLOAD_THRESHOLD } from "../../config/constants";
import { OperationsService } from "../../services/operationsService";
import { useStore } from "../../store";
import type { OpsDispatchOrder } from "../../store/opsSlice";
import { DispatchStatus, VehicleStatus } from "../../types";
import { computeHubStats } from "../../utils/hubStats";

export function DispatchPage() {
  const dispatchOrders = useStore((s) => s.dispatchOrders);
  const hubs = useStore((s) => s.hubs);
  const vehicles = useStore((s) => s.vehicles);
  const slots = useStore((s) => s.parkingSlots);
  const ports = useStore((s) => s.chargingPorts);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fromHubId, setFromHubId] = useState(hubs[0]?.hubId ?? "");
  const [toHubId, setToHubId] = useState(hubs[1]?.hubId ?? "");
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [transportMethod, setTransportMethod] = useState<"TRUCK" | "SELF_DRIVE">("TRUCK");
  const [driverName, setDriverName] = useState("Đội xe tải số 01 (Nguyễn Văn B)");

  const stateInput = useMemo(
    () => ({ parkingSlots: slots, chargingPorts: ports, vehicles }),
    [slots, ports, vehicles]
  );

  // Danh sách xe khả dụng tại Hub nguồn
  const availableVehiclesAtSource = useMemo(() => {
    return vehicles.filter(
      (v) => v.currentHubId === fromHubId && v.status === VehicleStatus.AVAILABLE && v.batteryLevel >= 20
    );
  }, [vehicles, fromHubId]);

  // Sức chứa khả dụng tại Hub đích
  const destStats = useMemo(() => {
    return computeHubStats(stateInput, toHubId);
  }, [stateInput, toHubId]);

  // KPIs
  const overloadedHubsCount = hubs.filter(
    (h) => computeHubStats(stateInput, h.hubId).utilization > OVERLOAD_THRESHOLD
  ).length;

  const lowVehiclesHubsCount = hubs.filter(
    (h) => computeHubStats(stateInput, h.hubId).availableVehicles <= 2
  ).length;

  const activeOrdersCount = dispatchOrders.filter(
    (o) => o.status === DispatchStatus.IN_PROGRESS
  ).length;

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSelectedVehicleIds([]);
  };

  const handleToggleVehicle = (id: string) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  const handleCreateOrder = () => {
    if (selectedVehicleIds.length === 0 || fromHubId === toHubId) return;
    OperationsService.createDispatchOrder(
      fromHubId,
      toHubId,
      selectedVehicleIds,
      transportMethod,
      driverName
    );
    setIsModalOpen(false);
  };

  const columns: Column<OpsDispatchOrder>[] = [
    {
      header: "Mã lệnh",
      cell: (o) => (
        <div>
          <span className="font-semibold text-slate-900">{o.orderId}</span>
          <p className="text-xs text-slate-400">
            {o.createdAt ? new Date(o.createdAt).toLocaleTimeString("vi-VN") : "Hôm nay"}
          </p>
        </div>
      ),
    },
    {
      header: "Hub nguồn",
      cell: (o) => hubs.find((h) => h.hubId === o.fromHubId)?.name ?? o.fromHubId,
    },
    {
      header: "Hub đích",
      cell: (o) => hubs.find((h) => h.hubId === o.toHubId)?.name ?? o.toHubId,
    },
    {
      header: "Phương tiện",
      cell: (o) => (
        <div>
          <span className="font-medium text-slate-800">{o.vehicleIds.length} xe</span>
          <p className="text-xs text-slate-400">{o.vehicleIds.slice(0, 3).join(", ")}{o.vehicleIds.length > 3 ? "..." : ""}</p>
        </div>
      ),
    },
    {
      header: "Đội vận chuyển",
      cell: (o) => (
        <div>
          <span className="text-sm text-slate-700">{o.driverName ?? "Xe tải trung chuyển"}</span>
          <p className="text-xs text-slate-400">{o.transportMethod === "TRUCK" ? "Xe tải chuyên dụng" : "Tự lái"}</p>
        </div>
      ),
    },
    {
      header: "Trạng thái",
      cell: (o) => <Badge value={o.status} />,
    },
    {
      header: "Thao tác",
      className: "text-right",
      cell: (o) => (
        <div className="flex justify-end gap-1.5">
          {o.status === DispatchStatus.PROPOSED && (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => OperationsService.approveDispatchOrder(o.orderId)}
              >
                Duyệt
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => OperationsService.cancelDispatchOrder(o.orderId)}
              >
                Hủy
              </Button>
            </>
          )}
          {o.status === DispatchStatus.APPROVED && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => OperationsService.executeDispatchOrder(o.orderId)}
            >
              Vận chuyển
            </Button>
          )}
          {o.status === DispatchStatus.IN_PROGRESS && (
            <Button
              size="sm"
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => OperationsService.completeDispatchOrder(o.orderId)}
            >
              Hoàn tất
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
          <h1 className="text-2xl font-bold text-brand-950">Điều phối Phương tiện giữa các Hub</h1>
          <p className="text-sm text-slate-500">
            Lập kế hoạch cân bằng xe, giải tỏa Hub quá tải hoặc tiếp tế cho Hub thiếu xe (UC13).
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenModal}>
          + Lập lệnh điều phối mới
        </Button>
      </div>

      {/* 4 Thẻ KPI điều phối */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-rose-800">Hub thiếu xe nghiêm trọng</p>
          <p className="mt-1 text-3xl font-bold text-rose-950">{lowVehiclesHubsCount} Hub</p>
          <p className="mt-1 text-xs text-rose-700">Có &le; 2 xe sẵn sàng</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-amber-800">Hub dư xe / Quá tải</p>
          <p className="mt-1 text-3xl font-bold text-amber-950">{overloadedHubsCount} Hub</p>
          <p className="mt-1 text-xs text-amber-700">Tỷ lệ lấp đầy &gt; 85%</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-sky-800">Lệnh đang vận chuyển</p>
          <p className="mt-1 text-3xl font-bold text-sky-950">{activeOrdersCount} lệnh</p>
          <p className="mt-1 text-xs text-sky-700">Xe đang trên đường</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-emerald-800">Đội xe tải trực chiến</p>
          <p className="mt-1 text-3xl font-bold text-emerald-950">2 Đội</p>
          <p className="mt-1 text-xs text-emerald-700">Sẵn sàng nhận lệnh</p>
        </div>
      </div>

      {/* Bảng Danh sách Lệnh điều phối */}
      <Card
        title={`Danh sách Lệnh điều phối (${dispatchOrders.length})`}
        actions={
          <span className="text-xs text-slate-400">
            Theo dõi tiến trình từ Đề xuất &rarr; Vận chuyển &rarr; Hoàn tất
          </span>
        }
      >
        <Table
          columns={columns}
          rows={dispatchOrders}
          rowKey={(o) => o.orderId}
          empty="Chưa có lệnh điều phối nào được khởi tạo."
        />
      </Card>

      {/* Modal Tạo lệnh điều phối */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="TẠO LỆNH ĐIỀU PHỐI PHƯƠNG TIỆN"
      >
        <div className="space-y-4">
          {/* Tuyến điều phối */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Hub nguồn (Xuất phát)
              </label>
              <select
                value={fromHubId}
                onChange={(e) => {
                  setFromHubId(e.target.value);
                  setSelectedVehicleIds([]);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                {hubs.map((h) => (
                  <option key={h.hubId} value={h.hubId}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Hub đích (Tiếp nhận)
              </label>
              <select
                value={toHubId}
                onChange={(e) => setToHubId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                {hubs
                  .filter((h) => h.hubId !== fromHubId)
                  .map((h) => (
                    <option key={h.hubId} value={h.hubId}>
                      {h.name} (còn {computeHubStats(stateInput, h.hubId).freeSlots} chỗ)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Kiểm tra dung lượng Hub đích */}
          {selectedVehicleIds.length > destStats.freeSlots && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
              ⚠ Cảnh báo: Hub đích chỉ còn {destStats.freeSlots} chỗ trống. Vui lòng giảm số xe điều chuyển!
            </div>
          )}

          {/* Bảng chọn xe tại Hub nguồn */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Chọn phương tiện cần chuyển ({selectedVehicleIds.length} đã chọn)
              </span>
              <span className="text-xs text-slate-400">
                {availableVehiclesAtSource.length} xe khả dụng (pin &ge; 20%)
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {availableVehiclesAtSource.length === 0 ? (
                <p className="p-3 text-center text-xs text-slate-400">
                  Không có xe nào đủ điều kiện tại Hub này.
                </p>
              ) : (
                availableVehiclesAtSource.map((v) => {
                  const isChecked = selectedVehicleIds.includes(v.vehicleId);
                  return (
                    <label
                      key={v.vehicleId}
                      className="flex cursor-pointer items-center justify-between p-2.5 hover:bg-slate-50 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="accent-brand-600 rounded"
                          checked={isChecked}
                          onChange={() => handleToggleVehicle(v.vehicleId)}
                        />
                        <span className="font-semibold text-slate-800">{v.vehicleId}</span>
                        <span className="text-xs text-slate-500">
                          {v.type === "E_BIKE" ? "Xe đạp điện" : "Xe máy điện"}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">{v.batteryLevel}% Pin</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Phương án vận chuyển */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Phương án vận chuyển
            </label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-2.5 text-sm cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="transport"
                  checked={transportMethod === "TRUCK"}
                  onChange={() => setTransportMethod("TRUCK")}
                  className="accent-brand-600"
                />
                <span className="font-medium text-slate-800">
                  Xe tải chuyên dụng (Truck TR-02 - Tải trọng 4–15 xe - ETA 18 phút)
                </span>
              </label>

              <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-2.5 text-sm cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="transport"
                  checked={transportMethod === "SELF_DRIVE"}
                  onChange={() => setTransportMethod("SELF_DRIVE")}
                  className="accent-brand-600"
                />
                <span className="font-medium text-slate-800">
                  Nhân viên kỹ thuật tự lái di chuyển
                </span>
              </label>
            </div>
          </div>

          {/* Tài xế / Người phụ trách */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Đội vận chuyển / Tài xế
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Nút hành động */}
          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={
                selectedVehicleIds.length === 0 ||
                selectedVehicleIds.length > destStats.freeSlots ||
                fromHubId === toHubId
              }
              onClick={handleCreateOrder}
            >
              Phát lệnh điều động ({selectedVehicleIds.length} xe)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
