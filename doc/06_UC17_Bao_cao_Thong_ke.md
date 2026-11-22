# UC17 – Báo cáo & Thống kê

**Người phụ trách:** M1 · **Thư mục:** `src/pages/reports/`, `src/services/reportEngine.ts`, `src/services/reportService.ts`, `src/utils/fileExport.ts`, `src/store/reportSlice.ts`
**Nguồn thiết kế:** 3 mockup Miro: (1) chọn chuyên đề + bộ lọc, (2) kết quả "Chất lượng dịch vụ", (3) xuất báo cáo (định kỳ + 3 trạng thái). **Vai trò:** Operator, Admin và Ban quản lý (cả ba cùng thấy mục menu và nhận thông báo báo cáo định kỳ).

## 1. Luồng người dùng

| Bước | Đường dẫn | File |
|---|---|---|
| 1. Chọn chuyên đề, 2. Bộ lọc, Tạo báo cáo / Báo cáo định kỳ, danh sách đã tạo (tab Tất cả / Định kỳ) | `/admin/reports` | `ReportsHomePage.tsx` |
| Kết quả: KPI, biểu đồ, heatmap, bảng, Xuất dữ liệu | `/admin/reports/result` | `ReportResultPage.tsx` |
| Xuất ngay (Đang tạo → Thành công / Lỗi) + báo cáo định kỳ | `/admin/reports/export` | `ReportExportPage.tsx` |

## 2. Bốn chuyên đề
| Chuyên đề | 4 KPI | Heatmap |
|---|---|---|
| **Chất lượng dịch vụ** (như mockup) | Tổng yêu cầu · Tỷ lệ đáp ứng đặt xe · Tỷ lệ đáp ứng sạc · Chờ TB | Hub × khung giờ (07–09h, 11–13h, 17–19h), 4 mức Low → Very High |
| **Ma trận di chuyển** | Tổng chuyến · Tuyến phổ biến nhất · Chuyến TB/ngày · Hub xuất phát nhiều nhất | Ma trận O–D (hàng: xuất phát, cột: đến) |
| **Điện năng & chu kỳ pin** | kWh · Số phiên sạc · Pin TB khi bắt đầu · Thời gian sạc TB | Điện năng Hub × khung giờ |
| **Hiệu suất chỗ đỗ & cổng sạc** | Lấp đầy chỗ đỗ · Công suất cổng sạc · Chờ TB · Số lần quá tải | Lấp đầy Hub × khung giờ |

Mỗi báo cáo có: biểu đồ theo ngày (cột xanh đậm = cuối tuần, tooltip) / theo giờ; cột theo Hub (2 chỉ số, chuyển tab); bảng "Tổng hợp theo Hub" có dòng tổng.

## 3. Bộ lọc và kiểm tra
- Khoảng thời gian (từ / đến): bắt buộc; từ ≤ đến; không ở tương lai; tối đa 366 ngày. Lỗi hiện dưới ô.
- Hub: All Hubs hoặc một Hub. Phương tiện: All / E-bike / E-motorbike.
- Mặc định 30 ngày gần nhất. "Đặt lại" khôi phục mặc định. Lựa chọn được giữ khi chuyển trang.
- **Dữ liệu không đủ:** chọn mốc cũ hơn 180 ngày (`REPORT_HISTORY_DAYS`) → hiện trạng thái lỗi "Không thể tạo báo cáo".

## 4. Dữ liệu (quan trọng)
**Các ngày trước hôm nay là DỮ LIỆU MẪU** do `reportEngine.ts` sinh xác định (cùng Hub + cùng ngày luôn ra cùng số) theo sức chứa và loại Hub, có nhịp tuần (cuối tuần thấp) và đỉnh theo giờ. Đề cho phép dữ liệu hard-code.

**Ngày hôm nay (giờ mô phỏng) dùng số liệu THẬT** lấy từ store bởi `services/reportLiveData.ts`: lượt đặt xe (không tính lượt tự hủy; "được đáp ứng" = còn giữ hoặc đã nhận xe), chuyến đi theo Hub xuất phát (`trip.fromHubId`), yêu cầu sạc, phiên sạc và điện năng ước tính từ % pin đã sạc, mức lấp đầy chỗ đỗ / cổng sạc hiện tại, số cổng lỗi. Riêng **thời gian chờ** vẫn là số mẫu vì chưa có nguồn thật. Vì hôm nay chưa hết ngày nên số thường nhỏ hơn các ngày mẫu; trang kết quả có dòng ghi chú nói rõ ngày nào là số thật, ngày nào là mẫu (`ReportData.liveDate`). Khoảng thời gian không chứa hôm nay thì 100% là số mẫu. `reportEngine.ts` vẫn là hàm thuần, không tự đọc store: số thật được truyền vào qua `input.live`.

Danh sách Hub lấy từ store nên thêm Hub (UC19) là báo cáo có thêm Hub.

## 5. Xuất file (đều là file thật, đã kiểm tra bằng openpyxl / pdftotext)
| Định dạng | Nội dung | Ghi chú |
|---|---|---|
| **XLSX** | 5 sheet: Tổng quan, Theo ngày, Theo giờ, Theo Hub, Heatmap | Gói OOXML tối thiểu, tự dựng, không cần thư viện |
| **CSV** | Các bảng nối nhau, UTF-8 có BOM | Excel đọc đúng tiếng Việt |
| **PDF** | Chỉ số, bảng tổng hợp, heatmap, dữ liệu theo ngày | Bản văn bản, **không có biểu đồ**. **Đủ dấu tiếng Việt** nhờ nhúng font Roboto Mono (OFL, `src/assets/fonts/`, nạp bởi `utils/pdfFontLoader.ts`); font đơn cách nên bảng canh cột không đổi. Tệp nặng ~190 KB vì nhúng đủ font. Nếu không tải được font thì tự quay về bản Courier không dấu |

Tên file theo mockup: `BaoCao_ChatLuongDichVu_092026.pdf` (chuyên đề + tháng/năm của ngày kết thúc). "Tải xuống" tải file thật về máy.

## 6. Báo cáo định kỳ
- Biểu mẫu: định dạng, tần suất (hằng ngày / tuần / tháng), giờ:phút, kể từ ngày, chi tiết (1 tuần / 1 tháng / 1 quý), danh sách email (kiểm tra định dạng, không trùng). Chuyên đề + Hub + phương tiện lấy từ lựa chọn hiện tại.
- Danh sách lịch: Chỉnh sửa (nạp lại vào biểu mẫu), Xóa (hộp xác nhận), hiện "Lần chạy tiếp theo".
- **Tự chạy** theo giờ mô phỏng (tick handler `m1.scheduledReports`): tạo báo cáo cho khoảng "Chi tiết" kết thúc ngày chạy, lưu vào danh sách (nhãn Định kỳ) và **gửi email giả lập** bằng thông báo tới Operator, Admin và Ban quản lý. Trễ nhiều kỳ chỉ chạy một lần rồi dời mốc.
- Hằng tháng dùng quy tắc ngày của JavaScript (ngày 31 sang tháng không có ngày 31 sẽ nhảy sang ngày 1 tháng sau).

## 7. Cách demo
1. Đăng nhập `manager` → Báo cáo & Thống kê → chọn chuyên đề, bấm **Tạo báo cáo** (≈1,2 giây "Đang tạo báo cáo...").
2. Ở kết quả: chuyển "Theo giờ", "Sử dụng", rê chuột lên biểu đồ.
3. Chọn PDF / XLSX / CSV → **Xuất dữ liệu** → **Tải xuống**.
4. **⚙ Demo → "Giả lập lỗi khi tạo / xuất báo cáo"** rồi tạo hoặc xuất lại để thấy trạng thái lỗi và **Thử lại**.
5. Báo cáo định kỳ: thêm email, **Xác nhận**; tăng tốc thời gian ở Demo (×60) để thấy báo cáo tự được tạo và thông báo gửi email.

## 8. Chưa làm / giả định
- PDF không có biểu đồ (cần thư viện PDF nếu muốn). Font nhúng chỉ hỗ trợ file TrueType tĩnh (`.ttf`), xem `utils/ttfFont.ts`.
- Số liệu "thật" của hôm nay chỉ phản ánh hoạt động trong phiên chạy hiện tại (không lưu qua F5).
- Chuyên đề khác "Chất lượng dịch vụ" chưa có mockup riêng: dùng chung bố cục của mockup, nội dung KPI / heatmap do mình đề xuất, cần đối chiếu với nhóm.
- Ma trận di chuyển khi lọc theo Hub chỉ giữ các tuyến liên quan Hub đó; biểu đồ theo ngày dùng chuyến xuất phát.
- Email chỉ là thông báo trong ứng dụng.
