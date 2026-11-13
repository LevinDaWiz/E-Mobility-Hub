import { PlaceholderPage } from "../../components/ui";
import type { AppModule } from "../../routes/types";

// M4: site quản trị – Mô phỏng What-if.
export const simulationModule: AppModule = {
  id: "simulation",
  owner: "M4",
  area: "admin",
  adminNav: [{ label: "Mô phỏng", path: "/admin/simulation", roles: ["OPERATOR", "ADMIN", "MANAGEMENT"], order: 50 }],
  routes: [
    {
      path: "/admin/simulation",
      element: (
        <PlaceholderPage
          owner="M4"
          title="Mô phỏng What-if"
          ucs={[
            { code: "UC16", name: "Tạo và chạy kịch bản mô phỏng" },
            { code: "UC18", name: "Xem kết quả và áp dụng khuyến nghị" },
          ]}
          file="src/pages/simulation/module.tsx"
        />
      ),
    },
  ],
};
