import { PlaceholderPage } from "../../../components/ui";
import type { AppModule } from "../../../routes/types";

// M3: xe cá nhân, chỗ đỗ & sạc (phía sinh viên).
export const studentPersonalModule: AppModule = {
  id: "student-personal",
  owner: "M3",
  nav: [{ label: "Xe cá nhân & sạc", path: "/student/personal", roles: ["STUDENT"] }],
  routes: [
    {
      path: "/student/personal",
      element: (
        <PlaceholderPage
          owner="M3"
          title="Xe cá nhân: chỗ đỗ & sạc"
          ucs={[
            { code: "UC05", name: "Đăng ký nhu cầu sạc" },
            { code: "UC07", name: "Tìm Hub có chỗ đỗ / cổng sạc" },
            { code: "UC08", name: "Đặt chỗ đỗ" },
            { code: "UC09", name: "Đăng ký lịch sạc" },
            { code: "UC10", name: "Theo dõi trạng thái sạc" },
          ]}
          file="src/pages/student/personal/module.tsx"
        />
      ),
    },
  ],
};
