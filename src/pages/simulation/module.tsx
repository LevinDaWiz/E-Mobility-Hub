import { PlaceholderPage } from "../../components/ui";
import type { AppModule } from "../../routes/types";

// M4: What-if Simulation.
export const simulationModule: AppModule = {
  id: "simulation",
  owner: "M4",
  nav: [{ label: "Mô phỏng", path: "/simulation", roles: ["OPERATOR", "MANAGEMENT"] }],
  routes: [
    {
      path: "/simulation",
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
