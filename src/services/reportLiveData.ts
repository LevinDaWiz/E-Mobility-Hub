import { useStore } from "../store";
import {
  PortStatus,
  ReservationStatus,
  RequestStatus,
  VehicleType,
} from "../types";
import { computeHubStats } from "../utils/hubStats";
import { dateKey, type Fact } from "./reportEngine";

// ===== M1 sở hữu (UC17): số liệu THẬT của ngày hôm nay, lấy từ store, để trộn vào báo cáo =====
// Lịch sử các ngày trước vẫn là dữ liệu mẫu (reportEngine). Hôm nay được thay bằng những gì đã thực sự xảy ra
// trong hệ thống (đặt xe, chuyến đi, phiên sạc, mức lấp đầy, lỗi cổng). Các trường chưa có nguồn thật
// (thời gian chờ) giữ giá trị mẫu của ngày đó.

// Dung lượng pin ước lượng để đổi % pin đã sạc sang kWh (cùng bậc với mô hình mẫu của báo cáo).
const BATTERY_KWH: Record<VehicleType, number> = {
  [VehicleType.E_BIKE]: 1.5,
  [VehicleType.E_MOTORBIKE]: 3.4,
};

const mean = (values: number[]): number => (values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length);

// today: YYYY-MM-DD theo ngày mô phỏng; vehicle: "ALL" hoặc VehicleType (bộ lọc của báo cáo).
export function buildLiveFacts(today: string, vehicle: string): Record<string, Partial<Fact>> {
  const s = useStore.getState();
  const isToday = (iso: string): boolean => dateKey(new Date(iso)) === today;
  const typeOf = new Map(s.vehicles.map((v) => [v.vehicleId, v.type]));
  const hubOfVehicle = new Map(s.vehicles.map((v) => [v.vehicleId, v.currentHubId]));
  const hubOfPort = new Map(s.chargingPorts.map((p) => [p.portId, p.hubId]));
  const matches = (vehicleId: string): boolean => vehicle === "ALL" || typeOf.get(vehicleId) === vehicle;
  const nowMs = s.clock.now;

  const result: Record<string, Partial<Fact>> = {};

  for (const hub of s.hubs) {
    const stats = computeHubStats(
      { parkingSlots: s.parkingSlots, chargingPorts: s.chargingPorts, vehicles: s.vehicles },
      hub.hubId,
    );

    // Đặt xe: không tính lượt người dùng tự hủy; "được đáp ứng" = còn giữ hoặc đã nhận xe, hết hạn = chưa được phục vụ.
    const reservations = s.vehicleReservations.filter(
      (r) =>
        (r.hubId ?? hubOfVehicle.get(r.vehicleId)) === hub.hubId &&
        isToday(r.createdAt) &&
        matches(r.vehicleId) &&
        r.status !== ReservationStatus.CANCELLED,
    );
    const booking = reservations.length;
    const bookingOk = reservations.filter(
      (r) => r.status === ReservationStatus.ACTIVE || r.status === ReservationStatus.CONFIRMED,
    ).length;

    // Yêu cầu sạc có giờ bắt đầu mong muốn hôm nay (Hub = Hub hiện tại của xe).
    const requests = s.chargingRequests.filter(
      (r) =>
        hubOfVehicle.get(r.vehicleId) === hub.hubId &&
        isToday(r.desiredStart) &&
        matches(r.vehicleId) &&
        r.status !== RequestStatus.CANCELLED,
    );
    const charge = requests.length;
    const chargeOk = requests.filter((r) => r.status === RequestStatus.SCHEDULED).length;

    const trips = s.trips.filter((t) => t.fromHubId === hub.hubId && isToday(t.startTime) && matches(t.vehicleId)).length;

    const sessions = s.chargingSessions.filter(
      (cs) => hubOfPort.get(cs.portId) === hub.hubId && isToday(cs.startTime) && matches(cs.vehicleId),
    );
    const energyKwh = sessions.reduce((total, cs) => {
      const type = typeOf.get(cs.vehicleId) ?? VehicleType.E_BIKE;
      return total + (Math.max(0, cs.currentBattery - cs.startBattery) / 100) * BATTERY_KWH[type];
    }, 0);

    result[hub.hubId] = {
      requests: booking + charge,
      booking,
      bookingOk,
      charge,
      chargeOk,
      trips,
      sessions: sessions.length,
      energyKwh,
      startBatt: mean(sessions.map((cs) => cs.startBattery)),
      endBatt: mean(sessions.map((cs) => cs.currentBattery)),
      chargeMin: mean(
        sessions.map((cs) => (((cs.endTime ? new Date(cs.endTime).getTime() : nowMs) - new Date(cs.startTime).getTime()) / 60_000)),
      ),
      occupancy: Math.min(1, Math.max(0, stats.utilization)),
      portUtil: Math.min(1, Math.max(0, stats.chargingUtilization)),
      overloads: stats.utilization > hub.thresholds.overload ? 1 : 0,
      portFaults: s.chargingPorts.filter((p) => p.hubId === hub.hubId && p.status === PortStatus.FAULTY).length,
    };
  }

  return result;
}
