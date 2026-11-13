import { Link } from "react-router-dom";
import { MiniMap } from "../../../components/layout/MiniMap";
import { QUICK_ACTIONS, STUDENT_LINKS } from "../../../config/studentNav";
import { useStore } from "../../../store";
import { SlotStatus, VehicleStatus } from "../../../types";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-brand-700 px-3 py-3 text-white">
      <p className="text-xl font-bold">{String(value).padStart(2, "0")}</p>
      <p className="text-xs leading-tight">{label}</p>
    </div>
  );
}

// Trang chủ app mobile (theo mockup): trạng thái mạng lưới, truy cập nhanh, bản đồ, liên kết.
export function StudentHomePage() {
  const name = useStore((s) => s.currentUser.name);
  const hubCount = useStore((s) => s.hubs.length);
  const availableVehicles = useStore((s) => s.vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE).length);
  const freeSlots = useStore((s) => s.parkingSlots.filter((p) => p.status === SlotStatus.FREE).length);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Không gian di chuyển của bạn</p>
        <h1 className="mt-1 text-4xl font-bold leading-tight text-brand-950">Xin chào, {name}</h1>
        <p className="mt-2 text-base text-slate-500">Chọn một chức năng để bắt đầu hành trình hôm nay.</p>
      </section>

      <section className="rounded-xl bg-brand-900 p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-white/80">Trạng thái mạng lưới</p>
            <p className="text-lg font-bold">Các Hub đang hoạt động</p>
          </div>
          <span className="rounded-lg bg-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">Đang hoạt động</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat value={hubCount} label="Hub khả dụng" />
          <Stat value={availableVehicles} label="Xe dùng chung" />
          <Stat value={freeSlots} label="Chỗ đỗ trống" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-brand-950">Truy cập nhanh</h2>
          <span className="text-sm text-slate-400">Chức năng chính</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-brand-700 hover:bg-brand-50"
            >
              <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-xl font-bold text-brand-900">
                {item.icon}
              </span>
              <p className="text-base font-bold text-brand-950">{item.label} ›</p>
              <p className="mt-1 text-sm leading-snug text-slate-600">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <MiniMap />

      <section className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {STUDENT_LINKS.map((item) => (
          <Link key={item.path} to={item.path} className="flex items-center gap-4 p-4 hover:bg-brand-50">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-lg font-bold text-brand-700">
              {item.icon}
            </span>
            <span>
              <span className="block text-base font-bold text-brand-950">{item.label}</span>
              <span className="block text-sm text-slate-600">{item.description}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
