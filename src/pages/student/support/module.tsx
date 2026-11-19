import type { AppModule } from "../../../routes/types";
import { SupportPage } from "./SupportPage";

// M4: sinh viên gửi báo cáo sự cố → tạo IncidentTicket cho vận hành (liên quan UC14).
export const studentSupportModule: AppModule = {
  id: "student-support",
  owner: "M4",
  area: "student",
  routes: [
    {
      path: "/app/support",
      element: <SupportPage />,
    },
  ],
};
