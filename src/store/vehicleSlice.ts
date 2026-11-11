import type { StateCreator } from "zustand";
import type { SeedData } from "../data/seed";
import type { Trip, VehicleReservation } from "../types";
import { upsertById } from "../utils/collections";
import type { AppState } from "./index";

// ===== M2 sở hữu file này: đặt xe, chuyến đi (UC03, UC04, UC06) =====
// Thêm state/action tuỳ ý. Nhớ cập nhật initialVehicleState để "reset dữ liệu" hoạt động.

export interface VehicleSliceData {
  vehicleReservations: VehicleReservation[];
  trips: Trip[];
}

export interface VehicleSliceActions {
  upsertVehicleReservation: (r: VehicleReservation) => void;
  upsertTrip: (t: Trip) => void;
}

export type VehicleSlice = VehicleSliceData & VehicleSliceActions;

export function initialVehicleState(seed: SeedData): VehicleSliceData {
  return { vehicleReservations: [], trips: seed.trips };
}

export const createVehicleSlice: StateCreator<AppState, [], [], VehicleSliceActions> = (set) => ({
  upsertVehicleReservation: (r) =>
    set((s) => ({ vehicleReservations: upsertById(s.vehicleReservations, r, "reservationId") })),
  upsertTrip: (t) => set((s) => ({ trips: upsertById(s.trips, t, "tripId") })),
});
