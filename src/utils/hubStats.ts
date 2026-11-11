import { PortStatus, SlotStatus, VehicleStatus } from "../types";
import { useStore, type AppState } from "../store";

// ===== M1 sở hữu: thống kê Hub dùng chung cho M2, M3, M4 =====

export interface HubStats {
  hubId: string;
  totalSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  freeSlots: number;
  // (OCCUPIED + RESERVED) / tổng slot, trong khoảng 0..1.
  utilization: number;
  totalPorts: number;
  freePorts: number;
  chargingPorts: number;
  faultyPorts: number;
  vehicleCount: number;
  availableVehicles: number;
  faultyVehicles: number;
}

type StatsInput = Pick<AppState, "parkingSlots" | "chargingPorts" | "vehicles">;

export function computeHubStats(state: StatsInput, hubId: string): HubStats {
  const slots = state.parkingSlots.filter((s) => s.hubId === hubId);
  const ports = state.chargingPorts.filter((p) => p.hubId === hubId);
  const vehicles = state.vehicles.filter((v) => v.currentHubId === hubId);

  const occupiedSlots = slots.filter((s) => s.status === SlotStatus.OCCUPIED).length;
  const reservedSlots = slots.filter((s) => s.status === SlotStatus.RESERVED).length;
  const totalSlots = slots.length;

  return {
    hubId,
    totalSlots,
    occupiedSlots,
    reservedSlots,
    freeSlots: totalSlots - occupiedSlots - reservedSlots,
    utilization: totalSlots === 0 ? 0 : (occupiedSlots + reservedSlots) / totalSlots,
    totalPorts: ports.length,
    freePorts: ports.filter((p) => p.status === PortStatus.FREE).length,
    chargingPorts: ports.filter((p) => p.status === PortStatus.CHARGING).length,
    faultyPorts: ports.filter((p) => p.status === PortStatus.FAULTY).length,
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
