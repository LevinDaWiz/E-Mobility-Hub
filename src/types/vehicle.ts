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
