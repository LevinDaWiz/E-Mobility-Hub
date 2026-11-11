import type { StateCreator } from "zustand";
import type { SeedData } from "../data/seed";
import type { ChargingRequest, ChargingSession, ParkingReservation } from "../types";
import { upsertById } from "../utils/collections";
import type { AppState } from "./index";

// ===== M3 sở hữu file này: đặt chỗ đỗ, yêu cầu sạc, phiên sạc (UC05, UC07-UC10, UC12) =====
// Slot/port nằm ở coreSlice (đổi trạng thái qua updateParkingSlot / updateChargingPort).

export interface ParkingChargingSliceData {
  parkingReservations: ParkingReservation[];
  chargingRequests: ChargingRequest[];
  chargingSessions: ChargingSession[];
}

export interface ParkingChargingSliceActions {
  upsertParkingReservation: (r: ParkingReservation) => void;
  upsertChargingRequest: (r: ChargingRequest) => void;
  upsertChargingSession: (s: ChargingSession) => void;
}

export type ParkingChargingSlice = ParkingChargingSliceData & ParkingChargingSliceActions;

export function initialParkingChargingState(seed: SeedData): ParkingChargingSliceData {
  return {
    parkingReservations: [],
    chargingRequests: seed.chargingRequests,
    chargingSessions: seed.chargingSessions,
  };
}

export const createParkingChargingSlice: StateCreator<
  AppState,
  [],
  [],
  ParkingChargingSliceActions
> = (set) => ({
  upsertParkingReservation: (r) =>
    set((s) => ({ parkingReservations: upsertById(s.parkingReservations, r, "reservationId") })),
  upsertChargingRequest: (r) =>
    set((s) => ({ chargingRequests: upsertById(s.chargingRequests, r, "requestId") })),
  upsertChargingSession: (cs) =>
    set((s) => ({ chargingSessions: upsertById(s.chargingSessions, cs, "sessionId") })),
});
