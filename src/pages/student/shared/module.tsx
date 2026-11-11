import { PlaceholderPage } from "../../../components/ui";
import type { AppModule } from "../../../routes/types";

// M2: xe dùng chung.
export const studentSharedModule: AppModule = {
  id: "student-shared",
  owner: "M2",
  nav: [{ label: "Xe dùng chung", path: "/student/shared", roles: ["STUDENT"] }],
  routes: [
    {
      path: "/student/shared",
      element: (
        <PlaceholderPage
          owner="M2"
          title="Xe dùng chung"
          ucs={[
            { code: "UC01", name: "Tìm Hub / phương tiện" },
            { code: "UC02", name: "Xem trạng thái phương tiện" },
            { code: "UC03", name: "Đặt xe" },
            { code: "UC04", name: "Nhận phương tiện (mở khóa)" },
            { code: "UC06", name: "Trả phương tiện" },
          ]}
          file="src/pages/student/shared/module.tsx"
        />
      ),
    },
  ],
};
