# M3 – Sinh viên xe cá nhân, Chỗ đỗ & Sạc, Quản lý lịch sạc

**UC phụ trách:** UC05 (đăng ký nhu cầu sạc), UC07 (tìm Hub có chỗ đỗ/cổng sạc), UC08 (đặt chỗ đỗ), UC09 (đăng ký lịch sạc), UC10 (theo dõi trạng thái sạc), UC12 (quản lý lịch sạc – Operator)
**NIFR:** NIFR-01 phần đặt chỗ đỗ, NIFR-05 (ưu tiên sạc), NIFR-06 (xếp lại lịch sạc)
**Nhánh:** `m3-parking-charging`
**Thư mục:** `src/pages/student/personal/`, `src/pages/operator/charging/`, `src/services/parkingService.ts`, `src/services/chargingService.ts`, `src/engine/chargingScheduler.ts`, `src/store/parkingChargingSlice.ts`

## A. Dữ liệu & service
Store: `parkingReservations`, `chargingRequests`, `chargingSessions`. Slot và port nằm ở `coreSlice` (M1); M3 đổi trạng thái qua action.

```ts
ParkingService.findHubsWithCapacity(c: SearchCriteria): Hub[]          // UC07
ParkingService.reserveParking(studentId, hubId): ParkingReservation    // UC08
ParkingService.cancelParkingReservation(reservationId): void
ParkingService.hasFreeSlot(hubId) / occupySlot(hubId) / releaseSlot(hubId)   // M2 gọi

ChargingService.submitChargingRequest(r: ChargingRequest): ChargingRequest   // UC05
ChargingService.scheduleCharging(requestId): ChargingSession                 // UC09
ChargingService.trackSession(sessionId): ChargingSession                     // UC10
ChargingService.updateSessionProgress(sessionId, battery): void

ChargingScheduler.calculatePriority(r): number                         // NIFR-05
ChargingScheduler.buildSchedule(requests, ports): ChargingSession[]
ChargingScheduler.rescheduleOnConflict(sessionId): ChargingSession     // NIFR-06
ChargingScheduler.applySchedule(plan): void
```

## B. Use case
### UC07 – Tìm Hub có chỗ đỗ/cổng sạc
- Lọc theo vị trí, loại Hub, cần cổng sạc; hiển thị số slot trống, cổng trống, `getHubUtilization` (thanh %).
- Từ kết quả: nút "Đặt chỗ đỗ" (UC08) và "Đăng ký lịch sạc" (UC09).

### UC08 – Đặt chỗ đỗ
- Chọn Hub → slot FREE → RESERVED, tạo `ParkingReservation` có `expiresAt` + đếm ngược.
- Hub đầy → báo lỗi, gợi ý Hub khác. Hủy đặt → slot về FREE.
- NIFR-01: tick handler hết hạn → slot FREE, `notify`.

### UC05 – Đăng ký nhu cầu sạc (cả xe dùng chung và xe cá nhân)
- Form: xe, pin mục tiêu, giờ mong muốn bắt đầu, deadline.
- `calculatePriority` (NIFR-05): ví dụ ưu tiên cao hơn khi pin thấp, deadline gần, xe dùng chung cần sạc để cho thuê. Ghi rõ công thức trong code comment để giải thích khi demo.
- Kiểm tra xung đột tài nguyên; yêu cầu `PENDING → SCHEDULED` hoặc `REJECTED`.

### UC09 – Đăng ký lịch sạc
- Chọn Hub + khung giờ → `ChargingScheduler.buildSchedule` gán cổng sạc phù hợp (`PortStatus.FREE`, công suất), tạo `ChargingSession` SCHEDULED, cổng RESERVED.
- Xung đột/không còn cổng → đề xuất khung giờ khác hoặc Hub khác.

### UC10 – Theo dõi trạng thái sạc
- Thanh tiến độ pin, thời gian dự kiến xong (`getEstimatedFinish`), trạng thái phiên.
- Engine tick (đăng ký qua `registerTickHandler`): phiên SCHEDULED đến giờ → CHARGING, pin tăng theo `powerKw`; đủ pin mục tiêu → COMPLETED, cổng FREE, `notify`.
- Phiên bị gián đoạn (cổng lỗi) → INTERRUPTED + thông báo, tự gọi `rescheduleOnConflict` (NIFR-06).

### UC12 – Quản lý lịch sạc (Operator)
- Màn hình Operator: bảng các phiên sạc theo Hub/cổng (dạng bảng thời gian hoặc danh sách), lọc theo Hub.
- Thao tác: đổi priority, dời phiên, hủy, chạy lại `buildSchedule` cho cả Hub; xem cổng lỗi.
- `OperationsService.manageChargingSchedule(hubId)` do M4 giữ, gọi vào scheduler của bạn → thống nhất với M4: M3 làm trang UC12, M4 chỉ cung cấp wrapper.

## C. Điều phối
- Khi cổng bị đánh FAULTY (từ M1 simulator hoặc M4 ticket): phiên đang dùng cổng đó → INTERRUPTED → `rescheduleOnConflict` tìm cổng khác cùng Hub, nếu không có thì Hub khác (REDIRECT), `notify` sinh viên.

## D. Phụ thuộc
- Cần từ M1: seed slot/port, `getHubUtilization`, `notify`, `registerTickHandler`, UI component.
- Cần từ M4: `OperationsService.raiseAlert` khi Hub đầy/quá tải sạc.
- Cung cấp cho M2: `ParkingService.hasFreeSlot / occupySlot`, `ChargingService.submitChargingRequest` (**làm sớm, M2 đang chờ**).
- Cung cấp cho M4: `ChargingScheduler.rescheduleOnConflict`.

## E. Tiêu chí hoàn thành
- Đặt chỗ đỗ, hết hạn, đăng ký sạc, theo dõi sạc chạy trọn vẹn với tick tăng tốc.
- Hai yêu cầu cạnh tranh một cổng được xử lý đúng theo priority.
- UC05, UC07–UC10, UC12 đạt Definition of Done ở README chung.
