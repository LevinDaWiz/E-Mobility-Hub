import { registerM1TickHandlers } from "./m1Handlers";
import { registerM2TickHandlers } from "./m2Handlers";
import { registerM3TickHandlers } from "./m3Handlers";

// ===== M1 sở hữu: điểm đăng ký DUY NHẤT cho mọi việc định kỳ (tick handler) của các module =====
// RootLayout gọi hàm này một lần khi ứng dụng khởi động. Thêm module mới (ví dụ M3: hết hạn đặt chỗ đỗ,
// tiến độ phiên sạc) bằng cách tạo engine/m3Handlers.ts rồi thêm một dòng vào mảng bên dưới.

export function registerAllTickHandlers(): () => void {
  const stops = [registerM1TickHandlers(), registerM2TickHandlers(), registerM3TickHandlers()];
  return () => stops.forEach((stop) => stop());
}
