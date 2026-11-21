import SharedVehiclesPage from "./SharedVehiclesPage";
import { TripsPage } from "./TripsPage";
import { ActivityPage } from "./ActivityPage";
import type { AppModule } from "../../../routes/types";

// NIFR-01 (tự hết hạn lượt đặt xe) được đăng ký tập trung ở engine/registerHandlers.ts (engine/m2Handlers.ts),
// không đăng ký ở đây để không phụ thuộc việc file này có được import hay không.

export const studentSharedModule: AppModule = {
  id: "student-shared",
  owner: "M2",
  area: "student",
  routes: [
    { path: "/app/shared", element: <SharedVehiclesPage /> },
    { path: "/app/trips", element: <TripsPage /> },
    { path: "/app/activity", element: <ActivityPage /> },
  ],
};
