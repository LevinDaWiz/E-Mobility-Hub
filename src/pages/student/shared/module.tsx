import { registerTickHandler } from "../../../engine/tickEngine";
import { ReservationService } from "../../../services/reservationService";
import SharedVehiclesPage from "./SharedVehiclesPage";
import { TripsPage } from "./TripsPage";
import { ActivityPage } from "./ActivityPage";
import type { AppModule } from "../../../routes/types";

// NIFR-01: giữ nguyên handler hết hạn đặt xe đang sử dụng.
registerTickHandler("expireVehicleReservations", (now) => {
  ReservationService.expireReservations(now);
});

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
