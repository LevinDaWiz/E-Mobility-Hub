import { PlaceholderPage } from "../../components/ui";
import type { AppModule } from "../../routes/types";

// M1: site quản trị – Báo cáo & Thống kê (UC17).
export const reportsModule: AppModule = {
  id: "reports",
  owner: "M1",
  area: "admin",
  adminNav: [{ label: "Báo cáo & Thống kê", path: "/admin/reports", roles: ["ADMIN", "MANAGEMENT"], order: 60 }],
  routes: [
    {
      path: "/admin/reports",
      element: (
        <PlaceholderPage
          owner="M1"
          title="Báo cáo & Thống kê"
          ucs={[{ code: "UC17", name: "Xem và xuất báo cáo thống kê" }]}
          file="src/pages/reports/module.tsx"
        />
      ),
    },
  ],
};
