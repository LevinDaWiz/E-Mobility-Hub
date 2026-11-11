import type { ReservationStatus } from "./reservation";

export enum SlotStatus {
  FREE = "FREE",
  RESERVED = "RESERVED",
  OCCUPIED = "OCCUPIED",
}

export interface ParkingSlot {
  slotId: string;
  status: SlotStatus;

  // ID biểu diễn association Hub 1--* ParkingSlot.
  hubId: string;
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
