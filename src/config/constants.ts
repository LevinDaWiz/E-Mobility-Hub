// Hằng số dùng chung. Thời gian tính theo đồng hồ mô phỏng (tăng tốc được ở Demo panel).

export const TICK_INTERVAL_MS = 1000;
export const SIM_SPEEDS = [1, 5, 10, 30, 60] as const;

// Thời hạn giữ chỗ (demo: ngắn để thấy được NIFR-01).
export const VEHICLE_RESERVATION_TTL_MS = 60_000;
export const PARKING_RESERVATION_TTL_MS = 120_000;

// Ngưỡng quá tải Hub (NIFR-03): utilization > ngưỡng → cảnh báo.
export const OVERLOAD_THRESHOLD = 0.85;
export const WARNING_THRESHOLD = 0.7;

// Pin thấp: gợi ý đăng ký sạc.
export const LOW_BATTERY_THRESHOLD = 20;
