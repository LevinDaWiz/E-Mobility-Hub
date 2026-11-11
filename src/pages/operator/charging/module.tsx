import { PlaceholderPage } from "../../../components/ui";
import type { AppModule } from "../../../routes/types";

// M3: quản lý lịch sạc (phía vận hành).
export const operatorChargingModule: AppModule = {
  id: "operator-charging",
  owner: "M3",
  nav: [{ label: "Lịch sạc", path: "/operator/charging", roles: ["OPERATOR"] }],
  routes: [
    {
      path: "/operator/charging",
      element: (
        <PlaceholderPage
          owner="M3"
          title="Quản lý lịch sạc"
          ucs={[{ code: "UC12", name: "Quản lý lịch sạc của các Hub" }]}
          file="src/pages/operator/charging/module.tsx"
        />
      ),
    },
  ],
};
