export enum HubType {
  METRO = "METRO",
  DORM = "DORM",
  CAMPUS = "CAMPUS",
  SERVICE = "SERVICE",
}

// Trạng thái vận hành do quản trị viên đặt. Trạng thái hiển thị (Overloaded / At Risk...) được suy ra
// từ mức sử dụng và ngưỡng, xem utils/hubStatus.ts.
export enum HubOperationalStatus {
  AVAILABLE = "AVAILABLE",
  MAINTENANCE = "MAINTENANCE",
  UNAVAILABLE = "UNAVAILABLE",
}

// Ngưỡng cấu hình riêng cho từng Hub (UC19). Các tỷ lệ nằm trong khoảng 0..1.
export interface HubThresholds {
  overload: number; // Overload Threshold: mức sử dụng chỗ đỗ coi là quá tải
  parkingWarning: number; // Parking Warning Threshold: ngưỡng cảnh báo chỗ đỗ
  minAvailableVehicles: number; // số xe khả dụng tối thiểu
  chargingOverload: number; // Charging Overload Threshold: ngưỡng quá tải cổng sạc
}

export interface Hub {
  hubId: string;
  name: string;
  type: HubType;
  location: string;
  parkingCapacity: number;

  // Khu vực dùng để lọc danh sách Hub.
  area: string;
  operationalStatus: HubOperationalStatus;
  thresholds: HubThresholds;

  // Khoá lạc quan: tăng 1 mỗi lần lưu cấu hình; lưu với version cũ → xung đột 409.
  version: number;
  updatedBy: string;
  updatedAt: string;
}
