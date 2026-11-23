import type { AppModule } from "../../../routes/types";
import { ChargingNewPage } from "./ChargingNewPage";
import { MyChargingPage } from "./MyChargingPage";
import { ParkingPage } from "./ParkingPage";
import { PersonalVehiclesPage } from "./PersonalVehiclesPage";

// M3: xe cá nhân, chỗ đỗ & sạc (app mobile). Việc định kỳ (hết hạn giữ chỗ, tiến độ sạc) ở engine/m3Handlers.ts.
export const studentPersonalModule: AppModule = {
  id: "student-personal",
  owner: "M3",
  area: "student",
  routes: [
    { path: "/app/parking", element: <ParkingPage /> }, // UC07, UC08
    { path: "/app/charging", element: <MyChargingPage /> }, // UC10
    { path: "/app/charging/new", element: <ChargingNewPage /> }, // UC05, UC09
    { path: "/app/personal", element: <PersonalVehiclesPage /> },
  ],
};
