import { Link } from "react-router-dom";
import { useStore } from "../../../store";
import { ReservationStatus, TripStatus, VehicleType } from "../../../types";

const reservationLabels: Record<ReservationStatus, string> = {
  [ReservationStatus.ACTIVE]: "Đang giữ xe",
  [ReservationStatus.CONFIRMED]: "Đã nhận xe",
  [ReservationStatus.CANCELLED]: "Đã hủy",
  [ReservationStatus.EXPIRED]: "Hết hạn",
};

const reservationColors: Record<ReservationStatus, string> = {
  [ReservationStatus.ACTIVE]: "bg-amber-100 text-amber-800",
  [ReservationStatus.CONFIRMED]: "bg-blue-100 text-blue-800",
  [ReservationStatus.CANCELLED]: "bg-slate-100 text-slate-700",
  [ReservationStatus.EXPIRED]: "bg-rose-100 text-rose-700",
};

const tripColors: Record<TripStatus, string> = {
  [TripStatus.ONGOING]: "bg-blue-100 text-blue-800",
  [TripStatus.COMPLETED]: "bg-emerald-100 text-emerald-800",
};

const vehicleTypeLabels: Record<VehicleType, string> = {
  [VehicleType.E_BIKE]: "Xe đạp điện",
  [VehicleType.E_MOTORBIKE]: "Xe máy điện",
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

function duration(start: string, end: string | null): string {
  if (!end) return "Đang diễn ra";
  const elapsed = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "—";
  const minutes = Math.floor(elapsed / 60000);
  return `${minutes} phút ${Math.floor((elapsed % 60000) / 1000)} giây`;
}

// Lịch sử riêng của M2. Đọc Zustand trực tiếp, không chỉnh sửa dữ liệu trong trang này.
export function ActivityPage() {
  const userId = useStore((s) => s.currentUser.userId);
  const reservations = useStore((s) => s.vehicleReservations);
  const trips = useStore((s) => s.trips);
  const vehicles = useStore((s) => s.vehicles);
  const hubs = useStore((s) => s.hubs);

  const myReservations = reservations
    .filter((r) => r.studentId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const myTrips = trips
    .filter((t) => t.studentId === userId)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  function vehicleLabel(vehicleId: string): string {
    const vehicle = vehicles.find((v) => v.vehicleId === vehicleId);
    return vehicle ? vehicleTypeLabels[vehicle.type] : "Không rõ loại xe";
  }

  function currentHubName(vehicleId: string): string {
    const vehicle = vehicles.find((v) => v.vehicleId === vehicleId);
    const hub = hubs.find((h) => h.hubId === vehicle?.currentHubId);
    return hub?.name ?? "Chưa xác định";
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-950">Hoạt động xe dùng chung</h1>
        <p className="text-sm text-slate-600">Lịch sử đặt xe và chuyến đi của tài khoản hiện tại.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Lượt đặt xe</p>
          <p className="mt-1 text-2xl font-bold text-brand-950">{myReservations.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Chuyến đã hoàn thành</p>
          <p className="mt-1 text-2xl font-bold text-brand-950">
            {myTrips.filter((trip) => trip.status === TripStatus.COMPLETED).length}
          </p>
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="reservations-title">
        <h2 id="reservations-title" className="text-lg font-bold text-brand-950">Lịch sử đặt xe</h2>
        {myReservations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
            Bạn chưa có lượt đặt xe nào. <Link to="/app/shared" className="font-semibold text-brand-700 underline">Tìm xe ngay</Link>
          </div>
        ) : (
          myReservations.map((reservation) => (
            <article key={reservation.reservationId} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{reservation.vehicleId}</p>
                  <p className="text-xs text-slate-500">{vehicleLabel(reservation.vehicleId)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${reservationColors[reservation.status]}`}>
                  {reservationLabels[reservation.status]}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-1 text-sm text-slate-600 sm:grid-cols-2">
                <div><dt className="inline font-medium">Mã đặt: </dt><dd className="inline break-all">{reservation.reservationId}</dd></div>
                <div><dt className="inline font-medium">Tạo lúc: </dt><dd className="inline">{formatTime(reservation.createdAt)}</dd></div>
                <div><dt className="inline font-medium">Hạn nhận: </dt><dd className="inline">{formatTime(reservation.expiresAt)}</dd></div>
              </dl>
            </article>
          ))
        )}
      </section>

      <section className="space-y-3" aria-labelledby="trips-title">
        <h2 id="trips-title" className="text-lg font-bold text-brand-950">Lịch sử chuyến đi</h2>
        {myTrips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
            Bạn chưa có chuyến đi nào. <Link to="/app/trips" className="font-semibold text-brand-700 underline">Đến Chuyến đi của tôi</Link>
          </div>
        ) : (
          myTrips.map((trip) => (
            <article key={trip.tripId} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{trip.vehicleId}</p>
                  <p className="text-xs text-slate-500">{vehicleLabel(trip.vehicleId)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${tripColors[trip.status]}`}>
                  {trip.status === TripStatus.ONGOING ? "Đang di chuyển" : "Đã hoàn thành"}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-1 text-sm text-slate-600 sm:grid-cols-2">
                <div><dt className="inline font-medium">Mã chuyến: </dt><dd className="inline break-all">{trip.tripId}</dd></div>
                <div><dt className="inline font-medium">Bắt đầu: </dt><dd className="inline">{formatTime(trip.startTime)}</dd></div>
                <div><dt className="inline font-medium">Kết thúc: </dt><dd className="inline">{formatTime(trip.endTime)}</dd></div>
                <div><dt className="inline font-medium">Thời lượng: </dt><dd className="inline">{duration(trip.startTime, trip.endTime)}</dd></div>
                <div className="sm:col-span-2"><dt className="inline font-medium">Hub hiện tại của xe: </dt><dd className="inline">{currentHubName(trip.vehicleId)}</dd></div>
              </dl>
            </article>
          ))
        )}
      </section>
      <p className="text-xs text-slate-500">Dữ liệu lấy từ bộ nhớ ứng dụng. Khi reset demo hoặc tải lại trang, lịch sử có thể trở về dữ liệu mẫu.</p>
    </main>
  );
}
