import type { RouteObject } from "react-router-dom";
import type { Role } from "../types";

export interface NavItem {
  label: string;
  path: string;
  roles: Role[];
}

// Mỗi người sở hữu một hoặc vài "module": tự khai báo route và menu của mình
// trong file module.tsx của thư mục mình, không phải sửa router chung.
export interface AppModule {
  id: string;
  owner: "M1" | "M2" | "M3" | "M4";
  routes: RouteObject[];
  nav: NavItem[];
}
