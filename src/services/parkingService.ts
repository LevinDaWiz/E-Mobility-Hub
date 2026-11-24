import { resolveHubPins } from "../config/mapPositions";
import { findOptions } from "../engine/chargingScheduler";
import { useStore } from "../store";
import {
  AlertSeverity,
  PortKind,
  ReservationStatus,
  SlotKind,
  SlotStatus,
  type Hub,
  type HubSearchCriteria,
  type ParkingReservation,
} from "../types";
import { getHubIntakeBlocker } from "../utils/hubAvailability";
import { computeHubStats, type HubStats } from "../utils/hubStats";
import { makeId } from "../utils/id";
import { simNowIso } from "../utils/time";
import { notify } from "./notificationService";
import { OperationsService } from "./operationsService";
import { getSettings } from "./settingsService";

// ===== M3 sở hữu file này: tìm Hub & đặt chỗ đỗ xe cá nhân (UC07, UC08, NIFR-01) =====
// hasFreeSlot / occupySlot / releaseSlot là hợp đồng với M2 (trả xe dùng chung UC06), đừng đổi chữ ký.
// Slot MAINTENANCE / RESERVED không được coi là trống.
// Vòng đời đặt chỗ: ACTIVE (giữ chỗ, đếm ngược) → CONFIRMED (đã đến, check-in) → endedAt (rời Hub);
// hoặc EXPIRED (hết hạn chưa đến) / CANCELLED. Slot: FREE → RESERVED → OCCUPIED → FREE.

const state = () => useStore.getState();
const KM_PER_MAP_PERCENT = 0.05; // bản đồ minh hoạ: 100% chiều ngang ≈ 5 km

export interface HubCapacity {
  hub: Hub;
  stats: HubStats;
  freePersonalSlots: number;
  distanceKm: number;
  // Số phút chờ tới khi có cổng sạc rảnh tính từ giờ đến (0 = có cổng ngay); null = Hub không có cổng dùng được.
  chargeWaitMin: number | null;
  blocker: string | null; // lý do Hub không nhận xe (bảo trì, tạm khóa do quá tải)
  available: boolean; // còn đáp ứng nhu cầu đã chọn
}

function isOpen(r: ParkingReservation): boolean {
  return r.status === ReservationStatus.ACTIVE || (r.status === ReservationStatus.CONFIRMED && r.endedAt === null);
}

function hubName(hubId: string): string {
  return state().hubs.find((h) => h.hubId === hubId)?.name ?? hubId;
}

export const ParkingService = {
  hasFreeSlot(hubId: string): boolean {
    return state().parkingSlots.some((s) => s.hubId === hubId && s.status === SlotStatus.FREE);
  },

  // Chiếm một slot trống; trả slotId, hoặc null nếu Hub đầy. Truyền vehicleId (xe dùng chung) để trang
  // Hub & chỗ đỗ hiện đúng xe đang đỗ; khi đó ưu tiên slot loại SHARED.
  occupySlot(hubId: string, vehicleId?: string): string | null {
    const store = state();
    const free = store.parkingSlots.filter((s) => s.hubId === hubId && s.status === SlotStatus.FREE);
    const slot = (vehicleId ? free.find((s) => s.kind === SlotKind.SHARED) : undefined) ?? free[0];
    if (!slot) return null;
    store.updateParkingSlot(slot.slotId, { status: SlotStatus.OCCUPIED, vehicleId: vehicleId ?? null });
    return slot.slotId;
  },

  // Giải phóng slot khi xe rời Hub: đúng slot của vehicleId nếu có, nếu không lấy slot không gắn xe.
  // Không đụng tới slot đang giữ cho một lượt đặt chỗ đỗ còn mở (xe cá nhân đã check-in).
  releaseSlot(hubId: string, vehicleId?: string): boolean {
    const store = state();
    const held = new Set(store.parkingReservations.filter(isOpen).map((r) => r.slotId));
    const occupied = store.parkingSlots.filter((s) => s.hubId === hubId && s.status === SlotStatus.OCCUPIED);
    const slot = vehicleId
      ? occupied.find((s) => s.vehicleId === vehicleId)
      : (occupied.find((s) => s.vehicleId === null && !held.has(s.slotId)) ?? occupied.find((s) => !held.has(s.slotId)));
    if (!slot) return false;
    store.updateParkingSlot(slot.slotId, { status: SlotStatus.FREE, vehicleId: null });
    return true;
  },

  // UC07: Hub kèm số chỗ trống, cổng trống, mức sử dụng, khoảng cách và thời gian chờ sạc.
  findHubsWithCapacity(c: HubSearchCriteria): HubCapacity[] {
    const s = state();
    const pins = resolveHubPins(s.hubs);
    const origin = (c.fromArea && Object.entries(pins).find(([id]) => s.hubs.find((h) => h.hubId === id)?.area === c.fromArea)?.[1]) || {
      x: 50,
      y: 50,
    };
    const arriveAt = Math.max(s.clock.now, new Date(c.arriveAt).getTime() || s.clock.now);
    // Xe giả định chỉ cần 1 phút sạc để đo "khi nào có cổng rảnh".
    const probe = { vehicleId: "", isShared: false, battery: 0, capacityKwh: 0, portKind: PortKind.FAST, fixedHubId: null, ownerId: null, label: "" };
    const probeOptions = findOptions({ target: probe, targetBattery: 1, from: arriveAt, deadline: Infinity });

    const results = s.hubs.map<HubCapacity>((hub) => {
      const stats = computeHubStats(s, hub.hubId);
      const pin = pins[hub.hubId];
      const firstPort = probeOptions.filter((o) => o.hubId === hub.hubId).sort((a, b) => a.start - b.start)[0];
      const freePersonalSlots = s.parkingSlots.filter(
        (x) => x.hubId === hub.hubId && x.status === SlotStatus.FREE && x.kind === SlotKind.PERSONAL,
      ).length;
      const blocker = getHubIntakeBlocker(hub.hubId);
      const chargeWaitMin = firstPort ? Math.max(0, Math.round((firstPort.start - arriveAt) / 60_000)) : null;
      const canPark = stats.freeSlots > 0;
      const canCharge = chargeWaitMin !== null;
      return {
        hub,
        stats,
        freePersonalSlots,
        distanceKm: pin ? Math.round(Math.hypot(pin.x - origin.x, pin.y - origin.y) * KM_PER_MAP_PERCENT * 10) / 10 : 0,
        chargeWaitMin,
        blocker,
        available:
          !blocker && (c.need === "PARKING" ? canPark : c.need === "CHARGING" ? canCharge : canPark && canCharge),
      };
    });

    const key = (r: HubCapacity) =>
      c.sortBy === "FREE_SLOTS" ? -r.stats.freeSlots : c.sortBy === "CHARGE_WAIT" ? (r.chargeWaitMin ?? 1e9) : r.distanceKm;
    return results.sort((a, b) => Number(b.available) - Number(a.available) || key(a) - key(b));
  },

  // Hub thay thế khi Hub đã đầy: còn chỗ, đang nhận xe, gần nhất.
  suggestAlternativeHubs(hubId: string, limit = 2): HubCapacity[] {
    const area = state().hubs.find((h) => h.hubId === hubId)?.area ?? null;
    return this.findHubsWithCapacity({ need: "PARKING", arriveAt: simNowIso(), fromArea: area, sortBy: "DISTANCE" })
      .filter((r) => r.hub.hubId !== hubId && r.available)
      .slice(0, limit);
  },

  // UC08: giữ một slot FREE (ưu tiên slot PERSONAL) cho xe cá nhân, hết hạn sau parkingReservationMs (Cài đặt).
  reserveParking(studentId: string, hubId: string, vehicleId: string, durationMin = 60): ParkingReservation {
    this.expireParkingReservations();
    const s = state();
    const vehicle = s.personalVehicles.find((v) => v.vehicleId === vehicleId);
    if (!vehicle || vehicle.ownerId !== studentId) throw new Error("Xe không thuộc tài khoản của bạn.");
    if (s.parkingReservations.some((r) => r.vehicleId === vehicleId && isOpen(r))) {
      throw new Error("Xe này đã có một lượt đặt chỗ đỗ đang mở.");
    }
    const blocker = getHubIntakeBlocker(hubId);
    if (blocker) throw new Error(blocker);

    const free = s.parkingSlots.filter((x) => x.hubId === hubId && x.status === SlotStatus.FREE);
    const slot = free.find((x) => x.kind === SlotKind.PERSONAL) ?? free[0];
    if (!slot) {
      const alt = this.suggestAlternativeHubs(hubId).map((r) => `${r.hub.name} (${r.stats.freeSlots} chỗ trống)`);
      throw new Error(`${hubName(hubId)} đã hết chỗ đỗ.${alt.length ? ` Gợi ý: ${alt.join(", ")}.` : ""}`);
    }

    const now = simNowIso();
    const expiresAt = new Date(s.clock.now + getSettings().parkingReservationMs).toISOString();
    const reservation: ParkingReservation = {
      reservationId: makeId("PR"),
      studentId,
      createdAt: now,
      expiresAt,
      arrivalTime: expiresAt,
      durationMin,
      checkedInAt: null,
      endedAt: null,
      status: ReservationStatus.ACTIVE,
      slotId: slot.slotId,
      hubId,
      vehicleId,
    };
    s.updateParkingSlot(slot.slotId, { status: SlotStatus.RESERVED, vehicleId: null, updatedAt: now });
    s.upsertParkingReservation(reservation);
    notify(studentId, `Đã giữ chỗ ${slot.slotId} tại ${hubName(hubId)}. Hãy đến trước khi hết hạn.`, "success");

    const stats = computeHubStats(state(), hubId);
    if (stats.freeSlots === 0) {
      OperationsService.raiseAlert(hubId, "PARKING_FULL", AlertSeverity.WARNING, `${hubName(hubId)} đã hết chỗ đỗ trống`);
    }
    return reservation;
  },

  cancelParkingReservation(reservationId: string): void {
    this.expireParkingReservations();
    const s = state();
    const r = s.parkingReservations.find((x) => x.reservationId === reservationId);
    if (!r) throw new Error("Không tìm thấy lượt đặt chỗ.");
    if (r.status !== ReservationStatus.ACTIVE) throw new Error("Chỉ huỷ được lượt đặt chỗ đang chờ đến.");
    s.upsertParkingReservation({ ...r, status: ReservationStatus.CANCELLED, endedAt: simNowIso() });
    freeSlot(r.slotId);
    notify(r.studentId, `Đã huỷ giữ chỗ ${r.slotId} tại ${hubName(r.hubId)}.`, "info");
  },

  // Sinh viên đến Hub (cảm biến / quét mã): RESERVED → OCCUPIED.
  checkIn(reservationId: string): void {
    this.expireParkingReservations();
    const s = state();
    const r = s.parkingReservations.find((x) => x.reservationId === reservationId);
    if (!r) throw new Error("Không tìm thấy lượt đặt chỗ.");
    if (r.status !== ReservationStatus.ACTIVE) throw new Error("Lượt đặt chỗ không còn hiệu lực.");
    const now = simNowIso();
    s.upsertParkingReservation({ ...r, status: ReservationStatus.CONFIRMED, checkedInAt: now });
    s.updateParkingSlot(r.slotId, { status: SlotStatus.OCCUPIED, vehicleId: null, updatedAt: now });
    notify(r.studentId, `Đã nhận chỗ ${r.slotId} tại ${hubName(r.hubId)}.`, "success");
  },

  // Xe rời Hub: OCCUPIED → FREE.
  endParking(reservationId: string): void {
    const s = state();
    const r = s.parkingReservations.find((x) => x.reservationId === reservationId);
    if (!r || r.status !== ReservationStatus.CONFIRMED || r.endedAt) throw new Error("Không có lượt đỗ đang diễn ra.");
    s.upsertParkingReservation({ ...r, endedAt: simNowIso() });
    freeSlot(r.slotId);
    notify(r.studentId, `Đã kết thúc đỗ xe tại ${hubName(r.hubId)}.`, "info");
  },

  // NIFR-01: lượt giữ chỗ ACTIVE quá hạn → EXPIRED, slot về FREE, báo sinh viên. Idempotent.
  expireParkingReservations(now: number = state().clock.now): number {
    const expired = state().parkingReservations.filter(
      (r) => r.status === ReservationStatus.ACTIVE && new Date(r.expiresAt).getTime() <= now,
    );
    for (const r of expired) {
      state().upsertParkingReservation({ ...r, status: ReservationStatus.EXPIRED });
      freeSlot(r.slotId);
      notify(r.studentId, `Lượt giữ chỗ ${r.slotId} tại ${hubName(r.hubId)} đã hết hạn. Chỗ đỗ đã được giải phóng.`, "warning");
    }
    return expired.length;
  },
};

function freeSlot(slotId: string): void {
  const slot = state().parkingSlots.find((x) => x.slotId === slotId);
  // Slot đã bị chuyển sang bảo trì trong lúc giữ thì để nguyên.
  if (slot && slot.status !== SlotStatus.MAINTENANCE) {
    state().updateParkingSlot(slotId, { status: SlotStatus.FREE, vehicleId: null, updatedAt: simNowIso() });
  }
}
