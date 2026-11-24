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

// Xe cá nhân của sinh viên, tách biệt với Vehicle (xe dùng chung).
export interface PersonalVehicle {
  vehicleId: string;
  type: VehicleType;
  plateNumber: string;
  model: string;
  batteryLevel: number;
  batteryCapacityKwh: number;
  batteryUpdatedAt: string;
  portKind: PortKind; // FAST: dùng được cổng FAST và STANDARD; STANDARD: chỉ cổng STANDARD

  // ID biểu diễn association Student 1--* PersonalVehicle.
  ownerId: string;
}
