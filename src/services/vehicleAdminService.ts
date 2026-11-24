import { useStore } from "../store";
import {
  DispatchStatus,
  RequestStatus,
  ReservationStatus,
  SessionStatus,
  TicketStatus,
  TicketType,
  TripStatus,
  VehicleStatus,
  VehicleType,
  type Vehicle,
} from "../types";
import { simNowIso } from "../utils/time";
import { notify } from "./notificationService";
import { OperationsService } from "./operationsService";
import { ParkingService } from "./parkingService";

// ===== M4: quản trị phương tiện (thêm / sửa / xóa xe) cho trang Phương tiện của Admin / Operator =====
// Đồng bộ chỗ đỗ: xe đang đỗ tại Hub (mọi trạng thái trừ IN_USE) chiếm một slot gắn đúng vehicleId.

export interface VehicleFormInput {
  vehicleId: string;
  type: VehicleType;
  batteryLevel: string; // giữ dạng chuỗi để form hiện lỗi "không phải số"
  status: VehicleStatus;
  currentHubId: string;
}

export type VehicleFieldErrors = Partial<Record<keyof VehicleFormInput, string>>;

export type VehicleResult = { ok: true; vehicle: Vehicle } | { ok: false; errors: VehicleFieldErrors };

// Trạng thái do hệ thống quản lý (đặt xe, chuyến đi, phiên sạc): Admin không đổi tay được.
export const SYSTEM_MANAGED_STATUSES: VehicleStatus[] = [
  VehicleStatus.RESERVED,
  VehicleStatus.IN_USE,
  VehicleStatus.CHARGING,
];

export function isSystemManaged(status: VehicleStatus): boolean {
  return SYSTEM_MANAGED_STATUSES.includes(status);
}

// Mã xe tiếp theo chưa dùng: VH-001, VH-002, ...
export function nextVehicleId(): string {
  const used = new Set(useStore.getState().vehicles.map((v) => v.vehicleId));
  let n = used.size + 1;
  while (used.has(`VH-${String(n).padStart(3, "0")}`)) n++;
  return `VH-${String(n).padStart(3, "0")}`;
}

function validate(input: VehicleFormInput, isNew: boolean): VehicleFieldErrors {
  const s = useStore.getState();
  const errors: VehicleFieldErrors = {};
  const id = input.vehicleId.trim();

  if (isNew) {
    if (!id) errors.vehicleId = "Mã xe không được để trống.";
    else if (!/^[A-Za-z0-9_-]+$/.test(id)) errors.vehicleId = "Mã xe chỉ gồm chữ, số, dấu - và _.";
    else if (s.vehicles.some((v) => v.vehicleId.toLowerCase() === id.toLowerCase())) {
      errors.vehicleId = `Mã xe ${id} đã tồn tại.`;
    }
  }

  const battery = Number(input.batteryLevel);
  if (input.batteryLevel.trim() === "" || Number.isNaN(battery)) errors.batteryLevel = "Mức pin phải là số.";
  else if (battery < 0 || battery > 100) errors.batteryLevel = "Mức pin phải nằm trong khoảng 0–100%.";

  if (!s.hubs.some((h) => h.hubId === input.currentHubId)) errors.currentHubId = "Vui lòng chọn Hub.";
  return errors;
}

function now(): string {
  return simNowIso();
}

export function createVehicle(input: VehicleFormInput): VehicleResult {
  const errors = validate(input, true);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const vehicle: Vehicle = {
    vehicleId: input.vehicleId.trim(),
    type: input.type,
    batteryLevel: Math.round(Number(input.batteryLevel)),
    status: isSystemManaged(input.status) ? VehicleStatus.AVAILABLE : input.status,
    currentHubId: input.currentHubId,
  };

  // Xe mới đỗ tại Hub nên cần một slot trống.
  if (!ParkingService.occupySlot(vehicle.currentHubId, vehicle.vehicleId)) {
    return { ok: false, errors: { currentHubId: "Hub đã hết chỗ đỗ trống, hãy chọn Hub khác hoặc thêm slot." } };
  }

  const s = useStore.getState();
  s.addVehicle(vehicle);
  if (vehicle.status === VehicleStatus.FAULTY) raiseFaultTicket(vehicle, "Thêm mới với trạng thái lỗi");
  notify("role:OPERATOR", `Đã thêm phương tiện ${vehicle.vehicleId} vào ${hubName(vehicle.currentHubId)}.`, "success");
  return { ok: true, vehicle };
}

export function updateVehicle(vehicleId: string, input: VehicleFormInput): VehicleResult {
  const s = useStore.getState();
  const current = s.vehicles.find((v) => v.vehicleId === vehicleId);
  if (!current) return { ok: false, errors: { vehicleId: "Không tìm thấy phương tiện." } };

  const errors = validate(input, false);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const locked = isSystemManaged(current.status);
  // Xe đang được đặt / sử dụng / sạc: giữ nguyên Hub và trạng thái để không vỡ luồng của sinh viên.
  const nextHub = locked ? current.currentHubId : input.currentHubId;
  const nextStatus = locked ? current.status : input.status;
  const nextBattery = current.status === VehicleStatus.CHARGING || current.status === VehicleStatus.IN_USE
    ? current.batteryLevel
    : Math.round(Number(input.batteryLevel));

  if (nextHub !== current.currentHubId) {
    if (!ParkingService.occupySlot(nextHub, vehicleId)) {
      return { ok: false, errors: { currentHubId: "Hub đích đã hết chỗ đỗ trống." } };
    }
    ParkingService.releaseSlot(current.currentHubId, vehicleId);
  }

  const patch: Partial<Vehicle> = {
    type: input.type,
    batteryLevel: nextBattery,
    currentHubId: nextHub,
    status: nextStatus === VehicleStatus.FAULTY ? current.status : nextStatus,
  };
  s.updateVehicle(vehicleId, patch);

  if (nextStatus === VehicleStatus.FAULTY && current.status !== VehicleStatus.FAULTY) {
    raiseFaultTicket({ ...current, ...patch, currentHubId: nextHub }, "Admin đánh dấu xe lỗi khi chỉnh sửa");
  } else if (nextStatus !== VehicleStatus.FAULTY && current.status === VehicleStatus.FAULTY) {
    closeOpenTickets(vehicleId);
  }

  notify("role:OPERATOR", `Đã cập nhật thông tin phương tiện ${vehicleId}.`, "success");
  return { ok: true, vehicle: useStore.getState().vehicles.find((v) => v.vehicleId === vehicleId) ?? current };
}

// Trả về lý do không xóa được, hoặc null nếu xóa an toàn.
export function getDeleteBlocker(vehicleId: string): string | null {
  const s = useStore.getState();
  const vehicle = s.vehicles.find((v) => v.vehicleId === vehicleId);
  if (!vehicle) return "Không tìm thấy phương tiện.";
  if (vehicle.status === VehicleStatus.IN_USE) return "Xe đang được sinh viên sử dụng (chuyến đi chưa kết thúc).";
  if (vehicle.status === VehicleStatus.CHARGING) return "Xe đang trong phiên sạc.";
  if (vehicle.status === VehicleStatus.RESERVED) return "Xe đang được đặt trước.";
  if (s.trips.some((t) => t.vehicleId === vehicleId && t.status === TripStatus.ONGOING)) {
    return "Xe có chuyến đi đang diễn ra.";
  }
  if (
    s.vehicleReservations.some(
      (r) =>
        r.vehicleId === vehicleId &&
        (r.status === ReservationStatus.ACTIVE || r.status === ReservationStatus.CONFIRMED),
    )
  ) {
    return "Xe có lịch đặt trước còn hiệu lực.";
  }
  const session = s.chargingSessions.find(
    (cs) =>
      cs.vehicleId === vehicleId && (cs.status === SessionStatus.SCHEDULED || cs.status === SessionStatus.CHARGING),
  );
  if (session) return `Xe có phiên sạc ${session.sessionId} chưa kết thúc (đã xếp lịch hoặc đang sạc).`;
  const request = s.chargingRequests.find(
    (r) => r.vehicleId === vehicleId && (r.status === RequestStatus.PENDING || r.status === RequestStatus.SCHEDULED),
  );
  if (request) return `Xe có yêu cầu sạc ${request.requestId} đang chờ xử lý hoặc đã xếp lịch.`;
  const order = s.dispatchOrders.find(
    (o) =>
      o.vehicleIds.includes(vehicleId) &&
      (o.status === DispatchStatus.PROPOSED ||
        o.status === DispatchStatus.APPROVED ||
        o.status === DispatchStatus.IN_PROGRESS),
  );
  if (order) return `Xe nằm trong lệnh điều phối ${order.orderId} chưa hoàn tất.`;
  return null;
}

export function deleteVehicle(vehicleId: string): { ok: true } | { ok: false; reason: string } {
  const reason = getDeleteBlocker(vehicleId);
  if (reason) return { ok: false, reason };

  const s = useStore.getState();
  const vehicle = s.vehicles.find((v) => v.vehicleId === vehicleId);
  if (!vehicle) return { ok: false, reason: "Không tìm thấy phương tiện." };

  ParkingService.releaseSlot(vehicle.currentHubId, vehicleId);
  closeOpenTickets(vehicleId);
  s.removeVehicle(vehicleId);
  notify("role:OPERATOR", `Đã xóa phương tiện ${vehicleId} khỏi hệ thống.`, "warning");
  return { ok: true };
}

function hubName(hubId: string): string {
  return useStore.getState().hubs.find((h) => h.hubId === hubId)?.name ?? hubId;
}

function raiseFaultTicket(vehicle: Vehicle, description: string): void {
  OperationsService.handleIncident({
    ticketId: "",
    type: TicketType.VEHICLE_FAULT,
    targetId: vehicle.vehicleId,
    hubId: vehicle.currentHubId,
    description,
    status: TicketStatus.OPEN,
  });
}

function closeOpenTickets(vehicleId: string): void {
  const s = useStore.getState();
  for (const t of s.tickets) {
    if (t.targetId === vehicleId && t.status !== TicketStatus.CLOSED) {
      s.upsertTicket({ ...t, status: TicketStatus.CLOSED, closedAt: now() });
    }
  }
}
