export enum ReservationStatus {
  ACTIVE = "ACTIVE",
  CONFIRMED = "CONFIRMED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export interface VehicleReservation {
  reservationId: string;
  createdAt: string;
  expiresAt: string;
  status: ReservationStatus;

  // IDs biểu diễn các association Student 1--* VehicleReservation
  // và Vehicle 1--* VehicleReservation trong class diagram.
  studentId: string;
  vehicleId: string;
}
