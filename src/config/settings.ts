import {
  DEFAULT_HUB_THRESHOLDS,
  IOT_DRAIN_PCT_PER_MIN,
  IOT_INTERVAL_MS,
  MAX_PORT_POWER_KW,
  METRO_POLL_INTERVAL_MS,
  METRO_SURGE_MULTIPLIER,
  PARKING_RESERVATION_TTL_MS,
  REPORT_HISTORY_LIMIT,
  REPORT_MAX_RANGE_DAYS,
  VEHICLE_RESERVATION_TTL_MS,
} from "./constants";

// ===== M1 sở hữu: cài đặt hệ thống do Quản trị viên chỉnh ở /admin/settings =====
// Giá trị mặc định lấy từ config/constants.ts. Mã nghiệp vụ đọc qua getSettings() (services/settingsService.ts)
// tại thời điểm dùng, không giữ bản sao, nên đổi cài đặt có hiệu lực ngay cho các thao tác MỚI.

export interface HubThresholdSettings {
  overload: number; // 0..1
  parkingWarning: number; // 0..1, không lớn hơn overload
  minAvailableVehicles: number;
  chargingOverload: number; // 0..1
}

export interface AppSettings {
  // Giữ chỗ (M2 đọc vehicleReservationMs; M3 đọc parkingReservationMs). Đơn vị ms, giờ mô phỏng.
  vehicleReservationMs: number;
  parkingReservationMs: number;

  // Ngưỡng mặc định áp dụng cho Hub tạo MỚI (Hub đã có giữ ngưỡng riêng).
  hubThresholds: HubThresholdSettings;

  // Công suất tối đa một cổng sạc được cấu hình (kW).
  maxPortPowerKw: number;

  // Dữ liệu ngoài (mô phỏng).
  metroSurgeMultiplier: number;
  metroPollMs: number; // chu kỳ lấy dữ liệu Metro (giờ mô phỏng)
  iotIntervalMs: number; // chu kỳ phát StateUpdate (giờ mô phỏng)
  iotDrainPctPerMin: number; // xe đang đi mất bao nhiêu % pin mỗi phút mô phỏng

  // Báo cáo.
  reportMaxRangeDays: number;
  reportHistoryLimit: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  vehicleReservationMs: VEHICLE_RESERVATION_TTL_MS,
  parkingReservationMs: PARKING_RESERVATION_TTL_MS,
  hubThresholds: { ...DEFAULT_HUB_THRESHOLDS },
  maxPortPowerKw: MAX_PORT_POWER_KW,
  metroSurgeMultiplier: METRO_SURGE_MULTIPLIER,
  metroPollMs: METRO_POLL_INTERVAL_MS,
  iotIntervalMs: IOT_INTERVAL_MS,
  iotDrainPctPerMin: IOT_DRAIN_PCT_PER_MIN,
  reportMaxRangeDays: REPORT_MAX_RANGE_DAYS,
  reportHistoryLimit: REPORT_HISTORY_LIMIT,
};

// Giới hạn cho phép của từng giá trị (dùng để kiểm tra form và hiện gợi ý).
export const SETTING_LIMITS = {
  reservationSeconds: { min: 5, max: 3600 },
  minAvailableVehicles: { min: 0, max: 100 },
  maxPortPowerKw: { min: 1, max: 350 },
  metroSurgeMultiplier: { min: 1, max: 10 },
  metroPollSeconds: { min: 5, max: 3600 },
  iotIntervalSeconds: { min: 1, max: 600 },
  iotDrainPctPerMin: { min: 0, max: 10 },
  reportMaxRangeDays: { min: 1, max: 730 },
  reportHistoryLimit: { min: 1, max: 200 },
} as const;
