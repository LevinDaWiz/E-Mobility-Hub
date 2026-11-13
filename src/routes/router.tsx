import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { AdminLayout } from "../layout/AdminLayout";
import { PublicLayout } from "../layout/PublicLayout";
import { RootLayout } from "../layout/RootLayout";
import { StudentLayout } from "../layout/StudentLayout";
import { NotFound } from "../pages/NotFound";
import { appModules } from "./modules";
import { ADMIN_HOME, STAFF_ROLES, STUDENT_HOME } from "./paths";
import { RequireRole } from "./RequireRole";
import { RootRedirect } from "./RootRedirect";
import type { AppArea } from "./types";

const routesOf = (area: AppArea): RouteObject[] =>
  appModules.filter((m) => m.area === area).flatMap((m) => m.routes);

// 3 khu: đăng nhập (công khai), app sinh viên (/app), site quản trị (/admin).
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <RootRedirect /> },
      { element: <PublicLayout />, children: routesOf("public") },
      {
        path: STUDENT_HOME,
        element: (
          <RequireRole allow={["STUDENT"]}>
            <StudentLayout />
          </RequireRole>
        ),
        children: routesOf("student"),
      },
      {
        path: ADMIN_HOME,
        element: (
          <RequireRole allow={STAFF_ROLES}>
            <AdminLayout />
          </RequireRole>
        ),
        children: routesOf("admin"),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
