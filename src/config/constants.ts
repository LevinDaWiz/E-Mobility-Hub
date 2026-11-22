// Hằng số dùng chung. Thời gian tính theo đồng hồ mô phỏng (tăng tốc được ở Demo panel).

export const TICK_INTERVAL_MS = 1000;
export const SIM_SPEEDS = [1, 5, 10, 30, 60] as const;

// Thời hạn giữ chỗ (demo: ngắn để thấy được NIFR-01).
// Đây chỉ là GIÁ TRỊ MẶC ĐỊNH; thời hạn đang áp dụng nằm ở settings (Cài đặt > Giữ chỗ), đọc bằng getSettings().
export const VEHICLE_RESERVATION_TTL_MS = 30_000;
export const PARKING_RESERVATION_TTL_MS = 120_000;

// Ngưỡng mặc định của Hub mới (mỗi Hub có ngưỡng riêng trong Hub.thresholds, chỉnh ở UC19).
// Quá tải (NIFR-03): mức sử dụng > overload. Cảnh báo: mức sử dụng >= parkingWarning.
export const OVERLOAD_THRESHOLD = 0.9;
export const WARNING_THRESHOLD = 0.85;
export const DEFAULT_HUB_THRESHOLDS = {
  overload: 0.9,
  parkingWarning: 0.85,
  minAvailableVehicles: 3,
  chargingOverload: 0.9,
} as const;

// UC19: công suất cổng sạc tối đa theo định mức lưới điện hạ thế; số dòng mỗi trang của bảng.
export const MAX_PORT_POWER_KW = 22;
export const TABLE_PAGE_SIZE = 6;

// Pin thấp: gợi ý đăng ký sạc.
export const LOW_BATTERY_THRESHOLD = 20;

// Dung lượng pin mặc định theo loại xe (kWh).
export const BATTERY_CAPACITY_KWH = {
  E_BIKE: 1.5,
  E_MOTORBIKE: 3.4,
} as const;

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

// Báo cáo (UC17)
export const REPORT_HISTORY_DAYS = 180; // số ngày dữ liệu lịch sử mẫu có sẵn tính đến hôm nay
export const REPORT_MAX_RANGE_DAYS = 366;
export const REPORT_GENERATE_DELAY_MS = 1200; // thời gian "Đang tạo báo cáo..." (thật, không phải giờ mô phỏng)
export const REPORT_SCHEDULE_CHECK_MS = 5_000; // chu kỳ kiểm tra báo cáo định kỳ (giờ mô phỏng)
export const REPORT_HISTORY_LIMIT = 20; // số báo cáo đã tạo được giữ lại
