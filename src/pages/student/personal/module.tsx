import { PlaceholderPage } from "../../../components/ui";
import type { AppModule } from "../../../routes/types";

// M3: xe cá nhân, chỗ đỗ & sạc (app mobile).
export const studentPersonalModule: AppModule = {
  id: "student-personal",
  owner: "M3",
  area: "student",
  routes: [
    {
      path: "/app/parking",
      element: (
        <PlaceholderPage
          owner="M3"
          title="Đặt chỗ đỗ"
          ucs={[
            { code: "UC07", name: "Tìm Hub có chỗ đỗ / cổng sạc" },
            { code: "UC08", name: "Đặt chỗ đỗ (có đếm ngược)" },
          ]}
          file="src/pages/student/personal/module.tsx"
        />
      ),
    },
    {
      path: "/app/charging",
      element: (
        <PlaceholderPage
          owner="M3"
          title="Lịch sạc của tôi"
          ucs={[{ code: "UC10", name: "Theo dõi yêu cầu, trạng thái và thời gian sạc" }]}
          file="src/pages/student/personal/module.tsx"
        />
      ),
    },
    {
      path: "/app/charging/new",
      element: (
        <PlaceholderPage
          owner="M3"
          title="Đăng ký sạc"
          ucs={[
            { code: "UC05", name: "Đăng ký nhu cầu sạc (pin mục tiêu, deadline)" },
            { code: "UC09", name: "Chọn cổng sạc và khung giờ" },
          ]}
          file="src/pages/student/personal/module.tsx"
        />
      ),
    },
    {
      path: "/app/personal",
      element: (
        <PlaceholderPage
          owner="M3"
          title="Xe cá nhân & trạng thái pin"
          ucs={[{ code: "UC10", name: "Thông tin xe đã đăng ký, dữ liệu pin từ IoT" }]}
          file="src/pages/student/personal/module.tsx"
        />
      ),
    },
  ],
};
