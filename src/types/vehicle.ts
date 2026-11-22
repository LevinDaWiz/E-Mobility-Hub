import type { PortKind } from "./charging";

export enum VehicleStatus {
  AVAILABLE = "AVAILABLE",
  RESERVED = "RESERVED",
  IN_USE = "IN_USE",
  CHARGING = "CHARGING",
  FAULTY = "FAULTY",
}

export enum VehicleType {
  E_BIKE = "E_BIKE",
  E_MOTORBIKE = "E_MOTORBIKE",
}

export interface Vehicle {
  vehicleId: string;
  type: VehicleType;
  batteryLevel: number;
  status: VehicleStatus;
  currentHubId: string;
}

// Xe cá nhân sinh viên đã đăng ký (UC05, UC08, UC09, UC10). Tách khỏi Vehicle (xe dùng chung) để không
// lẫn vào tìm xe (M2), danh sách phương tiện (M4) và thống kê Hub.
export interface PersonalVehicle {
  // "PV-xxx", không trùng "VH-xxx" nên ChargingRequest/ChargingSession.vehicleId trỏ được tới cả hai loại xe.
  vehicleId: string;
  ownerId: string; // studentId (MSSV)
  type: VehicleType;
  plateNumber: string;
  model: string;
  batteryLevel: number; // 0..100, lần đọc IoT gần nhất
  batteryCapacityKwh: number;
  // Cổng nhanh nhất xe hỗ trợ: FAST dùng được cả cổng FAST và STANDARD; STANDARD chỉ dùng cổng STANDARD.
  portKind: PortKind;
  // Thời điểm IoT cập nhật pin gần nhất (UC05 E1 / UC10 E1: dữ liệu cũ thì hiện nhãn "Chưa cập nhật").
  batteryUpdatedAt: string;
}
