import type { AppModule } from "../../routes/types";
import { DispatchPage } from "./DispatchPage";
import { IncidentsPage } from "./IncidentsPage";
import { OverloadPage } from "./OverloadPage";
import { VehiclesPage } from "./VehiclesPage";
import { VehicleDetailLayout } from "./vehicles/VehicleDetailLayout";
import { VehicleIncidentsTab } from "./vehicles/VehicleIncidentsTab";
import { VehicleInfoTab } from "./vehicles/VehicleInfoTab";
import { VehicleTripsTab } from "./vehicles/VehicleTripsTab";

// M4: site quản trị – Quá tải (UC15), Phương tiện (UC13, UC14). Tổng quan và Hub & chỗ đỗ (UC11, UC19) do M1 làm.
export const operatorModule: AppModule = {
  id: "operator",
  owner: "M4",
  area: "admin",
  adminNav: [
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
    { path: "/admin/overload", element: <OverloadPage /> },
    { path: "/admin/vehicles", element: <VehiclesPage /> },
    { path: "/admin/vehicles/dispatch", element: <DispatchPage /> },
    { path: "/admin/vehicles/incidents", element: <IncidentsPage /> },
    {
      path: "/admin/vehicles/:vehicleId",
      element: <VehicleDetailLayout />,
      children: [
        { index: true, element: <VehicleInfoTab /> },
        { path: "/admin/vehicles/:vehicleId/trips", element: <VehicleTripsTab /> },
        { path: "/admin/vehicles/:vehicleId/incidents", element: <VehicleIncidentsTab /> },
      ],
    },
  ],
};
