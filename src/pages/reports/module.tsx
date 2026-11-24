import type { AppModule } from "../../routes/types";
import { ReportExportPage } from "./ReportExportPage";
import { ReportResultPage } from "./ReportResultPage";
import { ReportsHomePage } from "./ReportsHomePage";

// M1: site quản trị – Báo cáo & Thống kê (UC17): thiết lập → kết quả → xuất / định kỳ. Dành cho Operator, Admin, Ban quản lý.
export const reportsModule: AppModule = {
  id: "reports",
  owner: "M1",
  area: "admin",
  adminNav: [{ label: "Báo cáo & Thống kê", path: "/admin/reports", roles: ["OPERATOR", "ADMIN", "MANAGEMENT"], order: 60 }],
  routes: [
    { path: "/admin/reports", element: <ReportsHomePage /> },
    { path: "/admin/reports/result", element: <ReportResultPage /> },
    { path: "/admin/reports/export", element: <ReportExportPage /> },
  ],
};
