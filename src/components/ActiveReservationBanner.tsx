import { useState } from "react";
import { Link } from "react-router-dom";
import { ReservationService } from "../services/reservationService";
import { useStore } from "../store";
import { ReservationStatus } from "../types";

// Thông báo "Bạn đang giữ xe ... còn xx giây" của sinh viên hiện tại. Chỉ hiện khi có lượt đặt còn hiệu lực.
// Đếm ngược theo đồng hồ mô phỏng; hết hạn thì tick NIFR-01 đổi lượt đặt sang EXPIRED và banner tự biến mất.
export function ActiveReservationBanner() {
  const currentUser = useStore((s) => s.currentUser);
  const reservations = useStore((s) => s.vehicleReservations);
  const now = useStore((s) => s.clock.now);
  const [error, setError] = useState("");

  const active = reservations.find(
    (r) =>
      r.studentId === currentUser.userId &&
      r.status === ReservationStatus.ACTIVE &&
      new Date(r.expiresAt).getTime() > now,
  );
  if (!active) return null;

  const seconds = Math.max(0, Math.ceil((new Date(active.expiresAt).getTime() - now) / 1000));

  const cancel = () => {
    try {
      ReservationService.cancelReservation(active.reservationId, currentUser.userId);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể hủy lượt đặt.");
    }
  };

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
      <p className="font-semibold">Bạn đang giữ xe {active.vehicleId}</p>
      <p className={`mt-1 text-base font-bold ${seconds <= 10 ? "text-rose-600" : ""}`}>
        Còn {seconds} giây để nhận xe
      </p>
      <p className="mt-1 text-xs">Hết hạn: {new Date(active.expiresAt).toLocaleTimeString("vi-VN")}</p>
      {error && <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/app/trips" className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:opacity-90">
          Nhận xe
        </Link>
        <button type="button" onClick={cancel} className="rounded-lg border border-amber-500 px-4 py-2 font-semibold hover:bg-amber-100">
          Hủy đặt xe
        </button>
      </div>
    </section>
  );
}
