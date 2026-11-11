# M4 – Vận hành & Mô phỏng

**UC phụ trách:** UC11 (giám sát mạng lưới Hub), UC13 (điều phối phương tiện), UC14 (xử lý sự cố), UC15 (xử lý Hub quá tải), UC16 (What-if Simulation), UC18 (xem kết quả mô phỏng & áp dụng khuyến nghị)
**NIFR:** NIFR-03 (tự phát hiện quá tải), NIFR-04 (tự phát hiện sự cố)
**Nhánh:** `m4-ops-sim`
**Thư mục:** `src/pages/operator/`, `src/pages/simulation/`, `src/services/operationsService.ts`, `src/services/simulationService.ts`, `src/engine/overloadHandler.ts`, `src/store/opsSlice.ts`

## A. Dữ liệu & service
Store (`opsSlice`): `alerts`, `dispatchOrders`, `tickets`, `scenarios`, `simulationRuns`, `simulationResults`.

```ts
OperationsService.getNetworkOverview(): NetworkSnapshot            // UC11
OperationsService.monitorHub(hubId): Hub
OperationsService.manageChargingSchedule(hubId)                    // wrapper sang scheduler của M3
OperationsService.createDispatchOrder(fromHub, toHub, vehicleIds)  // UC13
OperationsService.handleIncident(t: IncidentTicket)                // UC14
OperationsService.handleOverload(hubId): Recommendation[]          // UC15
OperationsService.raiseAlert(hubId, type, severity): Alert

OverloadHandler.detectOverload(hub) / proposeActions(hub) / applyAction(a)

SimulationService.createScenario / runScenario / getRunStatus / getResult   // UC16, UC18
```

## B. Use case
### UC11 – Giám sát mạng lưới Hub
- Dashboard: thẻ cho từng Hub (utilization %, slot trống, cổng trống/lỗi, số xe), bản đồ đơn giản (lưới/sơ đồ, không cần bản đồ thật), số xe/cổng lỗi toàn mạng, danh sách cảnh báo gần nhất.
- Màu theo ngưỡng (xanh/vàng/đỏ). Bấm vào Hub xem chi tiết (`monitorHub`).
- Cảnh báo có `acknowledge(operatorId)` và `resolve()`.

### UC13 – Điều phối phương tiện
- Chọn Hub nguồn, Hub đích, danh sách xe (chỉ xe AVAILABLE đủ pin) → `DispatchOrder` PROPOSED.
- Vòng đời: `approve` (APPROVED) → `execute` (IN_PROGRESS, xe chuyển trạng thái, M2 không cho đặt) → `complete` (DONE, `currentHubId` đổi) hoặc `cancel`.
- Chặn: Hub đích không đủ chỗ; xe đang RESERVED/IN_USE.

### UC14 – Xử lý sự cố (Operational + Technical staff)
- Tạo ticket `VEHICLE_FAULT` / `PORT_FAULT` thủ công hoặc tự động (NIFR-04).
- Luồng: OPEN → ASSIGNED (`assign(operatorId)`) → IN_PROGRESS → CLOSED (`close(resolution)`).
- Khi ticket mở: xe → FAULTY / cổng → FAULTY; khi đóng: trở về AVAILABLE/FREE.
- Cổng lỗi: gọi `ChargingScheduler.rescheduleOnConflict` của M3 cho các phiên bị ảnh hưởng.

### NIFR-04 – Tự phát hiện sự cố
- Tick handler quét: xe/cổng có trạng thái FAULTY mà chưa có ticket → tạo ticket + `raiseAlert` WARNING/CRITICAL.

### UC15 + NIFR-03 – Xử lý Hub quá tải
- `OverloadHandler` có `threshold` (ví dụ 0.85). Tick handler: `getHubUtilization(hub) > threshold` → `raiseAlert(CRITICAL)`.
- `proposeActions` sinh danh sách `Recommendation`: REDISTRIBUTE (kèm gợi ý tạo `DispatchOrder` sang Hub vắng), RESCHEDULE (dời lịch sạc), REDIRECT (chuyển hướng sinh viên sang Hub khác).
- Operator chọn phương án → `applyAction` (REDISTRIBUTE tạo luôn lệnh điều phối PROPOSED).

### UC16 – What-if Simulation
- Chọn `ScenarioType` (METRO_SURGE, HUB_FULL, CHARGING_SURGE, PORT_FAILURE, VEHICLE_IMBALANCE) + tham số (Hub ảnh hưởng, mức tăng %, thời lượng).
- `runScenario`: `SimulationRun` CREATED → RUNNING (thanh tiến độ, chạy vài giây bằng `setInterval`) → COMPLETED/FAILED; có nút hủy (CANCELLED).
- **Cách ly dữ liệu (NIFR-08):** lấy snapshot từ `getSimulationInputs()` (M1), tính trên **bản sao**, tuyệt đối không ghi vào store thật.
- Công thức đơn giản, cố định theo từng loại kịch bản (ví dụ METRO_SURGE: nhân lượng khách Hub metro × hệ số, lan 30% sang Hub lân cận) → `predictedUtilization`, `overloadedHubs`.

### UC18 – Xem kết quả mô phỏng và áp dụng khuyến nghị
- Hiển thị `predictedUtilization` dạng biểu đồ cột so với hiện tại (Recharts), danh sách Hub quá tải, `Recommendation` kèm nút "Áp dụng" (Operator; Ban quản lý chỉ xem).
- "Áp dụng" gọi `OverloadHandler.applyAction` → tạo điều phối/dời lịch thật.

## C. Phụ thuộc
- Cần từ M1: `getHubUtilization`, `getSimulationInputs`, `notify`, `registerTickHandler`, UI, Metro surge.
- Cần từ M3: `ChargingScheduler.rescheduleOnConflict`, các action đổi trạng thái cổng.
- Cần từ M2: `VehicleService.getVehicleStatus` (kiểm tra xe điều phối được).
- Cung cấp cho M1, M3: `raiseAlert`, `handleIncident` (**làm sớm**).

## D. Tiêu chí hoàn thành
- "Metro surge" → quá tải → cảnh báo → khuyến nghị → lệnh điều phối được duyệt → số liệu Hub đổi đúng.
- What-if chạy không làm thay đổi dữ liệu thật.
- UC11, UC13–UC16, UC18 đạt Definition of Done ở README chung.
