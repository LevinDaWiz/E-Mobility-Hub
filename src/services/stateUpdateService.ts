import { useStore } from "../store";
import { PortStatus, SlotStatus, VehicleStatus, type StateUpdate } from "../types";

// ===== M1 sở hữu (UC22): nhận StateUpdate từ IoT/mô phỏng và ghi vào store =====
// Quy ước payload:
//   { entity: "vehicle", id: "VH-001", batteryLevel?: 0..100, status?: VehicleStatus }
//   { entity: "port",    id: "HUB-DORM-01-P1", status?: PortStatus }
//   { entity: "slot",    id: "HUB-DORM-01-S03", status?: SlotStatus }

const STATUS_BY_ENTITY: Record<string, string[]> = {
  vehicle: Object.values(VehicleStatus),
  port: Object.values(PortStatus),
  slot: Object.values(SlotStatus),
};

export function validateUpdate(update: StateUpdate): boolean {
  if (!update || typeof update.sourceId !== "string" || update.sourceId === "") return false;
  if (Number.isNaN(new Date(update.timestamp).getTime())) return false;

  const { entity, id, status, batteryLevel } = update.payload;
  if (typeof entity !== "string" || !(entity in STATUS_BY_ENTITY)) return false;
  if (typeof id !== "string" || id === "") return false;
  if (status !== undefined && !STATUS_BY_ENTITY[entity].includes(String(status))) return false;
  if (batteryLevel !== undefined) {
    if (entity !== "vehicle") return false;
    if (typeof batteryLevel !== "number" || batteryLevel < 0 || batteryLevel > 100) return false;
  }
  return true;
}

// Trả về true nếu cập nhật được áp dụng; dữ liệu sai / không tìm thấy đối tượng → false (bỏ qua).
export function applyStateUpdate(update: StateUpdate): boolean {
  if (!validateUpdate(update)) {
    console.warn("[stateUpdate] bỏ qua cập nhật không hợp lệ", update);
    return false;
  }
  const store = useStore.getState();
  const { entity, id, status, batteryLevel } = update.payload as {
    entity: string;
    id: string;
    status?: string;
    batteryLevel?: number;
  };

  if (entity === "vehicle") {
    if (!store.vehicles.some((v) => v.vehicleId === id)) return false;
    store.updateVehicle(id, {
      ...(batteryLevel !== undefined && { batteryLevel }),
      ...(status !== undefined && { status: status as VehicleStatus }),
    });
    return true;
  }
  if (entity === "port") {
    if (!store.chargingPorts.some((p) => p.portId === id)) return false;
    store.updateChargingPort(id, { ...(status !== undefined && { status: status as PortStatus }) });
    return true;
  }
  if (!store.parkingSlots.some((p) => p.slotId === id)) return false;
  store.updateParkingSlot(id, { ...(status !== undefined && { status: status as SlotStatus }) });
  return true;
}

export const StateUpdateService = { validateUpdate, applyStateUpdate };
