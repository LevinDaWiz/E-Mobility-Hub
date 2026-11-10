export enum SlotStatus {
  FREE = "FREE",
  RESERVED = "RESERVED",
  OCCUPIED = "OCCUPIED",
}

export interface ParkingSlot {
  slotId: string;
  status: SlotStatus;
}

export interface ParkingReservation {
  reservationId: string;
  studentId: string;
  createdAt: string;
  expiresAt: string;

  // ID biểu diễn association ParkingReservation * --> 1 ParkingSlot.
  slotId: string;
}
