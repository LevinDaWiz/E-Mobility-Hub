# M2 — TEST CASES & BIÊN BẢN KIỂM THỬ
**Dự án:** Smart E-Mobility Hub (frontend React + TypeScript + Zustand)  
**Module:** M2 — Sinh viên / Xe dùng chung  
**Nhánh:** `m2-shared-vehicle`  
**Phạm vi:** UC01, UC02, UC03, UC04, UC06, NIFR-01 và trang Activity  
**Phương pháp:** Kiểm thử thủ công trên trình duyệt bằng dữ liệu `seed.ts` và đồng hồ mô phỏng; kiểm tra giao diện, Zustand state biểu hiện trên các trang, thông báo và build.  
**Ngày kiểm thử:** 20–21/11/2026 (theo ảnh và log được cung cấp)

> **Quy ước kết quả:** `PASS` = hành vi chính đã quan sát đạt; `PASS (UI)` = mới xác minh qua giao diện, chưa kiểm thử trực tiếp lời gọi Service; `PARTIAL` = thiếu bằng chứng cho một điều kiện; `NOT RUN` = chưa thử. Ảnh chụp là bằng chứng quan sát, không thay thế unit test hay kiểm tra dữ liệu bên trong Store. Các trạng thái ghi nhận dưới đây dựa trên các lượt thử đã thực hiện trong cuộc trao đổi; không khẳng định là bộ kiểm thử tự động.

## 1. Kết quả tổng quan

| Nhóm | Test case | Kết quả ghi nhận |
|---|---|---|
| UC01 — Tìm Hub/phương tiện | TC01–TC03 | 3 PASS |
| UC02 — Xem trạng thái xe | TC04–TC05 | 2 PASS |
| UC03 — Đặt/hủy xe | TC06–TC09 | 4 PASS (TC08 xác minh thông báo, AVAILABLE; ảnh Activity CANCELLED chưa được cung cấp) |
| UC04 — Nhận xe | TC10–TC12 | 3 PASS |
| UC06 — Trả xe | TC13–TC16 | TC13–TC14 PASS; TC15–TC16 PASS (UI), cần test trực tiếp Service |
| NIFR-01 — Tự động hết hạn | TC17–TC19 | 3 PASS |
| Tích hợp/chất lượng | TC20–TC23 | 4 PASS theo các kiểm tra được thực hiện |

**Tổng:** 23/23 kịch bản đã được chạy và chấp nhận ở mức kiểm thử thủ công/giao diện; **không có nghĩa mọi nhánh lỗi ở cấp Service đã được xác nhận**.

## 2. Môi trường & cách chuẩn bị

- Chạy tại `http://localhost:5173/`, dùng `npm.cmd run dev` (Windows PowerShell).
- Tài khoản sinh viên mẫu: `2112345` (Nguyễn Văn An). Có thể dùng xe AVAILABLE bất kỳ, ví dụ `VH-001`.
- Các trang M2: `/app/shared`, `/app/trips`, `/app/activity`.
- `seed.ts` ở thời điểm kiểm thử ban đầu có 28 xe: 16 xe đạp điện, 12 xe máy điện (bao gồm xe AVAILABLE, IN_USE, CHARGING, FAULTY).
- Dùng nút **Reset** (Demo Panel) để đưa state về seed khi cần chạy test độc lập; **không Reset** giữa các bước liên tiếp của cùng một test.
- Mở DevTools → Console để xem lỗi; đồng hồ NIFR chạy theo **thời gian mô phỏng**, không đồng nhất thời gian thực.
- Ảnh test có thể lưu trong `doc/test-evidence/m2/` hoặc thư mục tài liệu mà nhóm thống nhất. Tên file đề xuất là `TC01.png`, `TC02-a.png`...; bảng bên dưới không khẳng định các ảnh đó đã tồn tại trong repository.

## 3. UC01 — Tìm Hub/phương tiện (`/app/shared`)

| ID | Mục đích kiểm tra | Các bước chính | Kết quả mong đợi | Ghi nhận |
|---|---|---|---|---|
| **TC01** | Danh sách xe ban đầu không mất bản ghi | Reset, mở `/app/shared`, để bộ lọc mặc định | Hiển thị 28 xe (kể cả xe không AVAILABLE) | **PASS** — 28 xe |
| **TC02** | Bộ lọc `VehicleType` hoạt động | Chọn Xe đạp điện, rồi Xe máy điện | Mỗi lần chỉ còn đúng loại: 16 xe đạp điện / 12 xe máy điện | **PASS** |
| **TC03** | Bộ lọc kết hợp, tìm vị trí và trạng thái không có kết quả | Chọn KTX Khu A + xe đạp + pin ≥85%; thử từ khóa `Metro`; thử pin ≥100% tại KTX Khu A | Trả đúng xe phù hợp (VH-007 pin 92% ở trường hợp 85%); từ khóa `Metro` chỉ hiện Hub Metro; trường hợp không phù hợp hiện 0 kết quả và thông báo rõ | **PASS** |

> TC03 kiểm tra nhiều tập điều kiện; số lượng kết quả từ khóa `Metro` phụ thuộc loại xe đang chọn (ở lượt thử xe đạp điện: 4 xe).

## 4. UC02 — Xem trạng thái phương tiện (`/app/shared`)

| ID | Mục đích kiểm tra | Các bước chính | Kết quả mong đợi | Ghi nhận |
|---|---|---|---|---|
| **TC04** | Chi tiết xe khả dụng hiển thị đúng và cho đặt | Chọn `VH-001` → **Xem chi tiết** | E_BIKE, pin 85%, Hub Metro, AVAILABLE, nút Đặt xe khả dụng | **PASS** |
| **TC05** | Chặn đặt xe không khả dụng theo enum | Xem `VH-006` (IN_USE), `VH-011` (CHARGING), `VH-027` (FAULTY) | Hiện đúng trạng thái, vô hiệu hóa thao tác Đặt xe | **PASS** |

## 5. UC03 — Đặt xe và hủy đặt (`/app/shared`)

| ID | Mục đích kiểm tra | Các bước chính | Kết quả mong đợi | Ghi nhận |
|---|---|---|---|---|
| **TC06** | Luồng đặt xe thành công | Reset nếu cần; chọn `VH-001` AVAILABLE → Xem chi tiết → Đặt xe → Xác nhận | Tạo reservation ACTIVE có `expiresAt`; xe RESERVED; xuất hiện đếm ngược và thông báo đặt thành công | **PASS** — đã thấy mã đặt, đếm ngược và thông báo |
| **TC07** | Chặn sinh viên đặt trùng | Trong khi giữ `VH-001`, mở `VH-002` → thử đặt | Không tạo ACTIVE thứ hai; nút đặt bị khóa/thông báo đang có lượt đặt | **PASS** |
| **TC08** | Hủy đặt trả xe lại khả dụng | Đặt `VH-001`; nhấn Hủy khi vẫn còn thời gian | Reservation CANCELLED; xe AVAILABLE; thông báo hủy thành công | **PASS** phần hành vi chính; **chưa có ảnh xác nhận CANCELLED trong Activity** |
| **TC09** | Không đặt xe không khả dụng | Mở xe IN_USE/CHARGING hoặc FAULTY | Nút đặt không dùng được, không tạo reservation | **PASS** (ảnh xe IN_USE) |

## 6. UC04 — Nhận xe / mở khóa (`/app/trips`)

| ID | Mục đích kiểm tra | Các bước chính | Kết quả mong đợi | Ghi nhận |
|---|---|---|---|---|
| **TC10** | Nhận xe hợp lệ trước hạn | Đặt `VH-001` → `/app/trips` → **Mở khóa / Nhận xe** | Reservation CONFIRMED; xe IN_USE; Trip ONGOING; thông báo nhận thành công | **PASS** |
| **TC11** | Chặn đặt thêm khi đang có chuyến | Sau TC10, về `/app/shared` → mở `VH-002` | Không thể đặt thêm khi Trip còn ONGOING | **PASS** |
| **TC12** | Không nhận xe sau khi hết hạn | Đặt xe → chờ hết 30 giây mô phỏng, không hủy/nhận → `/app/trips` và `/app/activity` | Reservation EXPIRED; không còn nút Mở khóa; không tạo Trip mới | **PASS** — màn trips không có lượt đang chờ nhận, Activity EXPIRED |

## 7. UC06 — Trả phương tiện (`/app/trips`)

| ID | Mục đích kiểm tra | Các bước chính | Kết quả mong đợi | Ghi nhận |
|---|---|---|---|---|
| **TC13** | Trả xe thành công tại Hub khác | Đặt/nhận `VH-001` ở Metro → chọn KTX Khu A còn chỗ → trả | Trip COMPLETED, có endTime và thời lượng; xe AVAILABLE tại Hub KTX Khu A; thông báo trả thành công | **PASS**; ảnh tóm tắt và lịch sử chuyến |
| **TC14** | Đồng bộ các màn hình sau trả | Không reset; mở chi tiết VH-001 ở `/app/shared`, mở `/app/trips` và `/app/activity` | AVAILABLE tại KTX Khu A; lịch sử COMPLETED; không còn Trip ONGOING cho chuyến vừa trả | **PASS**; trạng thái/hub/lịch sử đã quan sát |
| **TC15** | Ngăn trả xe khi Hub đầy | Với Trip đang chạy, mở dropdown Hub trả; thử Ga Metro Làng Đại học có 0 chỗ | Hub đầy bị khóa; chưa trả được; Trip vẫn ONGOING | **PASS (UI)**; **chưa thử gọi thẳng Service với hubId đầy** |
| **TC16** | Ngăn trả cùng Trip lần hai và không chiếm thêm slot | Trả VH-008 ở KTX Khu A, kiểm tra trang sau trả và HubCard | Trip COMPLETED, không còn nút trả xe; số chỗ trống giảm một lần (3 → 2) | **PASS (UI)**; **chưa thử gọi thẳng `returnVehicle` lần hai** |

> **Phụ thuộc còn cần kiểm tra khi tích hợp M3:** UC06 trong đặc tả yêu cầu dùng `ParkingService.hasFreeSlot()` và `occupySlot()`; bản triển khai M2 từng sử dụng `parkingSlots` trực tiếp. Cần đối chiếu code sau merge mới nhất để bảo đảm không làm lệch số chỗ đỗ giữa các module, kể cả việc giải phóng chỗ ở Hub nhận xe nếu nghiệp vụ yêu cầu.

## 8. NIFR-01 — Tự động hết hạn đặt xe

| ID | Mục đích kiểm tra | Các bước chính | Kết quả mong đợi | Ghi nhận |
|---|---|---|---|---|
| **TC17** | Tự EXPIRED mà không cần nhấn nút | Đặt VH-005 → không nhận/hủy → chờ hết thời hạn mô phỏng | Reservation EXPIRED, xe AVAILABLE, có thông báo cảnh báo | **PASS** |
| **TC18** | Xe hết hạn có thể được đặt lại | Sau TC17, đặt lại VH-005 | Có reservation ACTIVE mới với ID khác lượt EXPIRED | **PASS** |
| **TC19** | Không EXPIRED nhầm xe đã nhận | Đặt lại VH-005 → nhận trước hạn → chờ qua `expiresAt` ban đầu | Reservation CONFIRMED, xe IN_USE, Trip ONGOING | **PASS** — ảnh Trips ghi thời gian chuyến đã vượt thời hạn |

## 9. Tích hợp, thông báo, responsive và build

| ID | Mục đích kiểm tra | Các bước chính | Kết quả mong đợi | Ghi nhận |
|---|---|---|---|---|
| **TC20** | State thống nhất khi chuyển trang | Khi VH-005 đang IN_USE, chuyển qua lại `/app/shared`, `/app/trips`, `/app/activity` | Shared: IN_USE; Trips: ONGOING; Activity: reservation CONFIRMED, lịch sử phù hợp; không mất dữ liệu do điều hướng | **PASS** theo ảnh |
| **TC21** | Chuông thông báo cho mọi luồng | Mở thông báo sau các lần đặt, hủy, nhận, trả, hết hạn | Có thông báo từng hành động, mức success/warning phù hợp, không tự lặp cho cùng thao tác | **PASS** |
| **TC22** | Responsive | Thử 375px, 768px, 1024px; mở các màn hình và modal | Không tràn ngang, card/form/modal sử dụng được; popover đóng được | **PASS** theo kiểm tra thủ công |
| **TC23** | Build và Console | `npm.cmd run build`; `npm.cmd run dev`; mở DevTools/Console, thao tác và điều hướng | TypeScript + Vite build không lỗi; không còn `console.error` | **PASS** — `vite v8.3.7`, build 115 modules / 593 ms; Console sạch sau reload. Trước đó từng thấy cảnh báo kết nối Vite HMR WebSocket, không tái hiện ở ảnh cuối |

## 10. Evidence — Gợi ý sắp xếp ảnh chụp

Không bắt buộc phải commit tất cả ảnh nếu repository có quy định giới hạn dung lượng. Nếu cần bằng chứng cho giảng viên/M1, dùng cấu trúc sau, đặt đúng tên khi lưu ảnh:

```text
doc/
  test-evidence/
    m2/
      UC01/
        TC01-all-28-vehicles.png
        TC02-ebike.png
        TC02-emotorbike.png
        TC03-combined-filter.png
        TC03-location-metro.png
        TC03-empty-result.png
      UC02/
        TC04-available-detail.png
        TC05-unavailable-detail.png
      UC03/
        TC06-reservation-success.png
        TC07-duplicate-blocked.png
        TC08-cancel-success.png
        TC09-in-use-blocked.png
      UC04/
        TC10-unlock-ongoing.png
        TC11-second-reservation-blocked.png
        TC12-expired-no-unlock.png
      UC06/
        TC13-return-completed.png
        TC14-vehicle-new-hub.png
        TC15-full-hub-disabled.png
        TC16-return-once.png
      NIFR01/
        TC17-auto-expired.png
        TC18-rebook.png
        TC19-trip-remains-ongoing.png
      Integration/
        TC20-state-sync.png
        TC21-notifications.png
        TC22-responsive-375.png
        TC22-responsive-768.png
        TC22-responsive-1024.png
        TC23-build.png
        TC23-console.png
```

**Nếu muốn đưa ảnh vào PR:** chỉ thêm các ảnh thực sự tồn tại, ưu tiên bộ ảnh tiêu biểu cho mỗi nhóm. Ảnh minh họa toàn bộ thao tác có thể để trong drive chung của nhóm nếu repo yêu cầu gọn nhẹ.

## 11. Những việc cần lưu ý trước khi PR

- [x] Đã chạy luồng tìm → đặt → nhận → trả, xem lịch sử và thông báo.
- [x] Đã chạy hết hạn tự động và đặt lại xe hết hạn.
- [x] Đã chạy `npm.cmd run build` thành công sau triển khai; sau merge `origin/main`, người thực hiện xác nhận đã kiểm tra lại.
- [x] Đã kiểm tra Console sau khi reload, không còn lỗi đỏ trong ảnh cuối.
- [ ] Cần đối chiếu API `ParkingService` của M3 sau tích hợp; tránh tự khẳng định đã dùng đúng Service khi chưa đọc code hiện tại.
- [ ] Nên bổ sung test Service trực tiếp cho TC15 (Hub đầy) và TC16 (trả trùng).
- [ ] Nếu cần chứng cứ đầy đủ TC08, chụp thêm trạng thái CANCELLED trong Activity.
- [ ] Xóa những dòng placeholder còn ghi NIFR-01 “sẽ tích hợp sau” nếu vẫn tồn tại ở UI.

## 12. Gợi ý mô tả Pull Request

**Title:** `feat(m2): implement shared vehicle UC01–UC04, UC06 and NIFR-01`

**Summary:** Hoàn thiện tìm/xem xe, đặt/hủy xe, nhận xe, trả xe, tự động hết hạn và lịch sử hoạt động; tích hợp Zustand Store/notification; kiểm thử thủ công 23 kịch bản. Các phần test Service trực tiếp cho Hub đầy và trả trùng cần bổ sung khi tích hợp chính thức với M3.

**Các file M2 đã thay đổi:**
- `src/pages/student/shared/SharedVehiclesPage.tsx`
- `src/pages/student/shared/TripsPage.tsx`
- `src/pages/student/shared/ActivityPage.tsx`
- `src/pages/student/shared/module.tsx`
- `src/services/vehicleService.ts`
- `src/services/reservationService.ts`
- `src/store/vehicleSlice.ts`
