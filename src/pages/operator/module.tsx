import type { AppModule } from "../../routes/types";
import { DispatchPage } from "./DispatchPage";
import { IncidentsPage } from "./IncidentsPage";
import { OverloadPage } from "./OverloadPage";
import { OverviewPage } from "./OverviewPage";
import { VehiclesPage } from "./VehiclesPage";

// M4: site quản trị – Tổng quan (UC11), Quá tải (UC15), Phương tiện (UC13, UC14).
export const operatorModule: AppModule = {
  id: "operator",
  owner: "M4",
  area: "admin",
  adminNav: [
    {
      label: "Tổng quan",
      path: "/admin",
      roles: ["OPERATOR", "ADMIN", "MANAGEMENT"],
      order: 10,
      children: [{ label: "Cảnh báo & quá tải", path: "/admin/overload" }],
    },
    {
      label: "Phương tiện",
      path: "/admin/vehicles",
      roles: ["OPERATOR", "ADMIN"],
      order: 30,
      children: [
        { label: "Điều phối", path: "/admin/vehicles/dispatch" },
        { label: "Sự cố", path: "/admin/vehicles/incidents" },
      ],
    },
  ],
  routes: [
    { index: true, element: <OverviewPage /> },
    { path: "/admin/overload", element: <OverloadPage /> },
    { path: "/admin/vehicles", element: <VehiclesPage /> },
    { path: "/admin/vehicles/dispatch", element: <DispatchPage /> },
    { path: "/admin/vehicles/incidents", element: <IncidentsPage /> },
  ],
};
