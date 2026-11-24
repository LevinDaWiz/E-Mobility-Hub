import { Link } from "react-router-dom";
import { Badge, Card, Progress } from "../../../components/ui";
import { LOW_BATTERY_THRESHOLD } from "../../../config/constants";
import { useStore } from "../../../store";
import { PortKind, ReservationStatus, SessionStatus, VehicleType } from "../../../types";
import { PARKING_LABELS, SESSION_LABELS, fmtTime } from "./shared";

const TYPE_LABELS: Record<VehicleType, string> = {
  [VehicleType.E_BIKE]: "Xe đạp điện",
  [VehicleType.E_MOTORBIKE]: "Xe máy điện",
};

// Xe cá nhân đã đăng ký: pin (dữ liệu IoT), trạng thái sạc và chỗ đỗ hiện tại.
export function PersonalVehiclesPage() {
  const userId = useStore((s) => s.currentUser.userId);
  const all = useStore((s) => s.personalVehicles);
  const sessions = useStore((s) => s.chargingSessions);
  const reservations = useStore((s) => s.parkingReservations);
  const hubs = useStore((s) => s.hubs);
  const vehicles = all.filter((v) => v.ownerId === userId);
  const hubName = (id: string) => hubs.find((h) => h.hubId === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-950">Xe cá nhân & trạng thái pin</h1>
        <p className="text-sm text-slate-500">Thông tin xe đã đăng ký và dữ liệu pin cập nhật từ IoT.</p>
      </div>

      {vehicles.length === 0 && (
        <Card>
          <p className="text-sm text-slate-600">Bạn chưa đăng ký xe cá nhân nào.</p>
        </Card>
      )}

      {vehicles.map((v) => {
        const session = sessions.find(
          (cs) => cs.vehicleId === v.vehicleId && (cs.status === SessionStatus.CHARGING || cs.status === SessionStatus.SCHEDULED),
        );
        const parking = reservations.find(
          (r) => r.vehicleId === v.vehicleId && (r.status === ReservationStatus.ACTIVE || (r.status === ReservationStatus.CONFIRMED && !r.endedAt)),
        );
        const low = v.batteryLevel <= LOW_BATTERY_THRESHOLD;
        return (
          <Card key={v.vehicleId} title={v.model} actions={session && <Badge value={session.status} label={SESSION_LABELS[session.status]} />}>
            <p className="text-xs text-slate-500">
              {TYPE_LABELS[v.type]} · {v.plateNumber} · {v.batteryCapacityKwh} kWh · cổng {v.portKind === PortKind.FAST ? "nhanh + thường" : "thường"}
            </p>
            <div className="mt-3">
              <Progress
                value={v.batteryLevel}
                label={`Pin (cập nhật ${fmtTime(v.batteryUpdatedAt)})`}
                barClassName={low ? "bg-rose-500" : v.batteryLevel < 50 ? "bg-amber-500" : "bg-emerald-500"}
              />
            </div>
            {low && !session && <p className="mt-2 text-xs font-semibold text-rose-700">Pin thấp – nên đăng ký sạc.</p>}
            {parking && (
              <p className="mt-2 text-xs text-slate-600">
                Chỗ đỗ: {hubName(parking.hubId)} · {parking.slotId} ({PARKING_LABELS[parking.status]})
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              {session ? (
                <Link to="/app/charging" className="rounded-lg px-2.5 py-1 text-brand-700 ring-1 ring-brand-200">
                  Xem tiến độ sạc
                </Link>
              ) : (
                <Link to={`/app/charging/new?vehicle=${v.vehicleId}${parking ? `&hub=${parking.hubId}` : ""}`} className="rounded-lg bg-brand-700 px-2.5 py-1 text-white">
                  Đăng ký sạc
                </Link>
              )}
              {!parking && (
                <Link to="/app/parking" className="rounded-lg px-2.5 py-1 text-brand-700 ring-1 ring-brand-200">
                  Đặt chỗ đỗ
                </Link>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
