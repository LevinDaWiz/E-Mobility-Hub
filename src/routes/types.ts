import type { RouteObject } from "react-router-dom";
import type { Role } from "../types";

// Ứng dụng có 3 "khu" giao diện:
//   public  – màn hình đăng nhập (khung điện thoại, chưa cần đăng nhập)
//   student – app mobile cho sinh viên (đường dẫn /app/...)
//   admin   – site quản trị vận hành, có sidebar (đường dẫn /admin/...)
export type AppArea = "public" | "student" | "admin";

export interface AdminNavChild {
  label: string;
  path: string;
}

// Mục trên sidebar của site quản trị. Thêm / bớt mục = thêm / bớt phần tử trong adminNav của module.
export interface AdminNavItem {
  label: string;
  path: string;
  roles: Role[];
  order: number; // nhỏ hơn đứng trên
  icon?: string;
  children?: AdminNavChild[];
}

// Mỗi người sở hữu một hoặc vài module: tự khai báo route (và mục sidebar nếu thuộc khu admin)
// trong file module.tsx của thư mục mình, không phải sửa router chung.
// Đường dẫn route viết đầy đủ, ví dụ "/app/shared" hoặc "/admin/charging".
export interface AppModule {
  id: string;
  owner: "M1" | "M2" | "M3" | "M4";
  area: AppArea;
  routes: RouteObject[];
  adminNav?: AdminNavItem[];
}
