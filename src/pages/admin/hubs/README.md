# Hub & chỗ đỗ (UC11 + UC19) – M1

Màn hình giám sát và cấu hình Hub, chỗ đỗ, cổng sạc theo mockup Miro. Mô tả đầy đủ: `phan-cong/05_UC11_UC19_Hub_Monitoring_Config.md`.

| File | Nội dung |
|---|---|
| `HubListPage.tsx` | Danh sách Hub: tìm, lọc trạng thái / khu vực, 4 KPI, bảng, phân trang, Thêm Hub, Nhập từ tệp |
| `HubDetailLayout.tsx` | Khung chi tiết Hub + 4 tab |
| `HubOverviewTab.tsx` / `HubSlotsTab.tsx` / `HubPortsTab.tsx` / `HubConfigTab.tsx` | 4 tab |
| `AddHubModal.tsx`, `ResourceModals.tsx` | Form thêm / sửa Hub, chỗ đỗ, cổng sạc (lỗi đỏ dưới từng ô) |
| `BlockedModal.tsx` | "Không thể vô hiệu hóa tài nguyên" |
| `ImportModal.tsx` | Nhập CSV / JSON |

Logic nghiệp vụ nằm ở `src/services/hubConfigService.ts` (trả `Result`: `validation` / `blocked` / `conflict`), trạng thái và cảnh báo Hub ở `src/utils/hubStatus.ts`.

Route khai báo trong `src/pages/admin/module.tsx`. Admin sửa được; Operator chỉ xem.

Lưu ý khi viết selector Zustand trong các trang này: selector không được tạo mảng / object mới mỗi lần gọi
(chọn mảng thô rồi `useMemo`, hoặc dùng `useShallow`), nếu không React sẽ render lặp vô hạn.
