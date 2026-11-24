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

  // Hub nơi xe đang đỗ lúc đặt (để báo cáo theo Hub). Bản ghi cũ có thể không có.
  hubId?: string;
}
