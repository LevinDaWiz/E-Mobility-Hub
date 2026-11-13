import { PlaceholderPage } from "../../../components/ui";
import type { AppModule } from "../../../routes/types";

// M3: site quản trị – Sạc & Lịch sạc.
export const operatorChargingModule: AppModule = {
  id: "operator-charging",
  owner: "M3",
  area: "admin",
  adminNav: [{ label: "Sạc & Lịch sạc", path: "/admin/charging", roles: ["OPERATOR", "ADMIN"], order: 40 }],
  routes: [
    {
      path: "/admin/charging",
      element: (
        <PlaceholderPage
          owner="M3"
          title="Sạc & Lịch sạc"
          ucs={[{ code: "UC12", name: "Quản lý lịch sạc theo Hub / cổng (NIFR-05, NIFR-06)" }]}
          file="src/pages/operator/charging/module.tsx"
        />
      ),
    },
  ],
};
