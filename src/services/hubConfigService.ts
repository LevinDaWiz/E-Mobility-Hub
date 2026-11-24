import { useStore } from "../store";
import {
  HubOperationalStatus,
  HubType,
  ReservationStatus,
  RequestStatus,
  DispatchStatus,
  TicketStatus,
  PortKind,
  PortStatus,
  SessionStatus,
  SlotKind,
  SlotStatus,
  VehicleStatus,
  type ChargingPort,
  type Hub,
  type ParkingSlot,
} from "../types";
import { resourceCode } from "../utils/resourceCode";
import { notify } from "./notificationService";
import { getSettings } from "./settingsService";

// ===== M1 sở hữu (UC19): cấu hình Hub, chỗ đỗ, cổng sạc =====
// Mọi hàm ghi trả về Result thay vì ném lỗi, để giao diện hiện đúng loại phản hồi theo mockup:
//   validation → lỗi dưới từng ô;  blocked → modal "Không thể vô hiệu hóa tài nguyên";
//   conflict   → banner "409 Conflict" (phiên bản bản ghi đã đổi).

export type FieldErrors = Record<string, string>;

export type Result<T = void> =
  | { ok: true; value: T }
  | { ok: false; kind: "validation"; errors: FieldErrors }
  | { ok: false; kind: "blocked"; resource: string; reason: string; reasons?: string[] }
  | { ok: false; kind: "conflict"; yourVersion: number; latest: Hub };

const success = <T>(value: T): Result<T> => ({ ok: true, value });
const invalid = (errors: FieldErrors): Result<never> => ({ ok: false, kind: "validation", errors });

const state = () => useStore.getState();
const nowIso = () => new Date(state().clock.now).toISOString();
const actor = () => state().currentUser.name;

// ---------- tiện ích kiểm tra ----------

const MSG_POSITIVE_INT = "Giá trị phải là số nguyên dương.";
const MSG_NON_NEGATIVE_INT = "Giá trị phải là số nguyên không âm.";

function parseInteger(value: string): number | null {
  const v = value.trim();
  return /^-?\d+$/.test(v) ? Number(v) : null;
}

// "90%" hoặc "90" → 0.9; sai định dạng hoặc ngoài 0..100 → null.
export function parsePercent(value: string): number | null {
  const v = value.trim().replace(/%$/, "").trim().replace(",", ".");
  if (v === "" || Number.isNaN(Number(v))) return null;
  const n = Number(v);
  return n < 0 || n > 100 ? null : n / 100;
}

export const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

// "P-081" + 1 → "P-082" (giữ số 0 đứng đầu). Không có số ở cuối: "SNS" + 1 → "SNS-2".
export function incrementCode(code: string, offset: number): string {
  if (offset === 0) return code;
  const match = /^(.*?)(\d+)$/.exec(code);
  if (!match) return `${code}-${offset + 1}`;
  const next = String(Number(match[2]) + offset).padStart(match[2].length, "0");
  return `${match[1]}${next}`;
}

const hasTrailingNumber = (code: string) => /\d$/.test(code);

function findHub(hubId: string): Hub | undefined {
  return state().hubs.find((h) => h.hubId === hubId);
}

function touchHub(hubId: string, patch: Partial<Hub> = {}): void {
  state().updateHub(hubId, { ...patch, updatedAt: nowIso(), updatedBy: actor() });
}

// ---------- lý do chặn vô hiệu hóa ----------

// Cổng đang sạc hoặc có lịch sạc đã đặt thì không được bảo trì / vô hiệu hóa.
function portBlockReason(port: ChargingPort): string | null {
  const { chargingSessions } = state();
  const active = chargingSessions.find((s) => s.portId === port.portId && s.status === SessionStatus.CHARGING);
  if (port.status === PortStatus.CHARGING || active) {
    return `đang sạc xe ${active?.vehicleId ?? "(không rõ)"}`;
  }
  const scheduled = chargingSessions.find((s) => s.portId === port.portId && s.status === SessionStatus.SCHEDULED);
  if (port.status === PortStatus.RESERVED || scheduled) {
    return scheduled ? `có lịch sạc đặt trước cho xe ${scheduled.vehicleId}` : "có lịch đặt trước";
  }
  return null;
}

function slotBlockReason(slot: ParkingSlot): string | null {
  if (slot.status === SlotStatus.OCCUPIED) return `đang có xe ${slot.vehicleId ?? "cá nhân"} đỗ`;
  if (slot.status === SlotStatus.RESERVED) return "có lịch đặt trước";
  return null;
}

function hubDisableReason(hubId: string): string | null {
  const { chargingPorts, parkingSlots, vehicles } = state();
  const charging = chargingPorts.filter((p) => p.hubId === hubId && portBlockReason(p) !== null).length;
  if (charging > 0) return `còn ${charging} cổng sạc đang sạc hoặc có lịch sạc`;
  const reserved = parkingSlots.filter((s) => s.hubId === hubId && s.status === SlotStatus.RESERVED).length;
  if (reserved > 0) return `còn ${reserved} chỗ đỗ đang được đặt trước`;
  const reservedVehicles = vehicles.filter((v) => v.currentHubId === hubId && v.status === VehicleStatus.RESERVED).length;
  if (reservedVehicles > 0) return `còn ${reservedVehicles} xe đang được đặt trước`;
  return null;
}

// ---------- Hub ----------

export interface NewHubInput {
  hubId: string;
  name: string;
  type: HubType;
  location: string;
  capacity: string;
  initialSlots: string;
  initialPorts: string;
  status: HubOperationalStatus;
}

export function createHub(input: NewHubInput): Result<Hub> {
  const errors: FieldErrors = {};
  const hubId = input.hubId.trim().toUpperCase();
  const capacity = parseInteger(input.capacity);
  const initialSlots = parseInteger(input.initialSlots);
  const initialPorts = parseInteger(input.initialPorts);

  if (hubId === "") errors.hubId = "Hub ID là bắt buộc.";
  else if (!/^HUB(-[A-Z0-9]+)+$/.test(hubId)) errors.hubId = "Hub ID phải có dạng HUB-XXX-X (chữ in hoa, số, dấu gạch).";
  else if (findHub(hubId)) errors.hubId = `${hubId} đã tồn tại. Hub ID không được trùng.`;

  if (input.name.trim() === "") errors.name = "Tên Hub là bắt buộc.";
  if (input.location.trim() === "") errors.location = "Vị trí là bắt buộc.";
  if (capacity === null || capacity <= 0) errors.capacity = MSG_POSITIVE_INT;
  if (initialSlots === null || initialSlots < 0) errors.initialSlots = MSG_NON_NEGATIVE_INT;
  else if (capacity !== null && capacity > 0 && initialSlots > capacity) {
    errors.initialSlots = "Số chỗ đỗ ban đầu không được vượt sức chứa.";
  }
  if (initialPorts === null || initialPorts < 0) errors.initialPorts = MSG_NON_NEGATIVE_INT;
  if (Object.keys(errors).length > 0) return invalid(errors);

  const at = nowIso();
  const hub: Hub = {
    hubId,
    name: input.name.trim(),
    type: input.type,
    location: input.location.trim(),
    area: input.name.trim(),
    parkingCapacity: capacity as number,
    operationalStatus: input.status,
    // Ngưỡng mặc định lấy từ Cài đặt (chỉ áp dụng cho Hub mới; Hub đã có giữ ngưỡng riêng).
    thresholds: { ...getSettings().hubThresholds },
    version: 1,
    updatedBy: actor(),
    updatedAt: at,
  };

  const slots: ParkingSlot[] = Array.from({ length: initialSlots as number }, (_, i) => {
    const code = `S${String(i + 1).padStart(2, "0")}`;
    return {
      slotId: `${hubId}-${code}`,
      hubId,
      status: SlotStatus.FREE,
      kind: i % 2 === 0 ? SlotKind.SHARED : SlotKind.PERSONAL,
      vehicleId: null,
      sensorId: `SNS-${hubId.replace("HUB-", "")}-${code}`,
      updatedAt: at,
    };
  });
  const ports: ChargingPort[] = Array.from({ length: initialPorts as number }, (_, i) => ({
    portId: `${hubId}-P${i + 1}`,
    hubId,
    kind: i % 2 === 0 ? PortKind.FAST : PortKind.STANDARD,
    powerKw: i % 2 === 0 ? 7 : 3.5,
    dockId: `DOCK-${hubId.replace("HUB-", "")}-${i + 1}`,
    status: PortStatus.FREE,
    updatedAt: at,
  }));

  const store = state();
  store.addHub(hub);
  store.addParkingSlots(slots);
  store.addChargingPorts(ports);
  notify(store.currentUser.userId, `Đã tạo Hub ${hub.name}`, "success");
  return success(hub);
}

export interface HubConfigInput {
  name: string;
  capacity: string;
  operationalStatus: HubOperationalStatus;
  overload: string; // "90%" hoặc "90"
  parkingWarning: string;
  minAvailableVehicles: string;
  chargingOverload: string;
}

export function hubToConfigInput(hub: Hub): HubConfigInput {
  return {
    name: hub.name,
    capacity: String(hub.parkingCapacity),
    operationalStatus: hub.operationalStatus,
    overload: formatPercent(hub.thresholds.overload),
    parkingWarning: formatPercent(hub.thresholds.parkingWarning),
    minAvailableVehicles: String(hub.thresholds.minAvailableVehicles),
    chargingOverload: formatPercent(hub.thresholds.chargingOverload),
  };
}

// Lưu cấu hình với khoá lạc quan: expectedVersion là phiên bản lúc người dùng mở form.
export function updateHubConfig(hubId: string, input: HubConfigInput, expectedVersion: number): Result<Hub> {
  const hub = findHub(hubId);
  if (!hub) return invalid({ form: "Không tìm thấy Hub." });

  if (hub.version !== expectedVersion) {
    return { ok: false, kind: "conflict", yourVersion: expectedVersion, latest: hub };
  }

  const errors: FieldErrors = {};
  const slotCount = state().parkingSlots.filter((s) => s.hubId === hubId).length;
  const capacity = parseInteger(input.capacity);
  const overload = parsePercent(input.overload);
  const parkingWarning = parsePercent(input.parkingWarning);
  const chargingOverload = parsePercent(input.chargingOverload);
  const minAvailable = parseInteger(input.minAvailableVehicles);

  if (input.name.trim() === "") errors.name = "Tên Hub là bắt buộc.";
  if (capacity === null || capacity <= 0) errors.capacity = MSG_POSITIVE_INT;
  else if (capacity < slotCount) errors.capacity = `Sức chứa không thể nhỏ hơn số chỗ đỗ hiện có (${slotCount}).`;
  if (overload === null) errors.overload = "Giá trị phải từ 0% đến 100%.";
  if (parkingWarning === null) errors.parkingWarning = "Giá trị phải từ 0% đến 100%.";
  else if (overload !== null && parkingWarning > overload) {
    errors.parkingWarning = "Ngưỡng cảnh báo phải nhỏ hơn hoặc bằng ngưỡng quá tải.";
  }
  if (minAvailable === null || minAvailable < 0) errors.minAvailableVehicles = MSG_NON_NEGATIVE_INT;
  if (chargingOverload === null) errors.chargingOverload = "Giá trị phải từ 0% đến 100%.";
  if (Object.keys(errors).length > 0) return invalid(errors);

  if (input.operationalStatus === HubOperationalStatus.UNAVAILABLE && hub.operationalStatus !== HubOperationalStatus.UNAVAILABLE) {
    const reason = hubDisableReason(hubId);
    if (reason) return { ok: false, kind: "blocked", resource: `Hub ${hub.name} (${hub.hubId})`, reason };
  }

  const updated: Partial<Hub> = {
    name: input.name.trim(),
    area: hub.area === hub.name ? input.name.trim() : hub.area,
    parkingCapacity: capacity as number,
    operationalStatus: input.operationalStatus,
    thresholds: {
      overload: overload as number,
      parkingWarning: parkingWarning as number,
      minAvailableVehicles: minAvailable as number,
      chargingOverload: chargingOverload as number,
    },
    version: hub.version + 1,
  };
  touchHub(hubId, updated);
  notify(state().currentUser.userId, `Đã lưu cấu hình ${updated.name} (v${hub.version + 1})`, "success");
  return success(findHub(hubId) as Hub);
}

// Chỉ để demo xung đột 409: giả lập một quản trị viên khác vừa sửa cấu hình Hub.
export function simulateOtherAdminEdit(hubId: string): boolean {
  const hub = findHub(hubId);
  if (!hub) return false;
  const overload = Math.min(1, Math.round((hub.thresholds.overload + 0.02) * 100) / 100);
  state().updateHub(hubId, {
    thresholds: { ...hub.thresholds, overload, parkingWarning: Math.min(hub.thresholds.parkingWarning, overload) },
    version: hub.version + 1,
    updatedBy: "Admin02",
    updatedAt: nowIso(),
  });
  return true;
}

// ---------- Chỗ đỗ ----------

export interface NewSlotInput {
  code: string;
  kind: SlotKind;
  status: "FREE" | "MAINTENANCE";
  sensorId: string;
  quantity: string;
}

export function addSlots(hubId: string, input: NewSlotInput): Result<ParkingSlot[]> {
  const hub = findHub(hubId);
  if (!hub) return invalid({ form: "Không tìm thấy Hub." });

  const errors: FieldErrors = {};
  const code = input.code.trim();
  const quantity = parseInteger(input.quantity);
  if (code === "") errors.code = "Slot ID là bắt buộc.";
  if (quantity === null || quantity <= 0) errors.quantity = MSG_POSITIVE_INT;
  else if (quantity > 1 && code !== "" && !hasTrailingNumber(code)) {
    errors.code = "Slot ID cần kết thúc bằng số khi thêm nhiều ô (ví dụ P-081).";
  }

  if (!errors.code) {
    const existing = new Set(state().parkingSlots.map((s) => s.slotId));
    const toCheck = quantity !== null && quantity > 0 ? quantity : 1;
    for (let i = 0; i < toCheck; i++) {
      const c = incrementCode(code, i);
      if (existing.has(`${hubId}-${c}`)) {
        errors.code = `${c} đã tồn tại. Mã ô phải là duy nhất.`;
        break;
      }
    }
  }
  if (Object.keys(errors).length > 0) return invalid(errors);

  const at = nowIso();
  const slots: ParkingSlot[] = Array.from({ length: quantity as number }, (_, i) => ({
    slotId: `${hubId}-${incrementCode(code, i)}`,
    hubId,
    status: input.status === "MAINTENANCE" ? SlotStatus.MAINTENANCE : SlotStatus.FREE,
    kind: input.kind,
    vehicleId: null,
    sensorId: input.sensorId.trim() === "" ? "" : incrementCode(input.sensorId.trim(), i),
    updatedAt: at,
  }));

  state().addParkingSlots(slots);
  // Phải đọc lại state: bản chụp trước khi thêm không chứa slot mới.
  const total = state().parkingSlots.filter((s) => s.hubId === hubId).length;
  touchHub(hubId, total > hub.parkingCapacity ? { parkingCapacity: total } : {});
  notify(state().currentUser.userId, `Đã thêm ${slots.length} chỗ đỗ vào ${hub.name}`, "success");
  return success(slots);
}

export function updateSlot(slotId: string, input: { kind: SlotKind; sensorId: string }): Result {
  const slot = state().parkingSlots.find((s) => s.slotId === slotId);
  if (!slot) return invalid({ form: "Không tìm thấy chỗ đỗ." });
  state().updateParkingSlot(slotId, { kind: input.kind, sensorId: input.sensorId.trim() });
  touchHub(slot.hubId);
  return success(undefined);
}

// on = true: đặt bảo trì (bị chặn nếu đang có xe / có lịch đặt trước); on = false: bật lại.
export function setSlotMaintenance(slotId: string, on: boolean): Result {
  const slot = state().parkingSlots.find((s) => s.slotId === slotId);
  if (!slot) return invalid({ form: "Không tìm thấy chỗ đỗ." });
  const hub = findHub(slot.hubId);

  if (on) {
    const reason = slotBlockReason(slot);
    if (reason) {
      return {
        ok: false,
        kind: "blocked",
        resource: `${resourceCode(slotId, slot.hubId)} · Chỗ đỗ, ${hub?.name ?? slot.hubId}`,
        reason,
      };
    }
    state().updateParkingSlot(slotId, { status: SlotStatus.MAINTENANCE });
  } else if (slot.status === SlotStatus.MAINTENANCE) {
    state().updateParkingSlot(slotId, { status: SlotStatus.FREE });
  }
  touchHub(slot.hubId);
  return success(undefined);
}

// ---------- Cổng sạc ----------

export interface PortFormInput {
  code: string;
  kind: PortKind;
  powerKw: string;
  dockId: string;
  status: "FREE" | "MAINTENANCE";
}

function validatePortFields(input: Pick<PortFormInput, "powerKw" | "dockId">): FieldErrors {
  const errors: FieldErrors = {};
  const power = Number(input.powerKw.trim().replace(",", "."));
  if (input.powerKw.trim() === "" || Number.isNaN(power) || power <= 0) errors.powerKw = "Công suất phải là số dương.";
  else if (power > getSettings().maxPortPowerKw) errors.powerKw = "Công suất vượt định mức của lưới điện hạ thế.";
  if (input.dockId.trim() === "") errors.dockId = "Dock ID là bắt buộc.";
  return errors;
}

export function addPort(hubId: string, input: PortFormInput): Result<ChargingPort> {
  const hub = findHub(hubId);
  if (!hub) return invalid({ form: "Không tìm thấy Hub." });

  const errors = validatePortFields(input);
  const code = input.code.trim();
  if (code === "") errors.code = "Port ID là bắt buộc.";
  else if (state().chargingPorts.some((p) => p.portId === `${hubId}-${code}`)) {
    errors.code = `${code} đã tồn tại. Mã cổng phải là duy nhất.`;
  }
  if (Object.keys(errors).length > 0) return invalid(errors);

  const port: ChargingPort = {
    portId: `${hubId}-${code}`,
    hubId,
    kind: input.kind,
    powerKw: Number(input.powerKw.trim().replace(",", ".")),
    dockId: input.dockId.trim(),
    status: input.status === "MAINTENANCE" ? PortStatus.MAINTENANCE : PortStatus.FREE,
    updatedAt: nowIso(),
  };
  state().addChargingPorts([port]);
  touchHub(hubId);
  notify(state().currentUser.userId, `Đã thêm cổng sạc ${code} vào ${hub.name}`, "success");
  return success(port);
}

export function updatePort(portId: string, input: Pick<PortFormInput, "kind" | "powerKw" | "dockId">): Result {
  const port = state().chargingPorts.find((p) => p.portId === portId);
  if (!port) return invalid({ form: "Không tìm thấy cổng sạc." });
  const errors = validatePortFields(input);
  if (Object.keys(errors).length > 0) return invalid(errors);

  state().updateChargingPort(portId, {
    kind: input.kind,
    powerKw: Number(input.powerKw.trim().replace(",", ".")),
    dockId: input.dockId.trim(),
  });
  touchHub(port.hubId);
  return success(undefined);
}

export function setPortMaintenance(portId: string, on: boolean): Result {
  const port = state().chargingPorts.find((p) => p.portId === portId);
  if (!port) return invalid({ form: "Không tìm thấy cổng sạc." });
  const hub = findHub(port.hubId);

  if (on) {
    const reason = portBlockReason(port);
    if (reason) {
      return {
        ok: false,
        kind: "blocked",
        resource: `${resourceCode(portId, port.hubId)} · Cổng sạc, ${hub?.name ?? port.hubId}`,
        reason,
      };
    }
    state().updateChargingPort(portId, { status: PortStatus.MAINTENANCE });
  } else if (port.status === PortStatus.MAINTENANCE) {
    state().updateChargingPort(portId, { status: PortStatus.FREE });
  }
  touchHub(port.hubId);
  return success(undefined);
}

// ---------- Xóa Hub / chỗ đỗ / cổng sạc (chỉ Quản trị viên) ----------
// Quy trình ở giao diện: getDeleteImpact (chặn nếu còn xe / lịch / phiếu) → popup cảnh báo → nhập mã để xác nhận lại →
// deleteX (kiểm tra lại lần cuối vì dữ liệu có thể đã đổi). Dữ liệu lịch sử (chuyến đi, phiên sạc đã kết thúc, phiếu sự cố
// đã đóng) được giữ lại và hiển thị theo mã.

export type DeleteKind = "hub" | "slot" | "port";

export interface DeleteImpact {
  kind: DeleteKind;
  id: string;
  code: string; // chuỗi người dùng phải nhập lại để xác nhận
  label: string; // "Chỗ đỗ S01 · Hub KTX Khu A"
  blockers: string[]; // còn lý do nào thì không được xóa
  consequences: string[]; // những gì sẽ mất
  retained: string[]; // những gì được giữ lại
}

const isOpenTicket = (status: TicketStatus) => status !== TicketStatus.CLOSED;
const isLiveParkingReservation = (status: ReservationStatus) =>
  status === ReservationStatus.ACTIVE || status === ReservationStatus.CONFIRMED;

function slotDeleteBlockers(slot: ParkingSlot): string[] {
  const blockers: string[] = [];
  const reason = slotBlockReason(slot);
  if (reason) blockers.push(`Chỗ đỗ ${reason}.`);
  const live = state().parkingReservations.filter((r) => r.slotId === slot.slotId && isLiveParkingReservation(r.status));
  if (live.length > 0 && !reason) blockers.push(`Chỗ đỗ có ${live.length} lượt đặt trước còn hiệu lực.`);
  return blockers;
}

function portDeleteBlockers(port: ChargingPort): string[] {
  const blockers: string[] = [];
  const reason = portBlockReason(port);
  if (reason) blockers.push(`Cổng sạc ${reason}.`);
  const tickets = state().tickets.filter((t) => t.targetId === port.portId && isOpenTicket(t.status));
  if (tickets.length > 0) blockers.push(`Cổng sạc có ${tickets.length} phiếu sự cố chưa đóng (${tickets.map((t) => t.ticketId).join(", ")}).`);
  return blockers;
}

function hubDeleteBlockers(hubId: string): string[] {
  const s = state();
  const blockers: string[] = [];
  if (s.hubs.length <= 1) blockers.push("Đây là Hub cuối cùng; hệ thống phải còn ít nhất một Hub.");

  const vehicles = s.vehicles.filter((v) => v.currentHubId === hubId).length;
  if (vehicles > 0) blockers.push(`Còn ${vehicles} phương tiện thuộc Hub này. Hãy điều phối sang Hub khác trước.`);

  const slots = s.parkingSlots.filter((p) => p.hubId === hubId);
  const busySlots = slots.filter((p) => slotDeleteBlockers(p).length > 0).length;
  if (busySlots > 0) blockers.push(`Còn ${busySlots} chỗ đỗ đang có xe hoặc có lịch đặt trước.`);

  const ports = s.chargingPorts.filter((p) => p.hubId === hubId);
  const busyPorts = ports.filter((p) => portBlockReason(p) !== null).length;
  if (busyPorts > 0) blockers.push(`Còn ${busyPorts} cổng sạc đang sạc hoặc có lịch sạc.`);

  const tickets = s.tickets.filter((t) => t.hubId === hubId && isOpenTicket(t.status)).length;
  if (tickets > 0) blockers.push(`Còn ${tickets} phiếu sự cố chưa đóng tại Hub này.`);

  // M3: yêu cầu sạc đang chờ / đã xếp lịch và lượt đặt chỗ đỗ còn hiệu lực gắn với Hub này.
  const requests = s.chargingRequests.filter(
    (r) => r.hubId === hubId && (r.status === RequestStatus.PENDING || r.status === RequestStatus.SCHEDULED),
  ).length;
  if (requests > 0) blockers.push(`Còn ${requests} yêu cầu sạc đang chờ hoặc đã xếp lịch tại Hub này.`);

  const parkingBookings = s.parkingReservations.filter((r) => r.hubId === hubId && isLiveParkingReservation(r.status)).length;
  if (parkingBookings > 0) blockers.push(`Còn ${parkingBookings} lượt đặt chỗ đỗ còn hiệu lực tại Hub này.`);

  const dispatches = s.dispatchOrders.filter(
    (o) => (o.fromHubId === hubId || o.toHubId === hubId) && o.status !== DispatchStatus.DONE && o.status !== DispatchStatus.CANCELLED,
  ).length;
  if (dispatches > 0) blockers.push(`Còn ${dispatches} lệnh điều phối chưa hoàn tất liên quan đến Hub này.`);

  return blockers;
}

export function getDeleteImpact(kind: DeleteKind, id: string): DeleteImpact | null {
  const s = state();
  if (kind === "slot") {
    const slot = s.parkingSlots.find((p) => p.slotId === id);
    if (!slot) return null;
    const hub = findHub(slot.hubId);
    const code = resourceCode(slot.slotId, slot.hubId);
    const remaining = s.parkingSlots.filter((p) => p.hubId === slot.hubId).length - 1;
    return {
      kind,
      id,
      code,
      label: `Chỗ đỗ ${code} · ${hub?.name ?? slot.hubId}`,
      blockers: slotDeleteBlockers(slot),
      consequences: [
        `Chỗ đỗ ${code} bị xóa vĩnh viễn khỏi ${hub?.name ?? slot.hubId}; Hub còn ${remaining} chỗ đỗ.`,
        ...(remaining === 0 ? ["Hub sẽ không còn chỗ đỗ nào, sinh viên không thể trả xe tại đây."] : []),
        "Tỷ lệ lấp đầy và cảnh báo quá tải của Hub được tính lại theo số chỗ mới.",
      ],
      retained: ["Lịch sử chuyến đi và đặt chỗ cũ vẫn được giữ."],
    };
  }
  if (kind === "port") {
    const port = s.chargingPorts.find((p) => p.portId === id);
    if (!port) return null;
    const hub = findHub(port.hubId);
    const code = resourceCode(port.portId, port.hubId);
    const remaining = s.chargingPorts.filter((p) => p.hubId === port.hubId).length - 1;
    return {
      kind,
      id,
      code,
      label: `Cổng sạc ${code} · ${hub?.name ?? port.hubId}`,
      blockers: portDeleteBlockers(port),
      consequences: [
        `Cổng sạc ${code} (${port.powerKw} kW) bị xóa vĩnh viễn khỏi ${hub?.name ?? port.hubId}; Hub còn ${remaining} cổng sạc.`,
        ...(remaining === 0 ? ["Hub sẽ không còn cổng sạc nào, không thể xếp lịch sạc tại đây."] : []),
        "Tỷ lệ sử dụng cổng sạc của Hub được tính lại theo số cổng mới.",
      ],
      retained: ["Lịch sử các phiên sạc đã kết thúc tại cổng này vẫn được giữ (hiển thị theo mã cổng)."],
    };
  }
  const hub = findHub(id);
  if (!hub) return null;
  const slots = s.parkingSlots.filter((p) => p.hubId === id).length;
  const ports = s.chargingPorts.filter((p) => p.hubId === id).length;
  return {
    kind,
    id,
    code: hub.hubId,
    label: `Hub ${hub.name} (${hub.hubId})`,
    blockers: hubDeleteBlockers(id),
    consequences: [
      `Hub ${hub.name} bị xóa vĩnh viễn cùng ${slots} chỗ đỗ và ${ports} cổng sạc của Hub.`,
      "Cấu hình ngưỡng, trạng thái và các cảnh báo của Hub bị xóa.",
      "Hub biến mất khỏi bản đồ, danh sách Hub của sinh viên, màn hình vận hành và báo cáo mới.",
    ],
    retained: ["Lịch sử chuyến đi, phiên sạc và phiếu sự cố đã đóng vẫn được giữ (hiển thị theo mã Hub)."],
  };
}

const notAdmin = (resource: string): Result<never> => ({
  ok: false,
  kind: "blocked",
  resource,
  reason: "Chỉ Quản trị viên được xóa.",
  reasons: ["Chỉ Quản trị viên được xóa."],
});

function blockedResult(impact: DeleteImpact): Result<never> {
  return { ok: false, kind: "blocked", resource: impact.label, reason: impact.blockers.join(" "), reasons: impact.blockers };
}

// Kiểm tra lại toàn bộ điều kiện ngay lúc xóa (dữ liệu có thể đã đổi từ lúc mở popup).
function checkedImpact(kind: DeleteKind, id: string): { impact: DeleteImpact } | { result: Result<never> } {
  const impact = getDeleteImpact(kind, id);
  const noun = kind === "hub" ? "Hub" : kind === "slot" ? "chỗ đỗ" : "cổng sạc";
  if (!impact) return { result: invalid({ form: `Không tìm thấy ${noun}.` }) };
  if (state().currentUser.role !== "ADMIN") return { result: notAdmin(impact.label) };
  if (impact.blockers.length > 0) return { result: blockedResult(impact) };
  return { impact };
}

export function deleteSlot(slotId: string): Result {
  const checked = checkedImpact("slot", slotId);
  if ("result" in checked) return checked.result;
  const slot = state().parkingSlots.find((p) => p.slotId === slotId);
  if (!slot) return invalid({ form: "Không tìm thấy chỗ đỗ." });
  state().removeParkingSlots([slotId]);
  touchHub(slot.hubId);
  notify(state().currentUser.userId, `Đã xóa ${checked.impact.label}`, "success");
  return success(undefined);
}

export function deletePort(portId: string): Result {
  const checked = checkedImpact("port", portId);
  if ("result" in checked) return checked.result;
  const port = state().chargingPorts.find((p) => p.portId === portId);
  if (!port) return invalid({ form: "Không tìm thấy cổng sạc." });
  state().removeChargingPorts([portId]);
  touchHub(port.hubId);
  notify(state().currentUser.userId, `Đã xóa ${checked.impact.label}`, "success");
  return success(undefined);
}

export function deleteHub(hubId: string): Result<{ slots: number; ports: number }> {
  const checked = checkedImpact("hub", hubId);
  if ("result" in checked) return checked.result;
  const slots = state().parkingSlots.filter((p) => p.hubId === hubId).length;
  const ports = state().chargingPorts.filter((p) => p.hubId === hubId).length;
  state().removeHub(hubId);
  state().purgeHubOps(hubId);
  notify(state().currentUser.userId, `Đã xóa ${checked.impact.label}`, "success");
  notify("role:OPERATOR", `${checked.impact.label} đã bị Quản trị viên xóa khỏi hệ thống.`, "warning");
  return success({ slots, ports });
}

// ---------- Nhập từ tệp (CSV / JSON) ----------

export type ImportRow = Record<string, string>;

export interface ImportSummary {
  added: number;
  errors: string[]; // "Dòng 3: ..."
}

// JSON: mảng đối tượng. CSV: dòng đầu là tên cột. Tên cột không phân biệt hoa thường.
export function parseImportText(text: string, fileName: string): { rows: ImportRow[]; error?: string } {
  const trimmed = text.trim();
  if (trimmed === "") return { rows: [], error: "Tệp rỗng." };

  const normalize = (row: Record<string, unknown>): ImportRow =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? "").trim()]));

  if (fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("[")) {
    try {
      const data: unknown = JSON.parse(trimmed);
      if (!Array.isArray(data)) return { rows: [], error: "JSON phải là một mảng các đối tượng." };
      return { rows: data.map((r) => normalize((r ?? {}) as Record<string, unknown>)) };
    } catch {
      return { rows: [], error: "JSON không hợp lệ." };
    }
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { rows: [], error: "CSV cần dòng tiêu đề và ít nhất một dòng dữ liệu." };
  const split = (line: string) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const header = split(lines[0]).map((h) => h.toLowerCase());
  return { rows: lines.slice(1).map((l) => normalize(Object.fromEntries(split(l).map((c, i) => [header[i] ?? `col${i}`, c])))) };
}

function firstError(errors: FieldErrors): string {
  return Object.values(errors)[0] ?? "Dữ liệu không hợp lệ.";
}

// Giá trị không rỗng đầu tiên trong các cột (CSV có thể để trống ô).
const pickValue = (row: ImportRow, keys: string[], fallback = ""): string => {
  for (const key of keys) if ((row[key] ?? "") !== "") return row[key];
  return fallback;
};

const pickEnum = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T => {
  const upper = (value ?? "").toUpperCase();
  return (allowed as readonly string[]).includes(upper) ? (upper as T) : fallback;
};

// Cột: code (hoặc slotid/id), kind, status, sensorid, quantity. Dòng hợp lệ được thêm, dòng lỗi được báo.
export function importSlots(hubId: string, rows: ImportRow[]): ImportSummary {
  const summary: ImportSummary = { added: 0, errors: [] };
  rows.forEach((row, i) => {
    const result = addSlots(hubId, {
      code: pickValue(row, ["code", "slotid", "id"]),
      kind: pickEnum(row.kind, [SlotKind.SHARED, SlotKind.PERSONAL], SlotKind.SHARED),
      status: pickEnum(row.status, ["FREE", "MAINTENANCE"] as const, "FREE"),
      sensorId: pickValue(row, ["sensorid", "sensor"]),
      quantity: pickValue(row, ["quantity"], "1"),
    });
    if (result.ok) summary.added += result.value.length;
    else if (result.kind === "validation") summary.errors.push(`Dòng ${i + 2}: ${firstError(result.errors)}`);
  });
  return summary;
}

// Cột: code (hoặc portid/id), kind, powerkw, dockid, status.
export function importPorts(hubId: string, rows: ImportRow[]): ImportSummary {
  const summary: ImportSummary = { added: 0, errors: [] };
  rows.forEach((row, i) => {
    const kind = pickEnum(row.kind, [PortKind.FAST, PortKind.STANDARD], PortKind.STANDARD);
    const result = addPort(hubId, {
      code: pickValue(row, ["code", "portid", "id"]),
      kind,
      powerKw: pickValue(row, ["powerkw", "power"], kind === PortKind.FAST ? "7" : "3.5"),
      dockId: pickValue(row, ["dockid", "dock"]),
      status: pickEnum(row.status, ["FREE", "MAINTENANCE"] as const, "FREE"),
    });
    if (result.ok) summary.added += 1;
    else if (result.kind === "validation") summary.errors.push(`Dòng ${i + 2}: ${firstError(result.errors)}`);
  });
  return summary;
}

// Cột: hubid, name, type, location, capacity, initialslots, initialports, status.
export function importHubs(rows: ImportRow[]): ImportSummary {
  const summary: ImportSummary = { added: 0, errors: [] };
  rows.forEach((row, i) => {
    const result = createHub({
      hubId: pickValue(row, ["hubid", "id"]),
      name: row.name ?? "",
      type: pickEnum(row.type, Object.values(HubType), HubType.CAMPUS),
      location: row.location ?? "",
      capacity: row.capacity ?? "",
      initialSlots: pickValue(row, ["initialslots"], "0"),
      initialPorts: pickValue(row, ["initialports"], "0"),
      status: pickEnum(row.status, Object.values(HubOperationalStatus), HubOperationalStatus.MAINTENANCE),
    });
    if (result.ok) summary.added += 1;
    else if (result.kind === "validation") summary.errors.push(`Dòng ${i + 2}: ${firstError(result.errors)}`);
  });
  return summary;
}
