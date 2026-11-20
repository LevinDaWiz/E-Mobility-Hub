import type { ReservationStatus } from "./reservation";

export enum SlotStatus {
  FREE = "FREE",
  RESERVED = "RESERVED",
  OCCUPIED = "OCCUPIED",
  MAINTENANCE = "MAINTENANCE",
}

// SHARED: chỗ cho xe dùng chung; PERSONAL: chỗ đỗ xe cá nhân.
export enum SlotKind {
  SHARED = "SHARED",
  PERSONAL = "PERSONAL",
}

export interface ParkingSlot {
  slotId: string;
  status: SlotStatus;
  kind: SlotKind;

  // ID biểu diễn association Hub 1--* ParkingSlot.
  hubId: string;
  // Xe dùng chung đang đỗ (null nếu trống hoặc là xe cá nhân không theo dõi).
  vehicleId: string | null;
  sensorId: string;
  updatedAt: string;
}

export interface ParkingReservation {
  reservationId: string;
  studentId: string;
  createdAt: string;
  expiresAt: string;
  status: ReservationStatus;

  // ID biểu diễn association ParkingReservation * --> 1 ParkingSlot, và Hub.
  slotId: string;
  hubId: string;
}
