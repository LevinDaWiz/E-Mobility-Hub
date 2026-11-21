import { PlaceholderPage } from "../../components/ui";
import type { AppModule } from "../../routes/types";
import { OverviewPage } from "./overview/OverviewPage";
import { HubConfigTab } from "./hubs/HubConfigTab";
import { HubDetailLayout } from "./hubs/HubDetailLayout";
import { HubListPage } from "./hubs/HubListPage";
import { HubOverviewTab } from "./hubs/HubOverviewTab";
import { HubPortsTab } from "./hubs/HubPortsTab";
import { HubSlotsTab } from "./hubs/HubSlotsTab";
import { HubVehiclesTab } from "./hubs/HubVehiclesTab";

// M1: UC11 (giám sát Hub: Tổng quan, danh sách và chi tiết Hub) + UC19 (cấu hình Hub, chỗ đỗ, cổng sạc).
// Chi tiết: src/pages/admin/hubs/README.md
export const adminModule: AppModule = {
  id: "admin",
  owner: "M1",
  area: "admin",
  adminNav: [
    {
      label: "Tổng quan",
      path: "/admin",
      roles: ["OPERATOR", "ADMIN", "MANAGEMENT"],
      order: 10,
      children: [{ label: "Cảnh báo & quá tải", path: "/admin/overload" }],
    },
    { label: "Hub & chỗ đỗ", path: "/admin/hubs", roles: ["OPERATOR", "ADMIN"], order: 20 },
    { label: "Cài đặt", path: "/admin/settings", roles: ["ADMIN"], order: 70, icon: "⚙" },
  ],
  routes: [
    { index: true, element: <OverviewPage /> },
    { path: "/admin/hubs", element: <HubListPage /> },
    {
      path: "/admin/hubs/:hubId",
      element: <HubDetailLayout />,
      children: [
        { index: true, element: <HubOverviewTab /> },
        { path: "/admin/hubs/:hubId/slots", element: <HubSlotsTab /> },
        { path: "/admin/hubs/:hubId/ports", element: <HubPortsTab /> },
        { path: "/admin/hubs/:hubId/vehicles", element: <HubVehiclesTab /> },
        { path: "/admin/hubs/:hubId/config", element: <HubConfigTab /> },
      ],
    },
    {
      path: "/admin/settings",
      element: (
        <PlaceholderPage
          owner="M1"
          title="Cài đặt"
          ucs={[{ code: "—", name: "Tuỳ chọn hệ thống chung (ngưỡng riêng từng Hub chỉnh ở tab Cấu hình của Hub)" }]}
          file="src/pages/admin/module.tsx"
        />
      ),
    },
  ],
};
