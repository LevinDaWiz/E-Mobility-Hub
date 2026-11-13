import type { AppModule } from "../../../routes/types";
import { AccountPage } from "./AccountPage";
import { StudentHomePage } from "./StudentHomePage";
import { StudentHubsPage } from "./StudentHubsPage";

// M1: khung app mobile – trang chủ, tab Hub, tab Tài khoản.
export const studentHomeModule: AppModule = {
  id: "student-home",
  owner: "M1",
  area: "student",
  routes: [
    { index: true, element: <StudentHomePage /> },
    { path: "/app/hubs", element: <StudentHubsPage /> },
    { path: "/app/account", element: <AccountPage /> },
  ],
};
