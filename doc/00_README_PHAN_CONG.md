# Smart E-Mobility Hub – MVP: Phân công 4 thành viên

Dự án: `E-Mobility-Hub` (Vite + React 19 + TypeScript). **Chỉ frontend**, toàn bộ dữ liệu hard-code/in-memory, logic nghiệp vụ chạy trong trình duyệt. Tên lớp, enum, trạng thái bám sát class diagram (`class_all.puml`) và Submission 3.

## 1. Bảng phân công

| # | Vai trò | Use case | Engine / NIFR | File hướng dẫn |
|---|---------|----------|---------------|----------------|
| M1 | Core, Tích hợp, Báo cáo, Admin | UC17, UC19, UC20, UC21, UC22 | NIFR-02 (cập nhật trạng thái), điều phối tick | `01_Member1_Core_Integration.md` |
| M2 | Sinh viên – xe dùng chung | UC01, UC02, UC03, UC04, UC06 | NIFR-01 (hết hạn đặt xe) | `02_Member2_Student_SharedVehicle.md` |
| M3 | Sinh viên – xe cá nhân, Đỗ & Sạc | UC05, UC07, UC08, UC09, UC10, UC12 | NIFR-01 (hết hạn đặt chỗ), NIFR-05, NIFR-06 | `03_Member3_Parking_Charging.md` |
| M4 | Vận hành & Mô phỏng | UC11, UC13, UC14, UC15, UC16, UC18 | NIFR-03, NIFR-04 | `04_Member4_Operator_Simulation.md` |

Đủ 22 UC. M1 làm nền tảng trước nên nhẹ về nghiệp vụ ở tuần đầu, M2 nhẹ nhất về số UC nhưng có luồng dài nhất (đặt → nhận → trả).

## 2. Công nghệ chung
- React Router (`react-router-dom`), **Zustand** (state tập trung, thay cho DB), Recharts (biểu đồ), **Tailwind CSS** (đã chốt; cài theo hướng dẫn Vite của Tailwind, dùng `@tailwindcss/vite`).
- **Quy ước Tailwind:** ưu tiên class tiện ích; không viết CSS riêng trừ `index.css`. Dùng lại component trong `components/ui` (M1) thay vì tự lặp chuỗi class. Màu trạng thái dùng chung một bảng map (`statusColors.ts` của M1), ví dụ AVAILABLE=xanh lá, RESERVED=vàng, IN_USE=xanh dương, CHARGING=tím, FAULTY=đỏ. Thiết kế responsive (mobile-first) vì sinh viên dùng trên điện thoại.
- Không gọi API thật. Thời gian dùng `Date` + một **đồng hồ mô phỏng** (M1) để demo nhanh (ví dụ hết hạn đặt xe sau 30 giây thay vì 15 phút).

## 3. Cấu trúc thư mục & quyền sở hữu

```
src/
  types/                 M1 sở hữu (cần sửa → báo M1 hoặc tạo PR nhỏ riêng)
  data/seed.ts           M1 sở hữu (cần thêm dữ liệu → nhờ M1 hoặc PR nhỏ)
  store/
    index.ts             M1 (gộp các slice)
    coreSlice.ts         M1: hubs, slots, ports, vehicles, students, operators, clock, notifications
    vehicleSlice.ts      M2: vehicleReservations, trips
    parkingChargingSlice.ts  M3: parkingReservations, chargingRequests, chargingSessions
    opsSlice.ts          M4: alerts, dispatchOrders, tickets, simulationRuns/results
    reportSlice.ts       M1: reports
  services/              mỗi người một file theo tên trong class diagram (xem file riêng)
  engine/
    tickEngine.ts        M1
    iotSimulator.ts      M1
    chargingScheduler.ts M3
    overloadHandler.ts   M4
  components/ui/         M1 (Button, Card, Badge, Table, Modal, Toast, Countdown...)
  pages/
    auth/ admin/ reports/ metro/        M1
    student/shared/                     M2
    student/personal/ operator/charging/ M3
    operator/ simulation/               M4
```

**Quy tắc vàng:** mỗi người chỉ sửa file trong thư mục mình sở hữu. Cần gì ở thư mục người khác → dùng hàm họ export (mục 5) hoặc nhắn họ.

> **Cập nhật:** code Phase 0 đã được viết sẵn trong `E-Mobility-Hub-phase0.zip` (giải nén đè vào project, xem README trong zip). M1 chỉ cần chạy, kiểm tra và đẩy lên `main`. Lưu ý: `registerTickHandler(name, fn)` nhận `now` là **số ms** (epoch mô phỏng); mỗi người khai báo route/menu trong `pages/<khu>/module.tsx` của mình.

## 4. Phase 0 – M1 làm xong TRƯỚC (cả nhóm chờ, mục tiêu 1 ngày)
M1 đẩy lên nhánh `main`:
1. Cài thư viện, router, layout, **thanh chuyển vai trò** (Student / Operator / Admin / Management), `components/ui`.
2. Cập nhật `types` (xem mục 6), `seed.ts` (xem file M1), store gộp slice (các slice của M2–M4 là file rỗng có sẵn state ban đầu).
3. `tickEngine` với cơ chế đăng ký handler.
4. Trang placeholder cho từng route để mọi người chỉ việc thay nội dung.

Sau đó M2, M3, M4 làm song song.

## 5. Hợp đồng giữa các module (đừng đổi chữ ký hàm nếu chưa báo nhóm)

| Hàm | Chủ sở hữu | Ai gọi | Mục đích |
|-----|-----------|--------|----------|
| `getHubUtilization(hubId): number` (0–1) | M1 (`utils/hubStats.ts`) | M3, M4 | Tỷ lệ chỗ đỗ đã dùng/đã giữ |
| `notify(userId, message, level)` | M1 | tất cả | Thông báo toast/chuông |
| `registerTickHandler(name, fn(now))` | M1 | M2, M3, M4 | Đăng ký việc chạy định kỳ |
| `ParkingService.hasFreeSlot(hubId)` / `occupySlot(hubId)` / `releaseSlot(hubId)` | M3 | M2 (trả xe UC06) | Kiểm tra & chiếm chỗ khi trả xe |
| `ChargingService.submitChargingRequest(...)` | M3 | M2 (sau khi trả xe, nút "Đăng ký sạc") | UC05 |
| `VehicleService.getVehicleStatus(id)` | M2 | M3, M4 | Trạng thái xe |
| `OperationsService.raiseAlert(hubId, type, severity)` | M4 | M1, M3 | Tạo cảnh báo |
| `OperationsService.handleIncident(...)` | M4 | M3 (cổng sạc lỗi), M1 (IoT báo lỗi) | Tạo ticket sự cố |
| `ChargingScheduler.rescheduleOnConflict(sessionId)` | M3 | M4 (UC14, UC15) | Xếp lại lịch sạc |
| `applyStateUpdate(update: StateUpdate)` | M1 | iotSimulator, M4 (mô phỏng) | Ghi trạng thái xe/cổng/slot vào store |
| `getSimulationInputs()` | M1 | M4 | Snapshot dữ liệu cho What-if |

## 6. Thay đổi `types` cần làm ở Phase 0 (M1)
- `ParkingSlot`, `ChargingPort`: thêm `hubId: string`.
- `ParkingReservation`: thêm `hubId`, `status: ReservationStatus` (class diagram có `confirm()/cancel()`).
- `Report`: thêm `data: Record<string, unknown>` để UC17 hiển thị/xuất.
- Thêm `AppNotification { id, userId, message, level, createdAt, read }`.
- Thêm `Role = "STUDENT" | "OPERATOR" | "ADMIN" | "MANAGEMENT"` và `CurrentUser`.

## 7. Git
- `main` chỉ nhận code đã chạy được. Mỗi người một nhánh: `m1-core`, `m2-shared-vehicle`, `m3-parking-charging`, `m4-ops-sim`.
- PR nhỏ, merge thường xuyên (ít nhất mỗi 2–3 ngày) để tránh conflict lớn.
- Không commit `node_modules` (đã có `.gitignore`).

## 8. Lộ trình gợi ý
| Phase | Nội dung | Ai |
|-------|----------|----|
| 0 | Nền tảng, seed, placeholder | M1 |
| 1 | UC lõi theo file riêng, test bằng seed data | M2, M3, M4 (M1 làm UC20–22) |
| 2 | Tích hợp chéo: trả xe ↔ chỗ đỗ, sạc ↔ sự cố, quá tải ↔ điều phối | cả nhóm |
| 3 | UC phụ, báo cáo, làm đẹp, chạy thử kịch bản demo | cả nhóm |

## 9. Kịch bản demo (cả nhóm phải chạy được từ đầu đến cuối)
1. (M1) Đăng nhập sinh viên A.
2. (M2) Tìm Hub → xem xe → đặt xe → nhận xe → trả xe ở Hub khác.
3. (M2/M3) Để một đặt xe hết hạn → xe tự về AVAILABLE; đặt chỗ đỗ và để hết hạn.
4. (M3) Sinh viên xe cá nhân tìm Hub → đặt chỗ đỗ → đăng ký lịch sạc → theo dõi tiến độ sạc.
5. (M1) Bấm "Metro surge" → (M4) Hub metro quá tải → cảnh báo → khuyến nghị → lệnh điều phối → duyệt → thực hiện.
6. (M3/M4) Tắt một cổng sạc → ticket sự cố → xếp lại lịch sạc.
7. (M4) Chạy What-if → xem kết quả → áp dụng khuyến nghị.
8. (M1) Xem báo cáo, admin thêm cổng sạc cho Hub.

## 10. Definition of Done cho mỗi UC
- Có màn hình, thao tác chạy được với seed data, hiện đúng trạng thái theo enum.
- Xử lý ít nhất 1 luồng thay thế/lỗi trong đặc tả (ví dụ: hết xe, Hub đầy, hết hạn).
- Không có lỗi TypeScript (`npm run build` qua) và không còn `console.error`.
