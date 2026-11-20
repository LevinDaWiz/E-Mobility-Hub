import { useStore } from "../store";
import {
  ReservationStatus,
  TripStatus,
  VehicleStatus,
  SlotStatus,
  type Trip,
  type VehicleReservation,
  type AppNotification,
} from "../types";

// Thời hạn demo: 30 giây theo đồng hồ mô phỏng của M1.
// Khi tích hợp NIFR-01, thống nhất hằng số này với cấu hình chung.
export const RESERVATION_DEMO_MS = 30_000;

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
      expiresAt: new Date(now + RESERVATION_DEMO_MS).toISOString(),
      status: ReservationStatus.ACTIVE,
    };

    state.upsertVehicleReservation(reservation);
    state.updateVehicle(vehicleId, { status: VehicleStatus.RESERVED });
    notify(studentId, `Đặt xe ${vehicleId} thành công. Hãy đến nhận xe trước khi hết hạn.`);
    return reservation;
  },


  // UC03: Hủy lượt đặt xe đang ACTIVE (chủ lượt đặt mới được hủy).
  cancelReservation(reservationId: string, studentId: string): VehicleReservation {
    const state = useStore.getState();
    const reservation = state.vehicleReservations.find(
      (item) => item.reservationId === reservationId,
    );

    if (!reservation) throw new Error("Không tìm thấy lượt đặt xe.");
    if (reservation.studentId !== studentId) {
      throw new Error("Bạn không có quyền hủy lượt đặt xe này.");
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
  unlockVehicle(reservationId: string): Trip {
    const now = useStore.getState().clock.now;
    this.expireReservations(now);
    const state = useStore.getState();
    const reservation = state.vehicleReservations.find(
      (item) => item.reservationId === reservationId,
    );

    if (!reservation) throw new Error("Không tìm thấy lượt đặt xe.");
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
    };

    state.upsertVehicleReservation({ ...reservation, status: ReservationStatus.CONFIRMED });
    state.upsertTrip(trip);
    state.updateVehicle(vehicle.vehicleId, { status: VehicleStatus.IN_USE });
    notify(reservation.studentId, `Nhận xe ${vehicle.vehicleId} thành công. Chuyến đi đã bắt đầu.`);
    return trip;
  },
  // UC06: Trả xe tại Hub được chọn.
  // Tạm dùng parkingSlots + updateParkingSlot của M1 vì chưa có mã ParkingService của M3.
  // Khi M3 hoàn thành, thay phần kiểm tra/chiếm chỗ bằng ParkingService.hasFreeSlot/occupySlot.
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

    const freeSlot = state.parkingSlots.find(
      (slot) => slot.hubId === hubId && slot.status === SlotStatus.FREE,
    );
    if (!freeSlot) {
      throw new Error(`Hub ${hub.name} đã hết chỗ đỗ. Vui lòng chọn Hub khác.`);
    }

    const endTime = new Date(state.clock.now).toISOString();
    const completed: Trip = { ...trip, endTime, status: TripStatus.COMPLETED };

    // Giữ nhất quán dữ liệu giữa chuyến đi, xe và chỗ đỗ.
    state.upsertTrip(completed);
    state.updateVehicle(vehicle.vehicleId, {
      status: VehicleStatus.AVAILABLE,
      currentHubId: hubId,
    });
    state.updateParkingSlot(freeSlot.slotId, { status: SlotStatus.OCCUPIED });
    notify(trip.studentId, `Trả xe ${trip.vehicleId} tại ${hub.name} thành công. Chuyến đi đã hoàn thành.`);
    return completed;
  },
};
