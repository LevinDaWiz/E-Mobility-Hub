import { ChargingService } from "../services/chargingService";
import { ParkingService } from "../services/parkingService";
import { registerTickHandler } from "./tickEngine";

// ===== M3 sở hữu: các việc định kỳ của M3 =====
// - NIFR-01: lượt giữ chỗ đỗ quá hạn → EXPIRED, slot về FREE.
// - UC10: phiên sạc đến giờ → CHARGING, tăng pin theo công suất cổng, đủ mục tiêu → COMPLETED.
// - NIFR-06: phiên trên cổng FAULTY / MAINTENANCE → xếp lại; yêu cầu PENDING được thử xếp lịch lại theo priority.
// Trả về hàm huỷ đăng ký.

export function registerM3TickHandlers(): () => void {
  const stops = [
    registerTickHandler("m3.expireParkingReservations", (now) => {
      ParkingService.expireParkingReservations(now);
    }),
    registerTickHandler("m3.chargingSessions", (now) => {
      ChargingService.tick(now);
    }),
  ];
  return () => stops.forEach((stop) => stop());
}
