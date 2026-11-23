# Smart E-Mobility Hub – MVP (CO3001, nhóm 6)

Ứng dụng demo chạy hoàn toàn trên trình duyệt (React 19 + TypeScript + Vite + Tailwind CSS + Zustand). Không có backend/database: dữ liệu mẫu nằm trong `src/data/seed.ts`, trạng thái nằm trong store Zustand.

## Chạy

```bash
npm install        # mọi thư viện đã có trong package.json, không cần cài thêm
npm run dev      # http://localhost:5173
npm run build    # kiểm tra kiểu + build
npm run lint
```

## Hai giao diện, một ứng dụng

| Khu | Đường dẫn | Dành cho | Khung |
|-----|-----------|----------|-------|
| Đăng nhập (SSO giả lập, UC20) | `/login` ... | mọi người | khung điện thoại |
| **App mobile** | `/app/...` | Sinh viên | header + thanh tab dưới (Trang chủ, Hub, Hoạt động, Tài khoản) |
| **Site quản trị** | `/admin/...` | Vận hành, Quản trị, Ban quản lý | sidebar navy (Tổng quan, Hub & chỗ đỗ, Phương tiện, Sạc & Lịch sạc, Mô phỏng, Báo cáo & Thống kê, Cài đặt) |

Đăng nhập demo: sinh viên `2112345` (mật khẩu bất kỳ); `admin`, `operator1`, `manager`. Hoặc dùng "⚙ Demo" góc dưới phải để đổi nhanh tài khoản.

## Cấu trúc

```
src/
  types/ config/ data/seed.ts store/ engine/ services/ utils/ hooks/   (như Phase 0)
  components/ui/       Button, Card, Badge, Table, Modal, Progress, Countdown, Toast
  components/layout/   Logo, MobileFrame, DarkButton, MiniMap
  layout/              RootLayout, PublicLayout, StudentLayout (mobile), AdminLayout (sidebar)
  routes/              router, RequireRole (chặn theo vai trò), types, paths, modules
  pages/auth/          5 màn hình đăng nhập (M1)
  pages/student/<khu>/module.tsx   route của app mobile (home: M1, shared: M2, personal: M3, support: M4)
  pages/operator|simulation|reports|admin/module.tsx   route + mục sidebar của site quản trị
```

## Thêm / bớt chức năng
- **Thêm trang cho app mobile:** thêm route `{ path: "/app/xxx", element: ... }` vào `module.tsx` của mình. Muốn hiện trên trang chủ thì thêm vào `config/studentNav.ts` (`QUICK_ACTIONS`, `STUDENT_LINKS`) hoặc tab dưới (`STUDENT_TABS`).
- **Thêm mục sidebar:** thêm phần tử vào `adminNav` của module (`label`, `path`, `roles`, `order`, `children` tuỳ chọn) và route tương ứng. Ai thấy mục nào quyết định bởi `roles`.
- **Bớt:** xoá route / mục tương ứng. Module mới: tạo `module.tsx` rồi thêm một dòng vào `routes/modules.ts`.
- **Bản đồ trang chủ:** Hub seed có vị trí cố định trong `config/mapPositions.ts`; Hub tạo thêm tự được xếp vào ô trống, không cần khai báo.
- **Cài đặt hệ thống:** `/admin/settings` (Quản trị viên). Mã nghiệp vụ đọc giá trị bằng `getSettings()` (`services/settingsService.ts`), mặc định ở `config/settings.ts`.
- **Việc định kỳ của module mới:** tạo `engine/m3Handlers.ts` (ví dụ cho M3) rồi thêm vào `engine/registerHandlers.ts`.
- **PDF có dấu tiếng Việt:** nhúng font Roboto Mono (`src/assets/fonts/`, giấy phép OFL trong `OFL.txt`).

## Hub & chỗ đỗ (UC11 + UC19)
`/admin/hubs`: danh sách Hub, chi tiết 4 tab (Tổng quan, Chỗ đỗ, Cổng sạc, Cấu hình), thêm / sửa / bảo trì tài nguyên, ngưỡng riêng từng Hub, khoá lạc quan (409), nhập CSV/JSON. Xem `src/pages/admin/hubs/README.md`. Thử nhanh: đăng nhập `admin`, bấm **⚙ Demo → Metro surge** để thấy Hub Metro thành Overloaded; **Demo → Admin khác sửa** rồi Lưu ở tab Cấu hình để thấy 409.

## Quy ước chính
- **Thời gian:** dùng đồng hồ mô phỏng (`utils/time.ts`), không dùng `Date.now()` trong nghiệp vụ. Tua nhanh ở nút "Demo" góc phải dưới.
- **Việc định kỳ:** `registerTickHandler(name, (now) => {...})` trong `engine/tickEngine.ts`.
- **Thông báo:** `notify(userId | "*" | "role:OPERATOR", message, level)`.
- **Zustand v5:** selector trả về object/mảng mới phải bọc `useShallow`.
- Chi tiết phân công: thư mục `phan-cong/`.

## Đỗ xe & sạc (M3)
- **App sinh viên:** `/app/parking` tìm Hub theo nhu cầu (chỗ đỗ / cổng sạc / cả hai), khoảng cách, phút chờ sạc và giữ chỗ có đếm ngược (UC07, UC08); `/app/charging/new` đăng ký sạc: xe, pin mục tiêu, giờ bắt đầu, deadline, chọn cổng/khung giờ, gợi ý Hub hoặc giờ khác khi hết cổng (UC05, UC09); `/app/charging` theo dõi tiến độ pin và giờ dự kiến xong (UC10); `/app/personal` xe cá nhân và pin.
- **Site quản trị:** `/admin/charging` bảng thời gian theo cổng, đổi ưu tiên, dời 15′, huỷ, "Xếp lại lịch Hub" (UC12).
- **Logic:** `engine/chargingScheduler.ts` (công thức ưu tiên NIFR-05 ghi trong comment, `buildSchedule`, `rescheduleOnConflict` NIFR-06), `services/chargingService.ts`, `services/parkingService.ts`; việc định kỳ ở `engine/m3Handlers.ts` (hết hạn giữ chỗ NIFR-01, chạy phiên sạc, xếp lại khi cổng FAULTY/MAINTENANCE, thử lại yêu cầu PENDING).
- **Thử nhanh:** đăng nhập `2112345` → Đặt chỗ đỗ, chờ hết hạn (hoặc tua ở Demo) để thấy chỗ tự giải phóng; Đăng ký sạc → tua thời gian để thấy SCHEDULED → CHARGING → COMPLETED. Báo lỗi cổng đang sạc (Sự cố / Demo) → phiên chuyển sang cổng khác, sinh viên được thông báo.
