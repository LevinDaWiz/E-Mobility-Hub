import type { AppModule } from "../../routes/types";
import { SimulationPage } from "./SimulationPage";

// M4: site quản trị – Mô phỏng What-if.
export const simulationModule: AppModule = {
  id: "simulation",
  owner: "M4",
  area: "admin",
  adminNav: [{ label: "Mô phỏng", path: "/admin/simulation", roles: ["OPERATOR", "ADMIN", "MANAGEMENT"], order: 50 }],
  routes: [
    {
      path: "/admin/simulation",
      element: <SimulationPage />,
    },
  ],
};
