# UC11 + UC19 – Giám sát Hub & cấu hình Hub / chỗ đỗ / cổng sạc

**Người phụ trách:** M1 (UC11 chuyển từ M4 sang M1) · **Thư mục:** `src/pages/admin/` (`overview/`, `hubs/`), `src/services/hubConfigService.ts`, `src/utils/hubStatus.ts`
**Nguồn thiết kế:** 10 mockup Miro mục "Hub & chỗ đỗ" (danh sách, chi tiết 4 tab, form thêm, lỗi kiểm tra, bị chặn, 409).

## 1. Màn hình ↔ mockup ↔ file

| Mockup | Đường dẫn | File | UC |
|---|---|---|---|
| Danh sách Hub (tìm, lọc trạng thái/khu vực, 4 KPI, bảng, phân trang) | `/admin/hubs` | `hubs/HubListPage.tsx` | UC11 |
| Chi tiết Hub – khung, 4 tab | `/admin/hubs/:hubId` | `hubs/HubDetailLayout.tsx` | UC11 |
| Tab Tổng quan (KPI, thông tin, tài nguyên, thẻ cảnh báo) | `/admin/hubs/:hubId` | `hubs/HubOverviewTab.tsx` | UC11 |
| Tab Chỗ đỗ (lọc, tìm, bảng, Chỉnh sửa / Đặt bảo trì / Bật lại) | `.../slots` | `hubs/HubSlotsTab.tsx` | UC11 + UC19 |
| Tab Cổng sạc | `.../ports` | `hubs/HubPortsTab.tsx` | UC11 + UC19 |
| Tab Cấu hình (thông tin + 4 ngưỡng, bật/tắt, v12, 409) | `.../config` | `hubs/HubConfigTab.tsx` | UC19 |
| Thêm Mobility Hub | modal | `hubs/AddHubModal.tsx` | UC19 |
| Thêm chỗ đỗ / cổng sạc, sửa, lỗi kiểm tra đỏ | modal | `hubs/ResourceModals.tsx` | UC19 |
| "Không thể vô hiệu hóa / xóa tài nguyên" (nhiều lý do) | modal | `hubs/BlockedModal.tsx` | UC19 |
| Xóa Hub / chỗ đỗ / cổng sạc: cảnh báo (bước 1) → nhập lại mã (bước 2) | modal | `components/ui/ConfirmDeleteModal.tsx` | UC19 |
| Nhập từ tệp (CSV/JSON) | modal | `hubs/ImportModal.tsx` | UC19 |
| Tổng quan site quản trị | `/admin` | `overview/OverviewPage.tsx` | UC11 |

**Phân quyền:** Admin thấy mọi nút sửa/thêm; Operator chỉ xem (ẩn nút, tab Cấu hình bị khoá); Management không có mục này.

## 2. Mô hình dữ liệu (đã đổi so với Phase 0)
- `Hub`: thêm `area`, `operationalStatus` (AVAILABLE / MAINTENANCE / UNAVAILABLE), `thresholds` {overload, parkingWarning, minAvailableVehicles, chargingOverload}, `version`, `updatedBy`, `updatedAt`.
- `ParkingSlot`: thêm `kind` (SHARED / PERSONAL), `vehicleId` (xe dùng chung đang đỗ), `sensorId`, `updatedAt`; `SlotStatus.MAINTENANCE`.
- `ChargingPort`: thêm `kind` (FAST / STANDARD), `dockId`, `updatedAt`; `PortStatus.MAINTENANCE`.
- `updateParkingSlot` / `updateChargingPort` trong store **tự đóng dấu `updatedAt`** (giờ mô phỏng).
- Trạng thái hiển thị của Hub (Overloaded / At Risk / Available / Maintenance / Unavailable) **suy ra** trong `utils/hubStatus.ts`: bảo trì/không khả dụng ghi đè; còn lại theo mức sử dụng so với ngưỡng riêng của Hub.
- Ngưỡng mặc định: quá tải 90%, cảnh báo chỗ đỗ 85%, quá tải cổng sạc 90%, xe tối thiểu 3 (`DEFAULT_HUB_THRESHOLDS`). Trạm dịch vụ đặt 0 xe tối thiểu.
- **Cài đặt hệ thống** (`/admin/settings`, chỉ Quản trị viên sửa): ngưỡng mặc định cho Hub **mới** và công suất cổng sạc tối đa lấy từ đây (`getSettings()`), hằng số trên chỉ là giá trị khởi tạo. Hub đã có giữ ngưỡng riêng. Xem mục "Cài đặt hệ thống" trong `01_Thien_Core_Integration.md`.
- **Bản đồ trang chủ sinh viên:** Hub seed có vị trí cố định trong `config/mapPositions.ts`; Hub tạo thêm (form hoặc nhập tệp) **tự được xếp vào ô trống** (`resolveHubPins`), không cần khai báo.

## 3. Quy tắc nghiệp vụ đã cài (`services/hubConfigService.ts`)
Mọi hàm ghi trả về `Result`: `validation` (lỗi từng ô) · `blocked` (modal bị chặn) · `conflict` (409).

- **Thêm Hub:** Hub ID bắt buộc, đúng dạng `HUB-XXX-X`, không trùng; tên, vị trí bắt buộc; sức chứa nguyên dương; số chỗ đỗ ban đầu ≤ sức chứa; Hub mới có version 1 và ngưỡng mặc định.
- **Thêm chỗ đỗ:** mã duy nhất trong Hub (`S01` lưu thành `HUB-DORM-01-S01`); số lượng nguyên dương; thêm nhiều ô thì mã phải kết thúc bằng số, mã và sensor tự tăng (`P-081`, `P-082`...); **sức chứa Hub tự nâng** nếu số slot vượt sức chứa.
- **Thêm / sửa cổng sạc:** mã duy nhất; công suất > 0 và ≤ mức tối đa trong Cài đặt (mặc định 22 kW, "vượt định mức lưới điện hạ thế"); Dock ID bắt buộc.
- **Đặt bảo trì bị chặn** khi slot có xe (nêu mã xe) / được đặt trước; cổng đang sạc (nêu xe, như mockup) / có lịch sạc / RESERVED. Cổng FAULTY vẫn được đặt bảo trì. Bật lại đưa về trạng thái trống.
- **Xóa Hub / chỗ đỗ / cổng sạc (chỉ Quản trị viên)** – `getDeleteImpact`, `deleteSlot`, `deletePort`, `deleteHub`. Nút "Xóa" ở từng dòng tab Chỗ đỗ / Cổng sạc; nút "Xóa Hub" ở "Vùng nguy hiểm" cuối tab Cấu hình. Quy trình: (1) nếu còn lý do chặn thì hiện modal "Không thể xóa…" liệt kê **mọi** lý do, không cho đi tiếp; (2) nếu không, popup **cảnh báo** nêu hậu quả và những gì được giữ lại; (3) popup **xác nhận lại** bắt nhập đúng mã (mã chỗ đỗ / cổng, hoặc Hub ID) mới bật nút "Xóa vĩnh viễn"; (4) `deleteX` kiểm tra lại toàn bộ điều kiện và quyền ngay lúc xóa vì dữ liệu có thể đã đổi từ lúc mở popup.
  - **Chặn xóa chỗ đỗ:** có xe đỗ, đang được đặt trước, hoặc có lượt đặt chỗ đỗ còn hiệu lực.
  - **Chặn xóa cổng sạc:** đang sạc, có lịch sạc / đặt trước, hoặc có phiếu sự cố chưa đóng (nêu mã phiếu).
  - **Chặn xóa Hub:** là Hub cuối cùng; còn phương tiện thuộc Hub; còn chỗ đỗ có xe / đặt trước; còn cổng đang sạc / có lịch; còn phiếu sự cố chưa đóng; còn yêu cầu sạc đang chờ / đã xếp lịch (M3); còn lượt đặt chỗ đỗ còn hiệu lực (M3); còn lệnh điều phối chưa xong. Muốn xóa phải điều phối xe đi và đóng phiếu trước.
  - **Xóa Hub kéo theo:** toàn bộ chỗ đỗ và cổng sạc của Hub, cảnh báo và khoá nhận xe của Hub. **Giữ lại** lịch sử (chuyến đi, phiên sạc, phiếu sự cố đã đóng), hiển thị theo mã vì Hub không còn để tra tên. Thông báo cho Quản trị viên và tất cả Vận hành.
  - Xóa chỗ đỗ / cổng không đổi "sức chứa" cấu hình của Hub.
- **Tắt Hub (Unavailable)** bị chặn khi còn cổng đang sạc/có lịch, chỗ đặt trước hoặc xe được đặt trước. Chuyển Maintenance thì được.
- **Cấu hình Hub:** sức chứa ≥ số slot hiện có; ngưỡng 0–100%; ngưỡng cảnh báo ≤ ngưỡng quá tải; số xe tối thiểu ≥ 0. Lưu thành công thì `version + 1`.
- **Khoá lạc quan (409):** form nhớ version lúc mở; lưu khi version đã đổi → banner "409 Conflict", khoá form, nút "Tải lại dữ liệu". Nút **Demo → "Admin khác sửa"** giả lập tình huống này.
- **Nhập từ tệp (CSV / JSON):** cho Hub, chỗ đỗ, cổng sạc; dòng hợp lệ được thêm, dòng lỗi được liệt kê kèm số dòng; ô trống coi như thiếu giá trị.

## 4. Giao diện cho các thành viên khác
- **M4:** `utils/hubStatus.ts` (`getHubDisplayStatus`, `getHubAlerts`, `maxAlertSeverity`) để dùng chung trạng thái/cảnh báo. NIFR-03 nên đọc `hub.thresholds.overload` thay vì hằng số `OVERLOAD_THRESHOLD`. `Alert` bạn tạo bằng `raiseAlert` tự hiện ở thẻ cảnh báo của Hub và bảng Tổng quan.
- **Nhận / trả xe & đặt chỗ (M2, M3):** trước khi cho **trả xe** hoặc **đặt chỗ đỗ trước**, gọi `getHubIntakeBlocker(hubId)` (`utils/hubAvailability.ts`): trả lý do nếu Hub bảo trì / ngưng hoạt động hoặc đang **tạm khóa nhận xe** do quá tải (UC15). Khi **đặt xe đang đỗ** gọi `getHubPickupBlocker(hubId)` (chỉ chặn bảo trì / ngưng hoạt động; Hub quá tải vẫn cho lấy xe vì giúp giảm tải).
- **M2:** khi trả xe gọi `ParkingService.occupySlot(hubId, vehicleId)`; khi nhận xe gọi `releaseSlot(hubId, vehicleId)` để cột "Phương tiện" ở tab Chỗ đỗ hiện đúng xe.
- **M3:** `hasFreeSlot` / `occupySlot` bỏ qua slot `MAINTENANCE` và `RESERVED` (đã làm). Cổng chỉ được đặt bảo trì khi không có phiên SCHEDULED/CHARGING, nên M3 không phải xử lý phiên của cổng bảo trì; khi xếp lịch sạc chỉ chọn cổng `FREE` (bỏ qua `MAINTENANCE`, `FAULTY`).
- Slot / cổng bảo trì **vẫn tính vào sức chứa** nhưng không phải "trống" (`HubStats.freeSlots` chỉ đếm `FREE`; có thêm `maintenanceSlots`, `maintenancePorts`, `chargingUtilization`).

## 4b. Điểm chưa theo sát mockup / giả định
- Mockup có 12 Hub, seed có 6 (thêm Hub qua giao diện hoặc nhập tệp).
- "Chỗ đỗ dự kiến đạt 90% trong 30 phút tới" (dự báo) chưa làm; thẻ cảnh báo hiện cảnh báo thực tế theo ngưỡng.
- Vị trí Hub nhập dạng chữ, chưa kiểm tra ranh giới GeoJSON.
- Thêm trường "Loại Hub" vào form Thêm Hub (cần cho mô hình dữ liệu, mockup không có).
- Chưa có xoá Hub / slot / cổng (mockup chỉ có vô hiệu hóa).

## 5. Việc còn lại
- [x] Link "Xem phương tiện tại Hub này" đã trỏ `/admin/vehicles?hub=<hubId>` và trang Phương tiện lọc sẵn theo Hub.
- [x] Hub tạo thêm hiện trên bản đồ sinh viên (tự xếp vị trí).
- [ ] Tinh chỉnh giao diện theo mockup khi có bản cuối (khoảng cách, màu).
- [ ] Dự báo quá tải (nếu nhóm muốn).

## 6. Tiêu chí hoàn thành
- Danh sách Hub lọc / tìm / phân trang đúng; KPI khớp bảng.
- Metro surge làm Hub Metro chuyển Overloaded + Critical ngay trên danh sách.
- Thêm chỗ đỗ trùng mã và số lượng 0 hiện đúng 2 lỗi đỏ như mockup; bảo trì cổng đang sạc hiện modal bị chặn.
- Mở tab Cấu hình, bấm "Admin khác sửa" ở Demo, bấm Lưu → hiện 409 và khoá form; "Tải lại dữ liệu" mở khoá.
