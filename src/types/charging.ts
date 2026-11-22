export enum PortStatus {
  FREE = "FREE",
  RESERVED = "RESERVED",
  CHARGING = "CHARGING",
  FAULTY = "FAULTY",
  MAINTENANCE = "MAINTENANCE",
}

export enum PortKind {
  FAST = "FAST",
  STANDARD = "STANDARD",
}

export enum SessionStatus {
  SCHEDULED = "SCHEDULED",
  CHARGING = "CHARGING",
  COMPLETED = "COMPLETED",
  INTERRUPTED = "INTERRUPTED",
  CANCELLED = "CANCELLED",
}

export enum RequestStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
}

export interface ChargingPort {
  portId: string;
  powerKw: number;
  status: PortStatus;
  kind: PortKind;

  // ID biểu diễn association Hub 1--* ChargingPort.
  hubId: string;
  dockId: string;
  updatedAt: string;
}

export interface ChargingRequest {
  requestId: string;
  vehicleId: string; // Vehicle.vehicleId hoặc PersonalVehicle.vehicleId
  targetBattery: number;
  desiredStart: string;
  deadline: string;
  priority: number;
  priorityReason: string;
  status: RequestStatus;
  createdAt: string;

  // ID biểu diễn association ChargingRequest với Hub và Student.
  hubId: string;
  studentId: string | null; // null nếu không do sinh viên tạo
}

export interface ChargingSession {
  sessionId: string;
  startTime: string;
  endTime: string | null;
  expectedEnd: string;
  startBattery: number;
  currentBattery: number;
  targetBattery: number;
  status: SessionStatus;

  // IDs biểu diễn association ChargingSession với ChargingPort, Vehicle và ChargingRequest.
  portId: string;
  vehicleId: string;
  requestId: string | null; // null nếu phiên không gắn với ChargingRequest
  rescheduledFrom: string | null; // portId trước khi chuyển cổng; null nếu chưa chuyển
}
