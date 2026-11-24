import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, Countdown, Modal, Progress } from "../../../components/ui";
import { ParkingService } from "../../../services/parkingService";
import { useStore } from "../../../store";
import { utilizationBarClass } from "../../../styles/statusColors";
import { ReservationStatus, type HubNeed, type HubSortKey } from "../../../types";
import { PARKING_LABELS, errorText, fmtTime, inputClass } from "./shared";

const NEED_LABELS: Record<HubNeed, string> = { PARKING: "Chỗ đỗ", CHARGING: "Cổng sạc", BOTH: "Cả hai" };
const SORT_LABELS: Record<HubSortKey, string> = { DISTANCE: "Gần nhất", FREE_SLOTS: "Nhiều chỗ trống", CHARGE_WAIT: "Chờ sạc ít nhất" };
const ARRIVE_OPTIONS = [0, 15, 30, 60];

// UC07 (tìm Hub có chỗ đỗ / cổng sạc) + UC08 (đặt chỗ đỗ có đếm ngược, hết hạn NIFR-01).
export function ParkingPage() {
  const userId = useStore((s) => s.currentUser.userId);
  const hubs = useStore((s) => s.hubs);
  const now = useStore((s) => s.clock.now);
  const personalVehicles = useStore((s) => s.personalVehicles);
  const reservations = useStore((s) => s.parkingReservations);
  // Đăng ký theo dõi để kết quả tìm kiếm (tính qua getState) cập nhật khi slot / cổng / phiên sạc đổi.
  useStore((s) => s.parkingSlots);
  useStore((s) => s.chargingPorts);
  useStore((s) => s.chargingSessions);
  useStore((s) => s.intakeLocks);

  const [need, setNeed] = useState<HubNeed>("PARKING");
  const [sortBy, setSortBy] = useState<HubSortKey>("DISTANCE");
  const [fromArea, setFromArea] = useState<string>("");
  const [arriveIn, setArriveIn] = useState(0);
  const [reserveHubId, setReserveHubId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const myVehicles = personalVehicles.filter((v) => v.ownerId === userId);
  const mine = reservations.filter((r) => r.studentId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = mine.filter((r) => r.status === ReservationStatus.ACTIVE || (r.status === ReservationStatus.CONFIRMED && !r.endedAt));
  const history = mine.filter((r) => !open.includes(r)).slice(0, 5);

  const results = ParkingService.findHubsWithCapacity({
    need,
    sortBy,
    fromArea: fromArea || null,
    arriveAt: new Date(now + arriveIn * 60_000).toISOString(),
  });
  const areas = [...new Set(hubs.map((h) => h.area))];

  const run = (fn: () => void, okText: string) => {
    try {
      fn();
      setMessage({ ok: true, text: okText });
    } catch (e) {
      setMessage({ ok: false, text: errorText(e, "Thao tác không thành công.") });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-950">Đặt chỗ đỗ</h1>
        <p className="text-sm text-slate-500">Tìm Hub còn chỗ đỗ / cổng sạc cho xe cá nhân và giữ chỗ trước.</p>
      </div>

      {message && (
        <p className={`rounded-lg p-3 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} role="status">
          {message.text}
        </p>
      )}

      {open.map((r) => {
        const hub = hubs.find((h) => h.hubId === r.hubId);
        const vehicle = personalVehicles.find((v) => v.vehicleId === r.vehicleId);
        return (
          <Card key={r.reservationId} title={hub?.name ?? r.hubId} actions={<Badge value={r.status} label={PARKING_LABELS[r.status]} />}>
            <p className="text-sm text-slate-700">
              Chỗ <strong>{r.slotId}</strong> · {vehicle?.model ?? r.vehicleId}
            </p>
            {r.status === ReservationStatus.ACTIVE ? (
              <>
                <p className="mt-2 text-sm text-slate-600">
                  Giữ chỗ còn: <Countdown expiresAt={r.expiresAt} />
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => run(() => ParkingService.checkIn(r.reservationId), "Đã nhận chỗ đỗ.")}>
                    Tôi đã đến
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => run(() => ParkingService.cancelParkingReservation(r.reservationId), "Đã huỷ giữ chỗ.")}>
                    Huỷ giữ chỗ
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-slate-600">Đang đỗ từ {fmtTime(r.checkedInAt ?? r.createdAt)} (dự kiến {r.durationMin} phút).</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => run(() => ParkingService.endParking(r.reservationId), "Đã kết thúc đỗ xe.")}>
                    Lấy xe / kết thúc đỗ
                  </Button>
                  <Link
                    to={`/app/charging/new?hub=${r.hubId}&vehicle=${r.vehicleId}`}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200"
                  >
                    Đăng ký sạc tại Hub này
                  </Link>
                </div>
              </>
            )}
          </Card>
        );
      })}

      <Card title="Tìm Hub">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="col-span-2 flex flex-col gap-1">
            <span className="font-medium text-slate-700">Cần</span>
            <div className="flex gap-1">
              {(Object.keys(NEED_LABELS) as HubNeed[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setNeed(k)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ring-1 ${need === k ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-slate-700 ring-slate-300"}`}
                >
                  {NEED_LABELS[k]}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-700">Bạn đang ở</span>
            <select className={inputClass} value={fromArea} onChange={(e) => setFromArea(e.target.value)}>
              <option value="">Vị trí hiện tại</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-700">Đến sau</span>
            <select className={inputClass} value={arriveIn} onChange={(e) => setArriveIn(Number(e.target.value))}>
              {ARRIVE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? "Ngay bây giờ" : `${m} phút`}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <span className="font-medium text-slate-700">Sắp xếp</span>
            <select className={inputClass} value={sortBy} onChange={(e) => setSortBy(e.target.value as HubSortKey)}>
              {(Object.keys(SORT_LABELS) as HubSortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="space-y-3">
        {results.map(({ hub, stats, freePersonalSlots, distanceKm, chargeWaitMin, blocker, available }) => (
          <Card
            key={hub.hubId}
            title={hub.name}
            className={available ? "" : "opacity-70"}
            actions={<span className="text-xs text-slate-500">{distanceKm} km</span>}
          >
            <Progress
              value={stats.utilization * 100}
              label={`Chỗ đỗ đã dùng: ${stats.occupiedSlots + stats.reservedSlots}/${stats.totalSlots}`}
              barClassName={utilizationBarClass(stats.utilization, hub.thresholds.overload, hub.thresholds.parkingWarning)}
            />
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-slate-50 py-2">
                <dd className="text-base font-semibold text-slate-900">{stats.freeSlots}</dd>
                <dt className="text-slate-500">Chỗ trống ({freePersonalSlots} cá nhân)</dt>
              </div>
              <div className="rounded-md bg-slate-50 py-2">
                <dd className="text-base font-semibold text-slate-900">
                  {stats.freePorts}/{stats.totalPorts}
                </dd>
                <dt className="text-slate-500">Cổng sạc trống</dt>
              </div>
              <div className="rounded-md bg-slate-50 py-2">
                <dd className="text-base font-semibold text-slate-900">{chargeWaitMin === null ? "—" : chargeWaitMin === 0 ? "0" : chargeWaitMin}</dd>
                <dt className="text-slate-500">Phút chờ sạc</dt>
              </div>
            </dl>
            {blocker && <p className="mt-2 text-xs text-rose-700">{blocker}</p>}
            <div className="mt-3 flex gap-2">
              <Button size="sm" disabled={!!blocker || stats.freeSlots === 0 || myVehicles.length === 0} onClick={() => setReserveHubId(hub.hubId)}>
                {stats.freeSlots === 0 ? "Hết chỗ" : "Đặt chỗ đỗ"}
              </Button>
              <Link
                to={`/app/charging/new?hub=${hub.hubId}`}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${chargeWaitMin === null ? "pointer-events-none text-slate-400 ring-slate-200" : "text-brand-700 ring-brand-200"}`}
              >
                Đăng ký lịch sạc
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {history.length > 0 && (
        <Card title="Lịch sử giữ chỗ">
          <ul className="divide-y divide-slate-100 text-sm">
            {history.map((r) => (
              <li key={r.reservationId} className="flex items-center justify-between py-2">
                <span>
                  {hubs.find((h) => h.hubId === r.hubId)?.name ?? r.hubId} · {r.slotId}
                  <span className="block text-xs text-slate-500">{fmtTime(r.createdAt)}</span>
                </span>
                <Badge value={r.endedAt && r.status === ReservationStatus.CONFIRMED ? "COMPLETED" : r.status} label={r.endedAt && r.status === ReservationStatus.CONFIRMED ? "Đã rời Hub" : PARKING_LABELS[r.status]} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {reserveHubId && (
        <ReserveModal
          hubId={reserveHubId}
          onClose={() => setReserveHubId(null)}
          onDone={(text, ok) => {
            setMessage({ ok, text });
            if (ok) setReserveHubId(null);
          }}
        />
      )}
    </div>
  );
}

function ReserveModal({ hubId, onClose, onDone }: { hubId: string; onClose: () => void; onDone: (text: string, ok: boolean) => void }) {
  const userId = useStore((s) => s.currentUser.userId);
  const hub = useStore((s) => s.hubs.find((h) => h.hubId === hubId));
  const ttlMs = useStore((s) => s.settings.parkingReservationMs);
  const all = useStore((s) => s.personalVehicles);
  const vehicles = all.filter((v) => v.ownerId === userId);
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.vehicleId ?? "");
  const [duration, setDuration] = useState(60);

  const submit = () => {
    try {
      const r = ParkingService.reserveParking(userId, hubId, vehicleId, duration);
      onDone(`Đã giữ chỗ ${r.slotId} tại ${hub?.name}. Hãy đến trước ${fmtTime(r.expiresAt)}.`, true);
    } catch (e) {
      onDone(errorText(e, "Không thể đặt chỗ."), false);
      onClose();
    }
  };

  return (
    <Modal
      open
      title={`Đặt chỗ đỗ – ${hub?.name ?? hubId}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={submit} disabled={!vehicleId}>
            Xác nhận giữ chỗ
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-slate-700">Xe</span>
          <select className={inputClass} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => (
              <option key={v.vehicleId} value={v.vehicleId}>
                {v.model} – {v.plateNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium text-slate-700">Thời gian đỗ dự kiến</span>
          <select className={inputClass} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[30, 60, 120, 240].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} phút` : `${m / 60} giờ`}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500">
          Chỗ được giữ trong {Math.round(ttlMs / 1000)} giây (giờ mô phỏng). Quá hạn chưa đến, chỗ sẽ tự giải phóng.
        </p>
      </div>
    </Modal>
  );
}
