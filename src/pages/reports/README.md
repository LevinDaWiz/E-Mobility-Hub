# Báo cáo & Thống kê (UC17) – M1

Mô tả đầy đủ: `phan-cong/06_UC17_Bao_cao_Thong_ke.md`.

| File | Nội dung |
|---|---|
| `ReportsHomePage.tsx` | Chọn chuyên đề (4 thẻ), bộ lọc, Tạo báo cáo / Báo cáo định kỳ, danh sách báo cáo đã tạo |
| `ReportResultPage.tsx` | KPI, biểu đồ theo ngày / giờ, nhu cầu theo Hub, heatmap, bảng tổng hợp, xuất file |
| `ReportExportPage.tsx` | Xuất ngay (3 trạng thái) + quản lý báo cáo định kỳ |
| `charts/` | `DailyChart`, `HubBars`, `Heatmap`, `Segmented` (SVG / CSS, không dùng thư viện biểu đồ) |

Logic: `src/services/reportEngine.ts` (hàm thuần, dữ liệu mẫu xác định), `reportService.ts` (tạo, xuất, định kỳ), `src/utils/fileExport.ts` (CSV / XLSX / PDF).
Dữ liệu lịch sử là **dữ liệu mẫu sinh theo quy mô từng Hub**, không đọc từ chuyến đi thật.
