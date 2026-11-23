import { useStore } from "../../../store";
import { ReservationStatus, RequestStatus, SessionStatus, TripStatus, VehicleStatus } from "../../../types";

// ===== M3: nhãn & hook dùng chung cho các trang sinh viên M3 =====

export const SESSION_LABELS: Record<SessionStatus, string> = {
  [SessionStatus.SCHEDULED]: "Đã xếp lịch",
  [SessionStatus.CHARGING]: "Đang sạc",
  [SessionStatus.COMPLETED]: "Hoàn tất",
  [SessionStatus.INTERRUPTED]: "Gián đoạn",
  [SessionStatus.CANCELLED]: "Đã huỷ",
};

export const REQUEST_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: "Chờ xếp lịch",
  [RequestStatus.SCHEDULED]: "Đã xếp lịch",
  [RequestStatus.COMPLETED]: "Hoàn tất",
  [RequestStatus.CANCELLED]: "Đã huỷ",
  [RequestStatus.REJECTED]: "Bị từ chối",
};

export const PARKING_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.ACTIVE]: "Đang giữ chỗ",
  [ReservationStatus.CONFIRMED]: "Đã đến",
  [ReservationStatus.EXPIRED]: "Hết hạn",
  [ReservationStatus.CANCELLED]: "Đã huỷ",
};

export const fmtTime = (iso: string | number) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

export const fmtMinutes = (ms: number) => {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `${min} phút`;
  return min % 60 === 0 ? `${min / 60} giờ` : `${Math.floor(min / 60)} giờ ${min % 60} phút`;
};

export const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export const inputClass = "w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

// Xe sinh viên có thể đăng ký sạc: xe cá nhân + xe dùng chung vừa trả (chuyến hoàn tất gần đây, xe còn đỗ và rảnh).
export function useChargeableVehicles() {
  const userId = useStore((s) => s.currentUser.userId);
  const personal = useStore((s) => s.personalVehicles);
  const trips = useStore((s) => s.trips);
  const vehicles = useStore((s) => s.vehicles);

  const mine = personal.filter((v) => v.ownerId === userId);
  const recentShared = trips
    .filter((t) => t.studentId === userId && t.status === TripStatus.COMPLETED)
    .sort((a, b) => (b.endTime ?? "").localeCompare(a.endTime ?? ""))
    .slice(0, 3)
    .map((t) => vehicles.find((v) => v.vehicleId === t.vehicleId))
    .filter((v): v is NonNullable<typeof v> => !!v && v.status === VehicleStatus.AVAILABLE && v.batteryLevel < 100);
  const shared = [...new Map(recentShared.map((v) => [v.vehicleId, v])).values()];
  return { userId, personal: mine, shared };
}
