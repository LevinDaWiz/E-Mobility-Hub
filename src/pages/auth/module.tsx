import { PlaceholderPage } from "../../components/ui";
import type { AppModule } from "../../routes/types";

// M1: UC20 (đăng nhập giả lập). Hiện dùng thanh chuyển vai trò trên header.
export const authModule: AppModule = {
  id: "auth",
  owner: "M1",
  nav: [],
  routes: [
    {
      path: "/login",
      element: (
        <PlaceholderPage
          owner="M1"
          title="Đăng nhập"
          ucs={[{ code: "UC20", name: "Xác thực sinh viên (SSO giả lập)" }]}
          file="src/pages/auth/module.tsx"
        />
      ),
    },
  ],
};
