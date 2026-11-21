import { ReservationService } from "../services/reservationService";
import { registerTickHandler } from "./tickEngine";

// ===== M2 sở hữu: đăng ký các việc định kỳ của M2 =====
// NIFR-01: tự chuyển lượt đặt xe ACTIVE đã quá hạn sang EXPIRED và trả xe về AVAILABLE.
// Trả về hàm huỷ đăng ký.

export function registerM2TickHandlers(): () => void {
  return registerTickHandler("m2.expireVehicleReservations", (now) => {
    ReservationService.expireReservations(now);
  });
}
