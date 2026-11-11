import { OVERLOAD_THRESHOLD } from "../config/constants";
import { useStore } from "../store";
import type {
  ChargingPort,
  ChargingSession,
  Hub,
  MetroData,
  ParkingSlot,
  Vehicle,
} from "../types";
import { simNowIso } from "../utils/time";

// ===== M1 sở hữu: snapshot cách ly cho What-if (M4) =====
// Trả về BẢN SAO SÂU; M4 tính trên bản sao, không được ghi ngược vào store (NIFR-08).

export interface SimulationInputs {
  takenAt: string;
  overloadThreshold: number;
  hubs: Hub[];
  parkingSlots: ParkingSlot[];
  chargingPorts: ChargingPort[];
  vehicles: Vehicle[];
  chargingSessions: ChargingSession[];
  metroData: MetroData;
}

export function getSimulationInputs(): SimulationInputs {
  const s = useStore.getState();
  return structuredClone({
    takenAt: simNowIso(),
    overloadThreshold: OVERLOAD_THRESHOLD,
    hubs: s.hubs,
    parkingSlots: s.parkingSlots,
    chargingPorts: s.chargingPorts,
    vehicles: s.vehicles,
    chargingSessions: s.chargingSessions,
    metroData: s.metroData,
  });
}
