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

// COMPLETED gồm cả "Hoàn tất (dừng sớm)" (UC10 A1): currentBattery < targetBattery.
// CANCELLED: sinh viên/Operator hủy lịch, hoặc quá hạn cắm sạc (UC09 E3, NIFR-01).
export enum SessionStatus {
  SCHEDULED = "SCHEDULED",
  CHARGING = "CHARGING",
  COMPLETED = "COMPLETED",
  INTERRUPTED = "INTERRUPTED",
  CANCELLED = "CANCELLED",
}

// PENDING: đang chờ trong hàng đợi (UC05 A2). SCHEDULED: đã có phiên sạc giữ cổng.
// COMPLETED: phiên sạc của yêu cầu đã kết thúc (không còn chặn xóa xe).
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
  vehicleId: string; // xe dùng chung (VH-xxx) hoặc xe cá nhân (PV-xxx)
  targetBattery: number;
  desiredStart: string;
  deadline: string; // thời điểm dự kiến sử dụng tiếp theo
  priority: number;
  status: RequestStatus;

  // Hub muốn sạc (UC05 bước 5, UC09 bước 1).
  hubId: string;
  // Sinh viên gửi yêu cầu; null nếu do vận hành tạo (xe dùng chung cần sạc để cho thuê).
  studentId: string | null;
  createdAt: string; // để tính thời gian đã chờ (NIFR-05)
  // Lý do của điểm ưu tiên, để Operator xem và chỉnh tay (NIFR-05 yêu cầu 6).
  priorityReason: string;
}

export interface ChargingSession {
  sessionId: string;
  startTime: string; // giờ bắt đầu theo lịch (SCHEDULED) hoặc thực tế (CHARGING)
  endTime: string | null; // giờ kết thúc thực tế
  startBattery: number;
  currentBattery: number;
  status: SessionStatus;

  // IDs biểu diễn association ChargingSession với ChargingPort và Vehicle.
  portId: string;
  vehicleId: string;

  // Yêu cầu sạc sinh ra phiên này (UC05/UC09); null nếu Operator phân bổ trực tiếp (UC12).
  requestId: string | null;
  targetBattery: number;
  // Giờ kết thúc dự kiến: dùng cho timeline UC12, kiểm tra trùng khung giờ trên cùng cổng.
  expectedEnd: string;
  // Cổng cũ khi phiên bị xếp lại do cổng lỗi (NIFR-06), để UI hiện "cổng cũ → cổng mới".
  rescheduledFrom: string | null;
}
