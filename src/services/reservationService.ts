import { useStore } from "../store";
import { getHubIntakeBlocker, getHubPickupBlocker } from "../utils/hubAvailability";
import { getSettings } from "./settingsService";
import { ParkingService } from "./parkingService";
import {
  ReservationStatus,
  TripStatus,
  VehicleStatus,
  type Trip,
  type VehicleReservation,
  type AppNotification,
} from "../types";

// Thời hạn giữ xe lấy từ Cài đặt (mặc định 30 giây theo đồng hồ mô phỏng), xem config/settings.ts.

// Dùng hệ thống thông báo trong CoreSlice của M1.
// Giá trị level bên dưới tương ứng mức thông báo thành công.
function notify(userId: string, message: string, level: AppNotification["level"] = "success"): void {
  const state = useStore.getState();
  const notification: AppNotification = {
    id: `NOTIF-${crypto.randomUUID()}`,
    userId,
    message,
    level,
    createdAt: new Date(state.clock.now).toISOString(),
    read: false,
  };
  state.addNotification(notification);
}

export const ReservationService = {
  // NIFR-01: Được tickEngine của M1 gọi theo thời gian mô phỏng (mili giây).
  // Chỉ xử lý reservation ACTIVE; gọi nhiều lần cũng không tạo thông báo trùng.
  expireReservations(now: number = useStore.getState().clock.now): number {
    const state = useStore.getState();
    const expired = state.vehicleReservations.filter(
      (reservation) =>
        reservation.status === ReservationStatus.ACTIVE &&
        new Date(reservation.expiresAt).getTime() <= now,
    );

    for (const reservation of expired) {
      // Kiểm tra trạng thái hiện tại để tránh xử lý trùng do các lần tick sát nhau.
      const latest = useStore.getState().vehicleReservations.find(
        (item) => item.reservationId === reservation.reservationId,
      );
      if (latest?.status !== ReservationStatus.ACTIVE) continue;

      useStore.getState().upsertVehicleReservation({
        ...latest,
        status: ReservationStatus.EXPIRED,
      });

      const vehicle = useStore.getState().vehicles.find(
        (item) => item.vehicleId === latest.vehicleId,
      );
      if (vehicle?.status === VehicleStatus.RESERVED) {
        useStore.getState().updateVehicle(latest.vehicleId, {
          status: VehicleStatus.AVAILABLE,
        });
      }
      notify(
        latest.studentId,
        `Lượt đặt xe ${latest.vehicleId} đã hết hạn. Xe đã được giải phóng.`,
        "warning",
      );
    }
    return expired.length;
  },

  // UC03: Giữ một chiếc xe cho sinh viên.
  reserveVehicle(studentId: string, vehicleId: string): VehicleReservation {
    const now = useStore.getState().clock.now;
    this.expireReservations(now);
    const state = useStore.getState();

    if (!state.students.some((student) => student.studentId === studentId)) {
      throw new Error("Không tìm thấy sinh viên.");
    }

    const vehicle = state.vehicles.find((item) => item.vehicleId === vehicleId);
    if (!vehicle) throw new Error("Không tìm thấy xe.");
    if (vehicle.status !== VehicleStatus.AVAILABLE || vehicle.batteryLevel <= 0) {
      throw new Error("Xe không khả dụng hoặc không đủ pin.");
    }
    // Hub bảo trì / ngưng hoạt động thì không giao xe. Hub quá tải vẫn cho lấy xe (giúp giảm tải).
    const pickupBlocker = getHubPickupBlocker(vehicle.currentHubId);
    if (pickupBlocker) throw new Error(pickupBlocker);

    const hasActiveReservation = state.vehicleReservations.some(
      (reservation) =>
        reservation.studentId === studentId &&
        reservation.status === ReservationStatus.ACTIVE &&
        new Date(reservation.expiresAt).getTime() > now,
    );
    const hasOngoingTrip = state.trips.some(
      (trip) => trip.studentId === studentId && trip.status === TripStatus.ONGOING,
    );

    if (hasActiveReservation || hasOngoingTrip) {
      throw new Error("Sinh viên đã có lượt đặt xe hoặc chuyến đi đang hoạt động.");
    }

    const reservation: VehicleReservation = {
      reservationId: `RES-${crypto.randomUUID()}`,
      studentId,
      vehicleId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + getSettings().vehicleReservationMs).toISOString(),
      status: ReservationStatus.ACTIVE,
      hubId: vehicle.currentHubId,
    };

    state.upsertVehicleReservation(reservation);
    state.updateVehicle(vehicleId, { status: VehicleStatus.RESERVED });
    notify(studentId, `Đặt xe ${vehicleId} thành công. Hãy đến nhận xe trước khi hết hạn.`);
    return reservation;
  },


  // UC03: Hủy lượt đặt xe đang ACTIVE (chủ lượt đặt mới được hủy).
  cancelReservation(reservationId: string, studentId: string): VehicleReservation {
    // Xử lý hết hạn trước (giống reserve/unlock) để lượt đã quá hạn nhưng chưa tới tick không bị "hủy" nhầm.
    this.expireReservations(useStore.getState().clock.now);
    const state = useStore.getState();
    const reservation = state.vehicleReservations.find(
      (item) => item.reservationId === reservationId,
    );

    if (!reservation) throw new Error("Không tìm thấy lượt đặt xe.");
    if (reservation.studentId !== studentId) {
      throw new Error("Bạn không có quyền hủy lượt đặt xe này.");
    }
    if (reservation.status === ReservationStatus.EXPIRED) {
      throw new Error("Lượt đặt xe đã hết hạn.");
    }
    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new Error("Chỉ có thể hủy lượt đặt xe đang chờ nhận.");
    }
    const cancelled: VehicleReservation = {
      ...reservation,
      status: ReservationStatus.CANCELLED,
    };
    state.upsertVehicleReservation(cancelled);
    const vehicle = useStore.getState().vehicles.find(
      (item) => item.vehicleId === reservation.vehicleId,
    );
    if (vehicle?.status === VehicleStatus.RESERVED) {
      state.updateVehicle(reservation.vehicleId, { status: VehicleStatus.AVAILABLE });
    }
    notify(studentId, `Đã hủy đặt xe ${reservation.vehicleId} thành công.`);
    return cancelled;
  },

  // UC04: Nhận xe từ một lượt đặt còn hiệu lực.
  unlockVehicle(reservationId: string, studentId: string): Trip {
    const now = useStore.getState().clock.now;
    this.expireReservations(now);
    const state = useStore.getState();
    const reservation = state.vehicleReservations.find(
      (item) => item.reservationId === reservationId,
    );

    if (!reservation) throw new Error("Không tìm thấy lượt đặt xe.");
    // Chỉ chủ lượt đặt mới được nhận xe (giống cancelReservation).
    if (reservation.studentId !== studentId) {
      throw new Error("Bạn không có quyền nhận xe của lượt đặt này.");
    }
    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new Error("Lượt đặt xe không còn hiệu lực.");
    }

    if (new Date(reservation.expiresAt).getTime() <= now) {
      state.upsertVehicleReservation({ ...reservation, status: ReservationStatus.EXPIRED });
      const currentVehicle = useStore.getState().vehicles.find(
        (item) => item.vehicleId === reservation.vehicleId,
      );
      if (currentVehicle?.status === VehicleStatus.RESERVED) {
        state.updateVehicle(reservation.vehicleId, { status: VehicleStatus.AVAILABLE });
      }
      throw new Error("Lượt đặt xe đã hết hạn.");
    }

    const vehicle = state.vehicles.find((item) => item.vehicleId === reservation.vehicleId);
    if (!vehicle || vehicle.status === VehicleStatus.FAULTY) {
      throw new Error("Xe không tồn tại hoặc đang bị lỗi.");
    }
    if (vehicle.status !== VehicleStatus.RESERVED) {
      throw new Error("Xe không còn ở trạng thái chờ nhận.");
    }

    if (state.trips.some((trip) =>
      trip.status === TripStatus.ONGOING &&
      (trip.studentId === reservation.studentId || trip.vehicleId === reservation.vehicleId)
    )) {
      throw new Error("Sinh viên hoặc xe đang có chuyến đi chưa kết thúc.");
    }

    const trip: Trip = {
      tripId: `TR-${crypto.randomUUID()}`,
      studentId: reservation.studentId,
      vehicleId: reservation.vehicleId,
      startTime: new Date(now).toISOString(),
      endTime: null,
      status: TripStatus.ONGOING,
      fromHubId: vehicle.currentHubId,
    };

    state.upsertVehicleReservation({ ...reservation, status: ReservationStatus.CONFIRMED });
    state.upsertTrip(trip);
    state.updateVehicle(vehicle.vehicleId, { status: VehicleStatus.IN_USE });
    // Xe rời Hub nên giải phóng đúng chỗ đỗ của nó (xe đang chạy không chiếm slot).
    ParkingService.releaseSlot(vehicle.currentHubId, vehicle.vehicleId);
    notify(reservation.studentId, `Nhận xe ${vehicle.vehicleId} thành công. Chuyến đi đã bắt đầu.`);
    return trip;
  },
  // UC06: Trả xe tại Hub được chọn.
  returnVehicle(tripId: string, hubId: string): Trip {
    const state = useStore.getState();
    const trip = state.trips.find((item) => item.tripId === tripId);
    if (!trip) throw new Error("Không tìm thấy chuyến đi.");
    if (trip.studentId !== state.currentUser.userId || state.currentUser.role !== "STUDENT") {
      throw new Error("Bạn không có quyền trả chuyến đi này.");
    }
    if (trip.status !== TripStatus.ONGOING) {
      throw new Error("Chỉ có thể trả xe của chuyến đang diễn ra.");
    }

    const vehicle = state.vehicles.find((item) => item.vehicleId === trip.vehicleId);
    if (!vehicle) throw new Error("Không tìm thấy phương tiện của chuyến đi.");
    if (vehicle.status !== VehicleStatus.IN_USE) {
      throw new Error("Xe không ở trạng thái đang sử dụng.");
    }
    const hub = state.hubs.find((item) => item.hubId === hubId);
    if (!hub) throw new Error("Hub trả xe không tồn tại.");

    // Hub bảo trì / ngưng hoạt động / đang tạm khóa nhận xe (quá tải) thì không nhận xe trả.
    const intakeBlocker = getHubIntakeBlocker(hubId);
    if (intakeBlocker) throw new Error(intakeBlocker);

    if (!ParkingService.hasFreeSlot(hubId)) {
      throw new Error(`Hub ${hub.name} đã hết chỗ đỗ. Vui lòng chọn Hub khác.`);
    }

    // Chiếm slot TRƯỚC khi đổi trạng thái chuyến đi / xe, để nếu hết chỗ thì không để dữ liệu nửa vời.
    // Gắn đúng vehicleId vào slot để trang Hub & chỗ đỗ và trang Phương tiện hiển thị khớp.
    if (ParkingService.occupySlot(hubId, vehicle.vehicleId) === null) {
      throw new Error(`Hub ${hub.name} đã hết chỗ đỗ. Vui lòng chọn Hub khác.`);
    }

    const endTime = new Date(state.clock.now).toISOString();
    const completed: Trip = { ...trip, endTime, status: TripStatus.COMPLETED, toHubId: hubId };

    // Giữ nhất quán dữ liệu giữa chuyến đi, xe và chỗ đỗ.
    state.upsertTrip(completed);
    state.updateVehicle(vehicle.vehicleId, {
      status: VehicleStatus.AVAILABLE,
      currentHubId: hubId,
    });
    notify(trip.studentId, `Trả xe ${trip.vehicleId} tại ${hub.name} thành công. Chuyến đi đã hoàn thành.`);
    return completed;
  },
};
