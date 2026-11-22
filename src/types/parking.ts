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

// Trạng thái dùng chung ReservationStatus:
//   ACTIVE = đang giữ chỗ, đếm ngược tới expiresAt (UC08 "Đã xác nhận");
//   CONFIRMED = đã quét mã nhận chỗ, xe đang đỗ (checkedInAt != null; xe rời Hub thì endedAt != null);
//   EXPIRED = quá hạn không đến (NIFR-01); CANCELLED = sinh viên hủy.
export interface ParkingReservation {
  reservationId: string;
  studentId: string;
  createdAt: string;
  expiresAt: string;
  status: ReservationStatus;

  // ID biểu diễn association ParkingReservation * --> 1 ParkingSlot, và Hub.
  slotId: string;
  hubId: string;

  vehicleId: string; // xe cá nhân (PV-xxx)
  arrivalTime: string; // giờ dự kiến đến
  durationMin: number; // thời lượng đỗ
  checkedInAt: string | null;
  endedAt: string | null;
}
