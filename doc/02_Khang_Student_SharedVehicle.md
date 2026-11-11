# M2 – Sinh viên: xe dùng chung

**UC phụ trách:** UC01 (tìm Hub/phương tiện), UC02 (xem trạng thái xe), UC03 (đặt xe), UC04 (nhận xe), UC06 (trả xe)
**NIFR:** NIFR-01 phần đặt xe (hết hạn tự động)
**Nhánh:** `m2-shared-vehicle`
**Thư mục:** `src/pages/student/shared/`, `src/services/vehicleService.ts`, `src/services/reservationService.ts`, `src/store/vehicleSlice.ts`

## A. Dữ liệu & service (theo class diagram)
Store (`vehicleSlice`): `vehicleReservations: VehicleReservation[]`, `trips: Trip[]`.

```ts
VehicleService.searchHubsAndVehicles(c: SearchCriteria): Hub[]   // UC01
VehicleService.getVehicleStatus(vehicleId): Vehicle              // UC02
ReservationService.reserveVehicle(studentId, vehicleId): VehicleReservation   // UC03
ReservationService.unlockVehicle(reservationId): Trip            // UC04
ReservationService.returnVehicle(tripId, hubId): Trip            // UC06
ReservationService.expireReservations(): number                  // NIFR-01
```

## B. Use case
### UC01 – Tìm Hub/phương tiện
- Form lọc: Hub, loại xe (`VehicleType`), pin tối thiểu, vị trí gần (chọn từ danh sách vị trí Hub).
- Kết quả: danh sách Hub kèm số xe phù hợp; bấm vào xem danh sách xe.
- Luồng thay thế: không có kết quả → gợi ý nới tiêu chí / Hub gần nhất.

### UC02 – Xem trạng thái phương tiện
- Chi tiết xe: loại, pin (thanh tiến độ), `VehicleStatus` (badge màu), Hub hiện tại.
- Tự làm mới khi store đổi (IoT simulator của M1 cập nhật pin).
- Nút "Đặt xe" chỉ bật khi `isAvailable()` (AVAILABLE và pin đủ).

### UC03 – Đặt xe
- Chọn xe → xác nhận → xe `RESERVED`, tạo `VehicleReservation` ACTIVE với `expiresAt`, **đồng hồ đếm ngược** (component `Countdown` của M1).
- Chặn: sinh viên đã có đặt xe/chuyến đang chạy; xe vừa bị người khác đặt (xung đột, hiện lỗi thân thiện).
- Hủy đặt: reservation CANCELLED, xe về AVAILABLE.

### NIFR-01 – Hết hạn đặt xe
- `registerTickHandler("expireVehicleReservations", ...)`: reservation quá `expiresAt` → EXPIRED, xe về AVAILABLE, `notify` sinh viên.
- Thời hạn lấy từ hằng số cấu hình (demo: 30–60 giây).

### UC04 – Nhận phương tiện
- Từ reservation ACTIVE còn hạn → nút "Mở khóa" → reservation CONFIRMED, xe `IN_USE`, tạo `Trip` ONGOING (`start()`), xe `unlock()`.
- Luồng lỗi: reservation hết hạn / xe bị FAULTY → báo lỗi, đề xuất xe khác cùng Hub.

### UC06 – Trả phương tiện
- Chọn Hub trả xe → gọi `ParkingService.hasFreeSlot(hubId)` (M3). Hub đầy → báo lỗi và gợi ý Hub khác còn chỗ.
- Thành công: `Trip.end(returnHubId)` → COMPLETED, xe về AVAILABLE tại Hub mới (`currentHubId` đổi), `ParkingService.occupySlot(hubId)`; hiển thị thời lượng, tóm tắt chuyến.
- Sau khi trả: nút "Đăng ký sạc" → điều hướng sang UC05 của M3 (`ChargingService.submitChargingRequest`).
- Trả xe pin thấp (< ngưỡng) → gợi ý đăng ký sạc.

## C. Điều phối giữa các bước (luồng người dùng)
`Tìm Hub → Chọn xe → Xem trạng thái → Đặt → (đếm ngược) → Nhận → Đang đi → Trả → (tùy chọn) Đăng ký sạc`
Làm trang "Chuyến của tôi" gom reservation hiện tại và trip đang chạy.

## D. Phụ thuộc
- Cần từ M1: seed xe/Hub, store core, `Countdown`, `notify`, `registerTickHandler`.
- Cần từ M3: `ParkingService.hasFreeSlot / occupySlot` (nếu M3 chưa xong, dùng stub tạm trả `true`, rồi thay).
- Cung cấp cho M3, M4: `VehicleService.getVehicleStatus`.

## E. Tiêu chí hoàn thành
- Chạy trọn luồng đặt → nhận → trả không lỗi, trạng thái xe và Hub luôn nhất quán trên mọi trang.
- Hết hạn đặt xe tự xảy ra trong lúc demo.
- UC01–UC04, UC06 đạt Definition of Done ở README chung.
