import { PlaceholderPage } from "../../components/ui";
import type { AppModule } from "../../routes/types";

// M4: vận hành.
export const operatorModule: AppModule = {
  id: "operator",
  owner: "M4",
  nav: [
    { label: "Giám sát", path: "/operator", roles: ["OPERATOR", "MANAGEMENT"] },
    { label: "Điều phối", path: "/operator/dispatch", roles: ["OPERATOR"] },
    { label: "Sự cố", path: "/operator/incidents", roles: ["OPERATOR"] },
    { label: "Quá tải", path: "/operator/overload", roles: ["OPERATOR"] },
  ],
  routes: [
    {
      path: "/operator",
      element: (
        <PlaceholderPage
          owner="M4"
          title="Giám sát mạng lưới Hub"
          ucs={[{ code: "UC11", name: "Dashboard giám sát Hub, cảnh báo" }]}
          file="src/pages/operator/module.tsx"
        />
      ),
    },
    {
      path: "/operator/dispatch",
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
      path: "/operator/incidents",
      element: (
        <PlaceholderPage
          owner="M4"
          title="Xử lý sự cố"
          ucs={[{ code: "UC14", name: "Ticket sự cố xe / cổng sạc (NIFR-04)" }]}
          file="src/pages/operator/module.tsx"
        />
      ),
    },
    {
      path: "/operator/overload",
      element: (
        <PlaceholderPage
          owner="M4"
          title="Xử lý Hub quá tải"
          ucs={[{ code: "UC15", name: "Khuyến nghị REDISTRIBUTE / RESCHEDULE / REDIRECT (NIFR-03)" }]}
          file="src/pages/operator/module.tsx"
        />
      ),
    },
  ],
};
