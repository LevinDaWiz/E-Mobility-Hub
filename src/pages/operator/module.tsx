import { PlaceholderPage } from "../../components/ui";
import type { AppModule } from "../../routes/types";
import { OverviewPage } from "./OverviewPage";

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
    {
      path: "/admin/overload",
      element: (
        <PlaceholderPage
          owner="M4"
          title="Cảnh báo & xử lý Hub quá tải"
          ucs={[{ code: "UC15", name: "Khuyến nghị REDISTRIBUTE / RESCHEDULE / REDIRECT (NIFR-03)" }]}
          file="src/pages/operator/module.tsx"
        />
      ),
    },
    {
      path: "/admin/vehicles",
      element: (
        <PlaceholderPage
          owner="M4"
          title="Phương tiện"
          ucs={[{ code: "UC11", name: "Danh sách xe toàn mạng: vị trí, pin, trạng thái" }]}
          file="src/pages/operator/module.tsx"
        />
      ),
    },
    {
      path: "/admin/vehicles/dispatch",
      element: (
        <PlaceholderPage
          owner="M4"
          title="Điều phối phương tiện"
          ucs={[{ code: "UC13", name: "Tạo, duyệt, thực hiện lệnh điều phối" }]}
          file="src/pages/operator/module.tsx"
        />
      ),
    },
    {
      path: "/admin/vehicles/incidents",
      element: (
        <PlaceholderPage
          owner="M4"
          title="Sự cố"
          ucs={[{ code: "UC14", name: "Ticket sự cố xe / cổng sạc (NIFR-04)" }]}
          file="src/pages/operator/module.tsx"
        />
      ),
    },
  ],
};
