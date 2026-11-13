import { PlaceholderPage } from "../../../components/ui";
import type { AppModule } from "../../../routes/types";

// M2: xe dùng chung. Thêm trang mới: thêm route ở đây (đường dẫn /app/...).
export const studentSharedModule: AppModule = {
  id: "student-shared",
  owner: "M2",
  area: "student",
  routes: [
    {
      path: "/app/shared",
      element: (
        <PlaceholderPage
          owner="M2"
          title="Tìm xe dùng chung"
          ucs={[
            { code: "UC01", name: "Tìm Hub / phương tiện" },
            { code: "UC02", name: "Xem trạng thái phương tiện" },
            { code: "UC03", name: "Đặt xe (có đếm ngược)" },
          ]}
          file="src/pages/student/shared/module.tsx"
        />
      ),
    },
    {
      path: "/app/trips",
      element: (
        <PlaceholderPage
          owner="M2"
          title="Chuyến đi của tôi"
          ucs={[
            { code: "UC04", name: "Nhận phương tiện (mở khóa)" },
            { code: "UC06", name: "Trả phương tiện, xem lịch sử" },
          ]}
          file="src/pages/student/shared/module.tsx"
        />
      ),
    },
    {
      path: "/app/activity",
      element: (
        <PlaceholderPage
          owner="M2"
          title="Hoạt động"
          ucs={[{ code: "—", name: "Lịch sử chuyến đi, đặt chỗ, phiên sạc (tổng hợp từ store)" }]}
          file="src/pages/student/shared/module.tsx"
        />
      ),
    },
  ],
};
