import { PortStatus, SlotStatus, VehicleStatus } from "../types";
import { useStore, type AppState } from "../store";

// ===== M1 sở hữu: thống kê Hub dùng chung cho M2, M3, M4 =====

export interface HubStats {
  hubId: string;
  totalSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  maintenanceSlots: number;
  freeSlots: number; // slot FREE (không tính bảo trì / đặt trước / có xe)
  // (OCCUPIED + RESERVED) / tổng slot (bảo trì vẫn tính vào sức chứa), trong khoảng 0..1.
  utilization: number;
  totalPorts: number;
  freePorts: number;
  chargingPorts: number;
  reservedPorts: number;
  faultyPorts: number;
  maintenancePorts: number;
  // Tỷ lệ cổng đang dùng / cổng còn hoạt động (không lỗi, không bảo trì), 0..1.
  chargingUtilization: number;
  vehicleCount: number;
  availableVehicles: number;
  faultyVehicles: number;
}

type StatsInput = Pick<AppState, "parkingSlots" | "chargingPorts" | "vehicles">;

export function computeHubStats(state: StatsInput, hubId: string): HubStats {
  const slots = state.parkingSlots.filter((s) => s.hubId === hubId);
  const ports = state.chargingPorts.filter((p) => p.hubId === hubId);
  const vehicles = state.vehicles.filter((v) => v.currentHubId === hubId);

  const count = (status: SlotStatus) => slots.filter((s) => s.status === status).length;
  const portCount = (status: PortStatus) => ports.filter((p) => p.status === status).length;
  const occupiedSlots = count(SlotStatus.OCCUPIED);
  const reservedSlots = count(SlotStatus.RESERVED);
  const totalSlots = slots.length;
  const chargingPorts = portCount(PortStatus.CHARGING);
  const reservedPorts = portCount(PortStatus.RESERVED);
  const faultyPorts = portCount(PortStatus.FAULTY);
  const maintenancePorts = portCount(PortStatus.MAINTENANCE);
  const workingPorts = ports.length - faultyPorts - maintenancePorts;

  return {
    hubId,
    totalSlots,
    occupiedSlots,
    reservedSlots,
    maintenanceSlots: count(SlotStatus.MAINTENANCE),
    freeSlots: count(SlotStatus.FREE),
    utilization: totalSlots === 0 ? 0 : (occupiedSlots + reservedSlots) / totalSlots,
    totalPorts: ports.length,
    freePorts: portCount(PortStatus.FREE),
    chargingPorts,
    reservedPorts,
    faultyPorts,
    maintenancePorts,
    chargingUtilization: workingPorts <= 0 ? 0 : (chargingPorts + reservedPorts) / workingPorts,
    vehicleCount: vehicles.length,
    availableVehicles: vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE).length,
    faultyVehicles: vehicles.filter((v) => v.status === VehicleStatus.FAULTY).length,
  };
}

export const getHubStats = (hubId: string): HubStats => computeHubStats(useStore.getState(), hubId);

// Hợp đồng chung: tỷ lệ sử dụng 0..1.
export const getHubUtilization = (hubId: string): number => getHubStats(hubId).utilization;

export function getNetworkFaultCounts(): { faultyVehicles: number; faultyPorts: number } {
  const { vehicles, chargingPorts } = useStore.getState();
  return {
    faultyVehicles: vehicles.filter((v) => v.status === VehicleStatus.FAULTY).length,
    faultyPorts: chargingPorts.filter((p) => p.status === PortStatus.FAULTY).length,
  };
}
