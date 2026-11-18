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

// Đăng nhập giả lập (UC20)
export const AUTH_DELAY_MS = 1800;
export const DEFAULT_SCHOOL = "ĐH Bách Khoa — ĐHQG-HCM";

// Metro (UC21)
export const METRO_SURGE_MULTIPLIER = 3; // Metro surge: lượng khách gấp 3 lần bình thường
export const METRO_POLL_INTERVAL_MS = 60_000; // chu kỳ lấy dữ liệu Metro (giờ mô phỏng)
export const METRO_SURGE_FILL_EVERY_MS = 3_000; // mỗi 3 giây mô phỏng, mỗi Hub Metro đầy thêm 1 chỗ

// IoT (UC22)
export const IOT_INTERVAL_MS = 5_000; // chu kỳ phát StateUpdate (giờ mô phỏng)
export const IOT_DRAIN_PCT_PER_MIN = 0.5; // xe đang đi mất 0,5% pin / phút mô phỏng
export const IOT_RANDOM_FAULT_PROB = 0.0005; // xác suất lỗi ngẫu nhiên / thiết bị / chu kỳ (chỉ khi bật)
