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

## Cấu trúc

```
src/
  types/          kiểu dữ liệu theo class diagram (M1 sở hữu)
  config/         hằng số (TTL đặt chỗ, ngưỡng quá tải...), nhãn vai trò
  data/seed.ts    dữ liệu mẫu: 6 Hub, 28 xe, slot, cổng sạc, tài khoản
  store/          Zustand; mỗi người một slice (core/report = M1, vehicle = M2,
                  parkingCharging = M3, ops = M4)
  engine/         tickEngine (M1), chargingScheduler (M3), overloadHandler (M4)
  services/       logic nghiệp vụ theo tên lớp trong class diagram
  utils/          time (đồng hồ mô phỏng), hubStats, collections, id
  hooks/          useHubStats
  components/ui/  Button, Card, Badge, Table, Modal, Progress, Countdown, Toast
  styles/         statusColors (màu theo trạng thái)
  layout/         AppLayout (header, đổi vai trò, menu)
  routes/         router + danh sách module
  pages/<khu>/module.tsx   mỗi khu tự khai báo route + menu của mình
```

## Quy ước chính
- **Thời gian:** dùng đồng hồ mô phỏng (`utils/time.ts`), không dùng `Date.now()` trong nghiệp vụ. Tua nhanh ở nút "Demo" góc phải dưới.
- **Việc định kỳ:** `registerTickHandler(name, (now) => {...})` trong `engine/tickEngine.ts`.
- **Thông báo:** `notify(userId | "*" | "role:OPERATOR", message, level)`.
- **Thêm trang:** sửa `pages/<khu>/module.tsx` của mình (route + menu), không sửa router chung.
- **Zustand v5:** selector trả về object/mảng mới phải bọc `useShallow`.
- Chi tiết phân công: thư mục `phan-cong/`.
