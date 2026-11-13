# Smart E-Mobility Hub – MVP (CO3001, nhóm 6)

Ứng dụng demo chạy hoàn toàn trên trình duyệt (React 19 + TypeScript + Vite + Tailwind CSS + Zustand). Không có backend/database: dữ liệu mẫu nằm trong `src/data/seed.ts`, trạng thái nằm trong store Zustand.

## Chạy

```bash
npm install
npm install react-router-dom zustand recharts tailwindcss @tailwindcss/vite   # lần đầu, nếu chưa có trong package.json
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
- **Bản đồ trang chủ:** vị trí Hub trong `config/mapPositions.ts`.

## Quy ước chính
- **Thời gian:** dùng đồng hồ mô phỏng (`utils/time.ts`), không dùng `Date.now()` trong nghiệp vụ. Tua nhanh ở nút "Demo" góc phải dưới.
- **Việc định kỳ:** `registerTickHandler(name, (now) => {...})` trong `engine/tickEngine.ts`.
- **Thông báo:** `notify(userId | "*" | "role:OPERATOR", message, level)`.
- **Zustand v5:** selector trả về object/mảng mới phải bọc `useShallow`.
- Chi tiết phân công: thư mục `doc/`.
