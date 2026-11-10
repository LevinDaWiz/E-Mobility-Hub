export enum PortStatus {
  FREE = "FREE",
  RESERVED = "RESERVED",
  CHARGING = "CHARGING",
  FAULTY = "FAULTY",
}

export enum SessionStatus {
  SCHEDULED = "SCHEDULED",
  CHARGING = "CHARGING",
  COMPLETED = "COMPLETED",
  INTERRUPTED = "INTERRUPTED",
}

export enum RequestStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
}

export interface ChargingPort {
  portId: string;
  powerKw: number;
  status: PortStatus;
}

export interface ChargingRequest {
  requestId: string;
  vehicleId: string;
  targetBattery: number;
  desiredStart: string;
  deadline: string;
  priority: number;
  status: RequestStatus;
}

export interface ChargingSession {
  sessionId: string;
  startTime: string;
  endTime: string | null;
  startBattery: number;
  currentBattery: number;
  status: SessionStatus;

  // IDs biểu diễn association ChargingSession với ChargingPort và Vehicle.
  portId: string;
  vehicleId: string;
}
