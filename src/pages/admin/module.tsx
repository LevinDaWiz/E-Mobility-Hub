import { PlaceholderPage } from "../../components/ui";
import type { AppModule } from "../../routes/types";

// M1: site quản trị – Hub & chỗ đỗ (UC19), Cài đặt.
export const adminModule: AppModule = {
  id: "admin",
  owner: "M1",
  area: "admin",
  adminNav: [
    { label: "Hub & chỗ đỗ", path: "/admin/hubs", roles: ["OPERATOR", "ADMIN"], order: 20 },
    { label: "Cài đặt", path: "/admin/settings", roles: ["ADMIN"], order: 70, icon: "⚙" },
  ],
  routes: [
    {
      path: "/admin/hubs",
      element: (
        <PlaceholderPage
          owner="M1"
          title="Hub & chỗ đỗ"
          ucs={[{ code: "UC19", name: "Cấu hình Hub, thêm slot / cổng sạc" }]}
          file="src/pages/admin/module.tsx"
        />
      ),
    },
    {
      path: "/admin/settings",
      element: (
        <PlaceholderPage
          owner="M1"
          title="Cài đặt"
          ucs={[{ code: "—", name: "Ngưỡng quá tải, thời hạn giữ chỗ, tuỳ chọn hệ thống" }]}
          file="src/pages/admin/module.tsx"
        />
      ),
    },
  ],
};
