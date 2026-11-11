import { PlaceholderPage } from "../../components/ui";
import type { AppModule } from "../../routes/types";

// M1: UC17 (báo cáo & thống kê).
export const reportsModule: AppModule = {
  id: "reports",
  owner: "M1",
  nav: [{ label: "Báo cáo", path: "/reports", roles: ["MANAGEMENT", "ADMIN"] }],
  routes: [
    {
      path: "/reports",
      element: (
        <PlaceholderPage
          owner="M1"
          title="Báo cáo & thống kê"
          ucs={[{ code: "UC17", name: "Xem và xuất báo cáo thống kê" }]}
          file="src/pages/reports/module.tsx"
        />
      ),
    },
  ],
};
