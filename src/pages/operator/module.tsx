import { PlaceholderPage } from "../../components/ui";
import type { AppModule } from "../../routes/types";

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
          ucs={[{ code: "—", name: "Danh sách xe toàn mạng: vị trí, pin, trạng thái (trang Hub có link sang đây)" }]}
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
