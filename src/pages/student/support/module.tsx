import { PlaceholderPage } from "../../../components/ui";
import type { AppModule } from "../../../routes/types";

// M4: sinh viên gửi báo cáo sự cố → tạo IncidentTicket cho vận hành (liên quan UC14).
export const studentSupportModule: AppModule = {
  id: "student-support",
  owner: "M4",
  area: "student",
  routes: [
    {
      path: "/app/support",
      element: (
        <PlaceholderPage
          owner="M4"
          title="Hỗ trợ & báo cáo sự cố"
          ucs={[{ code: "UC14", name: "Phía sinh viên: gửi sự cố xe / Hub / cổng sạc → ticket" }]}
          file="src/pages/student/support/module.tsx"
        />
      ),
    },
  ],
};
