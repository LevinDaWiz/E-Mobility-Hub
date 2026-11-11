import { PlaceholderPage } from "../../components/ui";
import type { AppModule } from "../../routes/types";

// M1: UC19 (cấu hình Hub và tài nguyên).
export const adminModule: AppModule = {
  id: "admin",
  owner: "M1",
  nav: [{ label: "Cấu hình Hub", path: "/admin/hubs", roles: ["ADMIN"] }],
  routes: [
    {
      path: "/admin/hubs",
      element: (
        <PlaceholderPage
          owner="M1"
          title="Cấu hình Hub & tài nguyên"
          ucs={[{ code: "UC19", name: "Quản lý cấu hình Hub, thêm slot / cổng sạc" }]}
          file="src/pages/admin/module.tsx"
        />
      ),
    },
  ],
};
