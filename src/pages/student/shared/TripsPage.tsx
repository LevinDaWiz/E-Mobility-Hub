import { useState } from "react";
import { Link } from "react-router-dom";
import { ReservationService } from "../../../services/reservationService";
import { useStore } from "../../../store";
import { ReservationStatus, SlotStatus, TripStatus, VehicleType } from "../../../types";

const typeLabels: Record<VehicleType, string> = {
  [VehicleType.E_BIKE]: "Xe đạp điện",
  [VehicleType.E_MOTORBIKE]: "Xe máy điện",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function durationLabel(start: string, end: string) {
  const elapsedMs = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  const minutes = Math.floor(elapsedMs / 60_000);
  return `${minutes} phút ${Math.floor((elapsedMs % 60_000) / 1000)} giây`;
}

// UC04 nhận xe và UC06 trả xe. Chỗ đỗ hiện dùng store M1 (tích hợp M3 sau).
export function TripsPage() {
  const currentUser = useStore((s) => s.currentUser);
  const reservations = useStore((s) => s.vehicleReservations);
  const trips = useStore((s) => s.trips);
  const vehicles = useStore((s) => s.vehicles);
  const hubs = useStore((s) => s.hubs);
  const parkingSlots = useStore((s) => s.parkingSlots);
  const now = useStore((s) => s.clock.now);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [returnHubId, setReturnHubId] = useState("");
  const [confirmReturn, setConfirmReturn] = useState(false);
  const [lastCompletedTripId, setLastCompletedTripId] = useState<string | null>(null);

  const mine = reservations.filter((r) => r.studentId === currentUser.userId);
  const active = mine.find((r) => r.status === ReservationStatus.ACTIVE);
  const activeTrip = trips.find(
    (t) => t.studentId === currentUser.userId && t.status === TripStatus.ONGOING,
  );
  const tripHistory = trips.filter(
    (t) => t.studentId === currentUser.userId && t.status === TripStatus.COMPLETED,
  );
  const secondsLeft = active
    ? Math.max(0, Math.ceil((new Date(active.expiresAt).getTime() - now) / 1000))
    : 0;
  const expired = !!active && secondsLeft === 0;
  const vehicle = active
    ? vehicles.find((v) => v.vehicleId === active.vehicleId)
    : undefined;
  const hub = vehicle ? hubs.find((h) => h.hubId === vehicle.currentHubId) : undefined;
  const currentTripVehicle = activeTrip
    ? vehicles.find((v) => v.vehicleId === activeTrip.vehicleId)
    : undefined;
  const lastCompletedTrip = lastCompletedTripId
    ? tripHistory.find((t) => t.tripId === lastCompletedTripId)
    : undefined;
  const lastReturnHub = lastCompletedTrip
    ? hubs.find((h) => h.hubId === vehicles.find((v) => v.vehicleId === lastCompletedTrip.vehicleId)?.currentHubId)
    : undefined;

  const hubOptions = hubs.map((item) => ({
    ...item,
    freeCount: parkingSlots.filter(
      (slot) => slot.hubId === item.hubId && slot.status === SlotStatus.FREE,
    ).length,
  }));
  const selectedHub = hubOptions.find((item) => item.hubId === returnHubId);

  function unlock() {
    if (!active) return;
    setError("");
    setSuccess("");
    try {
      const trip = ReservationService.unlockVehicle(active.reservationId);
      setSuccess(`Đã nhận xe ${trip.vehicleId}. Chuyến đi đã bắt đầu!`);
      setConfirmId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể nhận xe.");
      setConfirmId(null);
    }
  }

  function returnVehicle() {
    if (!activeTrip) return;
    setError("");
    setSuccess("");
    try {
      const completed = ReservationService.returnVehicle(activeTrip.tripId, returnHubId);
      setLastCompletedTripId(completed.tripId);
      setSuccess(`Trả xe ${completed.vehicleId} thành công tại ${selectedHub?.name ?? returnHubId}.`);
      setConfirmReturn(false);
      setReturnHubId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể trả xe.");
      setConfirmReturn(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-950">Chuyến đi của tôi</h1>
        <p className="mt-1 text-sm text-slate-600">Theo dõi lượt đặt, nhận xe và trả xe tại Hub phù hợp.</p>
      </header>

      {success && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {success}
          <button type="button" className="ml-3 underline" onClick={() => setSuccess("")}>Đóng</button>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {activeTrip ? (
        <section className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">ĐANG DI CHUYỂN</span>
          <h2 className="text-xl font-bold text-slate-900">Xe {activeTrip.vehicleId}</h2>
          <p className="text-sm text-slate-700">Loại: {currentTripVehicle ? typeLabels[currentTripVehicle.type] : "Không xác định"}</p>
          <p className="text-sm text-slate-700">Bắt đầu: {formatDate(activeTrip.startTime)}</p>
          <p className="text-sm text-slate-700">Thời gian đã đi: {durationLabel(activeTrip.startTime, new Date(now).toISOString())}</p>

          <label className="block text-sm font-semibold text-slate-900" htmlFor="return-hub">Chọn Hub trả xe</label>
          <select
            id="return-hub"
            value={returnHubId}
            onChange={(e) => { setReturnHubId(e.target.value); setError(""); }}
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm"
          >
            <option value="">-- Chọn Hub trả xe --</option>
            {hubOptions.map((option) => (
              <option key={option.hubId} value={option.hubId} disabled={option.freeCount === 0}>
                {option.name} — {option.freeCount} chỗ trống
              </option>
            ))}
          </select>
          {selectedHub && (
            <p className="rounded-lg bg-white p-3 text-sm text-slate-700">
              {selectedHub.name}: <strong>{selectedHub.freeCount} chỗ trống</strong>.
              {selectedHub.freeCount === 0 ? " Vui lòng chọn Hub khác." : " Bạn có thể trả xe tại đây."}
            </p>
          )}
          {hubOptions.every((item) => item.freeCount === 0) && (
            <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Tất cả Hub hiện đã đầy. Vui lòng thử lại khi có chỗ trống.
            </p>
          )}
          <button
            type="button"
            disabled={!selectedHub || selectedHub.freeCount === 0}
            onClick={() => { setError(""); setConfirmReturn(true); }}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            Trả xe tại Hub đã chọn
          </button>
        </section>
      ) : active ? (
        <section className="space-y-4 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-brand-950">Xe đang chờ nhận: {active.vehicleId}</h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">ĐÃ ĐẶT</span>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <p>Loại: <strong>{vehicle ? typeLabels[vehicle.type] : "Không xác định"}</strong></p>
            <p>Pin: <strong>{vehicle?.batteryLevel ?? "–"}%</strong></p>
            <p>Hub nhận: <strong>{hub?.name ?? vehicle?.currentHubId ?? "Không xác định"}</strong></p>
            <p>Hết hạn: <strong>{formatDate(active.expiresAt)}</strong></p>
          </div>
          <p className={`rounded-lg p-3 text-sm font-semibold ${expired ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-900"}`}>
            {expired ? "Lượt đặt đã quá thời gian nhận xe." : `Còn ${secondsLeft} giây mô phỏng để nhận xe.`}
          </p>
          <button
            type="button" disabled={expired} onClick={() => setConfirmId(active.reservationId)}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >Mở khóa / Nhận xe</button>
          <p className="text-xs text-slate-500">NIFR-01 tự động hết hạn sẽ được tích hợp sau UC06.</p>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Bạn chưa có chuyến đi đang hoạt động</h2>
          <p className="mt-2 text-sm text-slate-600">Hãy chọn một chiếc xe và đặt xe trước khi nhận.</p>
          <Link to="/app/shared" className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white">Tìm xe</Link>
        </section>
      )}

      {lastCompletedTrip && (
        <section role="status" className="space-y-2 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-emerald-800">Chuyến đi vừa hoàn thành</h2>
          <p className="text-sm">Xe: <strong>{lastCompletedTrip.vehicleId}</strong></p>
          <p className="text-sm">Hub trả: <strong>{lastReturnHub?.name ?? "Không xác định"}</strong></p>
          <p className="text-sm">Thời lượng: <strong>{durationLabel(lastCompletedTrip.startTime, lastCompletedTrip.endTime ?? lastCompletedTrip.startTime)}</strong></p>
          {vehicles.find((v) => v.vehicleId === lastCompletedTrip.vehicleId)?.batteryLevel !== undefined &&
            (vehicles.find((v) => v.vehicleId === lastCompletedTrip.vehicleId)?.batteryLevel ?? 100) < 30 && (
            <p className="text-sm text-amber-700">Pin xe thấp, bạn có thể đăng ký sạc sau khi trả xe.</p>
          )}
          <Link to="/app/charging/new" className="inline-block rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-800">Đăng ký sạc (UC05)</Link>
        </section>
      )}

      {tripHistory.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-950">Chuyến đi đã hoàn thành</h2>
          {tripHistory.map((trip) => (
            <article key={trip.tripId} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{trip.vehicleId}</p>
              <p>Khởi hành: {formatDate(trip.startTime)}</p>
              {trip.endTime && <p>Kết thúc: {formatDate(trip.endTime)}</p>}
              {trip.endTime && <p>Thời lượng: {durationLabel(trip.startTime, trip.endTime)}</p>}
            </article>
          ))}
        </section>
      )}

      {confirmId && active && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setConfirmId(null)}>
          <section role="dialog" aria-modal="true" aria-label="Xác nhận nhận xe" onMouseDown={(e) => e.stopPropagation()} className="max-h-[calc(100dvh-32px)] w-full max-w-[360px] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Xác nhận nhận xe</h2>
            <p className="mt-2 text-sm text-slate-700">Mở khóa giả lập xe <strong>{active.vehicleId}</strong> và bắt đầu chuyến đi?</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirmId(null)} className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2.5">Quay lại</button>
              <button type="button" onClick={unlock} className="min-w-0 flex-1 rounded-lg bg-emerald-700 p-2.5 font-semibold text-white">Xác nhận</button>
            </div>
          </section>
        </div>
      )}

      {confirmReturn && activeTrip && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setConfirmReturn(false)}>
          <section role="dialog" aria-modal="true" aria-label="Xác nhận trả xe" onMouseDown={(e) => e.stopPropagation()} className="max-h-[calc(100dvh-32px)] w-full max-w-[360px] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Xác nhận trả xe</h2>
            <p className="mt-2 text-sm text-slate-700">Trả xe <strong>{activeTrip.vehicleId}</strong> tại <strong>{selectedHub?.name ?? "Hub đã chọn"}</strong>?</p>
            <p className="mt-2 text-xs text-slate-500">Việc này sẽ kết thúc chuyến đi và cập nhật trạng thái xe.</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirmReturn(false)} className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2.5">Quay lại</button>
              <button type="button" onClick={returnVehicle} className="min-w-0 flex-1 rounded-lg bg-emerald-700 p-2.5 font-semibold text-white">Xác nhận</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
