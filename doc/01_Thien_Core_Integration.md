# M1 – Core, Tích hợp, Báo cáo, Admin

**UC phụ trách:** UC20 (xác thực), UC21 (Metro), UC22 (cập nhật trạng thái IoT/mô phỏng), UC17 (báo cáo thống kê), UC19 (cấu hình Hub & tài nguyên)
**NIFR:** NIFR-02 (tự cập nhật trạng thái), điều phối vòng lặp tick cho NIFR khác
**Nhánh:** `m1-core`

## A. Phase 0 – Nền tảng (làm đầu tiên, cả nhóm đang chờ)
- [ ] Cài `react-router-dom`, `zustand`, `recharts`, **`tailwindcss` + `@tailwindcss/vite`** (thêm plugin vào `vite.config.ts`, `@import "tailwindcss";` trong `index.css`). Nếu báo xung đột peer dependency với Vite hiện tại thì nâng phiên bản Tailwind/plugin lên bản mới nhất. Xóa nội dung mẫu trong `App.tsx`, `App.css`.
- [ ] `styles/statusColors.ts`: map enum trạng thái (VehicleStatus, PortStatus, SlotStatus, AlertSeverity...) → class Tailwind, để mọi trang dùng chung.
- [ ] Layout chính + **thanh chuyển vai trò** (Student / Operator / Admin / Management) và route cho mọi trang (placeholder).
- [ ] `components/ui` (viết bằng Tailwind): Button, Card, Badge (màu theo trạng thái), Table, Modal, Toast, Countdown, Progress.
- [ ] Cập nhật `types` theo mục 6 của README chung.
- [ ] `data/seed.ts`:
  - 6 Hub: ít nhất 1 METRO, 2 DORM, 2 CAMPUS, 1 SERVICE; mỗi Hub có 8–15 `ParkingSlot` và 2–4 `ChargingPort` (có cổng `powerKw` khác nhau).
  - 25–30 xe (E_BIKE, E_MOTORBIKE), pin 20–100%, rải đều Hub, vài xe CHARGING, 1–2 FAULTY.
  - 4 sinh viên, 2 operator (role OPERATIONAL / TECHNICAL), 1 admin, 1 ban quản lý.
  - Một Hub METRO được cố ý để gần ngưỡng quá tải (phục vụ demo M4).
- [ ] `store/index.ts` gộp slice; tạo sẵn file slice rỗng cho M2–M4 (state ban đầu + chỗ để họ thêm action).
- [ ] `utils/hubStats.ts`: `getHubUtilization`, đếm xe/cổng lỗi.
- [ ] `engine/tickEngine.ts`: `registerTickHandler(name, fn)`, chạy mỗi 1 giây; có đồng hồ mô phỏng (hệ số tăng tốc chỉnh được).
- [ ] `notify()` + chuông thông báo trên header.
- [ ] Cập nhật README gốc (cách chạy `npm i && npm run dev`).

## B. Use case
### UC20 – Xác thực sinh viên
- Trang login giả lập: chọn tài khoản mẫu (hoặc nhập token → `MockAuthAdapter implements AuthAdapter`).
- `AuthService.login(token)`, `logout()`; lưu `CurrentUser` trong store; chặn route theo vai trò.
- Luồng lỗi: token sai/hết hạn → thông báo lỗi.

### UC21 – Cung cấp dữ liệu Metro
- `MockMetroAdapter implements MetroAdapter` trả `MetroData` (lượng khách theo giờ, hard-code).
- Trang/nút **"Metro surge"** (trong Admin hoặc panel demo): đẩy lượng khách tăng đột biến vào store → M4 dùng cho cảnh báo và What-if METRO_SURGE.
- Kiểm tra schema dữ liệu (dữ liệu sai → từ chối, ghi cảnh báo).

### UC22 + NIFR-02 – Cập nhật dữ liệu trạng thái
- `engine/iotSimulator.ts implements IoTDataAdapter`: định kỳ phát `StateUpdate` (pin xe đang IN_USE giảm, xe CHARGING tăng nếu không có session do M3 quản lý, ngẫu nhiên báo cổng/xe lỗi ở mức rất thấp, có nút bật/tắt).
- `StateUpdateService.applyStateUpdate / validateUpdate`: dữ liệu hợp lệ → ghi store; không hợp lệ → bỏ qua và log.
- Có nút "Gây lỗi cổng sạc X" / "Gây lỗi xe Y" cho demo → gọi `OperationsService.handleIncident` của M4.

### UC19 – Quản lý cấu hình Hub và tài nguyên (Admin)
- Danh sách Hub, form sửa `HubConfig` (`parkingCapacity`, `chargingPorts`), nút thêm slot/cổng sạc.
- `HubConfigService.updateHubConfig`, `addResource`; validate (không giảm dưới số chỗ đang dùng).
- Thay đổi phải phản ánh ngay ở các trang của M2, M3, M4.

### UC17 – Báo cáo & thống kê (Ban quản lý)
- Trang báo cáo: chọn loại báo cáo + khoảng thời gian; biểu đồ (Recharts): utilization theo Hub, số chuyến đi, số phiên sạc, sự cố.
- `ReportService.generateReport`, `exportReport` (CSV tải về là đủ).
- Dữ liệu lấy từ store (trips, sessions, tickets…) + một ít dữ liệu lịch sử hard-code trong seed để biểu đồ không trống.

## C. Việc cuối dự án
- Tích hợp, sửa conflict, chạy toàn bộ kịch bản demo (mục 9 README chung).
- Panel "Demo controls" gom các nút: Metro surge, gây lỗi cổng/xe, tua nhanh thời gian, reset dữ liệu.
- Viết hướng dẫn chạy và demo.

## D. Bàn giao cho người khác (ngày 1)
`notify`, `registerTickHandler`, `getHubUtilization`, `applyStateUpdate`, `getSimulationInputs`, bộ UI component, seed data.

## E. Tiêu chí hoàn thành
- Người khác `git pull` là chạy được ngay, thấy đủ route và dữ liệu mẫu.
- Reset dữ liệu hoạt động; đổi vai trò không làm mất state.
- UC17, UC19, UC20, UC21, UC22 đạt Definition of Done ở README chung.
