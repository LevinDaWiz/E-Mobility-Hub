import type { StateCreator } from "zustand";
import type { SeedData } from "../data/seed";
import type { Trip, VehicleReservation } from "../types";
import { upsertById } from "../utils/collections";
import type { AppState } from "./index";

// M2 – UC03, UC04, UC06: lưu các lượt đặt xe và chuyến đi.
// Trạng thái bản thân chiếc xe vẫn thuộc coreSlice (M1).
export interface VehicleSliceData {
  vehicleReservations: VehicleReservation[];
  trips: Trip[];
}

export interface VehicleSliceActions {
  // Thêm lượt đặt mới hoặc cập nhật lượt đặt có cùng reservationId.
  upsertVehicleReservation: (reservation: VehicleReservation) => void;
  // Thêm chuyến đi mới hoặc cập nhật chuyến đi có cùng tripId.
  upsertTrip: (trip: Trip) => void;
}

export type VehicleSlice = VehicleSliceData & VehicleSliceActions;

// Khi bấm Reset, dữ liệu đặt xe được xóa; các chuyến đi mẫu được phục hồi.
export function initialVehicleState(seed: SeedData): VehicleSliceData {
  return {
    vehicleReservations: [],
    trips: seed.trips,
  };
}

export const createVehicleSlice: StateCreator<AppState, [], [], VehicleSliceActions> =
  (set) => ({
    upsertVehicleReservation: (reservation) =>
      set((state) => ({
        vehicleReservations: upsertById(
          state.vehicleReservations,
          reservation,
          "reservationId",
        ),
      })),
    upsertTrip: (trip) =>
      set((state) => ({
        trips: upsertById(state.trips, trip, "tripId"),
      })),
  });
