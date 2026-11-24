import type { AppModule } from "../../../routes/types";
import { ChargingSchedulePage } from "./ChargingSchedulePage";

// M3: site quản trị – Sạc & Lịch sạc (UC12).
export const operatorChargingModule: AppModule = {
  id: "operator-charging",
  owner: "M3",
  area: "admin",
  adminNav: [{ label: "Sạc & Lịch sạc", path: "/admin/charging", roles: ["OPERATOR", "ADMIN"], order: 40 }],
  routes: [{ path: "/admin/charging", element: <ChargingSchedulePage /> }],
};
