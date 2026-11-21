import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HubCard } from "../../../components/HubCard";
import { Badge, Progress } from "../../../components/ui";
import { useStore } from "../../../store";
import { VehicleStatus, VehicleType, type Vehicle } from "../../../types";
import { naturalCompare } from "../../../utils/format";

const STATUS_LABELS: Record<VehicleStatus, string> = {
  [VehicleStatus.AVAILABLE]: "Sẵn sàng",
  [VehicleStatus.RESERVED]: "Đã đặt",
  [VehicleStatus.IN_USE]: "Đang sử dụng",
  [VehicleStatus.CHARGING]: "Đang sạc",
  [VehicleStatus.FAULTY]: "Bị lỗi",
};

// Chi tiết một Hub trên app sinh viên: thông tin Hub và danh sách xe tại Hub. Nút "Đặt xe" mở trang Tìm xe đã chọn sẵn xe.
export function StudentHubDetailPage() {
  const { hubId = "" } = useParams();
  const hub = useStore((s) => s.hubs.find((h) => h.hubId === hubId));
  const allVehicles = useStore((s) => s.vehicles);
  const [onlyAvailable, setOnlyAvailable] = useState(true);

  const vehicles = useMemo(
    () =>
      allVehicles
        .filter((v) => v.currentHubId === hubId)
        // Xe sẵn sàng lên đầu, rồi theo mã xe.
        .sort(
          (a, b) =>
            Number(b.status === VehicleStatus.AVAILABLE) - Number(a.status === VehicleStatus.AVAILABLE) ||
            naturalCompare(a.vehicleId, b.vehicleId),
        ),
    [allVehicles, hubId],
  );

  if (!hub) {
    return (
      <div className="space-y-3">
        <p className="text-slate-600">Không tìm thấy Hub “{hubId}”.</p>
        <Link to="/app/hubs" className="text-sm font-semibold text-brand-700">
          ← Về danh sách Hub
        </Link>
      </div>
    );
  }

  const availableCount = vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE).length;
  const shown = onlyAvailable ? vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE) : vehicles;

  return (
    <div className="space-y-4">
      <Link to="/app/hubs" className="text-sm font-semibold text-brand-700">
        ← Các Hub
      </Link>

      <HubCard hub={hub} />

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-brand-950">Xe tại Hub ({availableCount} sẵn sàng)</h2>
        <Link
          to={`/app/shared?hub=${hub.hubId}`}
          className="rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          Tìm xe tại Hub
        </Link>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
        Chỉ hiện xe sẵn sàng
      </label>

      {shown.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          {vehicles.length === 0
            ? "Hub hiện chưa có xe."
            : "Hub không còn xe sẵn sàng. Bỏ chọn bộ lọc để xem xe đang được đặt, sạc hoặc sử dụng."}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((v) => (
            <VehicleRow key={v.vehicleId} vehicle={v} hubId={hub.hubId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function VehicleRow({ vehicle, hubId }: { vehicle: Vehicle; hubId: string }) {
  const canReserve = vehicle.status === VehicleStatus.AVAILABLE && vehicle.batteryLevel > 0;
  const barColor = vehicle.batteryLevel < 20 ? "bg-rose-500" : vehicle.batteryLevel < 50 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{vehicle.vehicleId}</p>
          <p className="text-xs text-slate-500">{vehicle.type === VehicleType.E_BIKE ? "Xe đạp điện" : "Xe máy điện"}</p>
        </div>
        <Badge value={vehicle.status} label={STATUS_LABELS[vehicle.status]} />
      </div>
      <div className="mt-2">
        <Progress value={vehicle.batteryLevel} barClassName={barColor} label={`Pin ${vehicle.batteryLevel}%`} />
      </div>
      <div className="mt-3 text-right">
        {canReserve ? (
          <Link
            to={`/app/shared?hub=${hubId}&vehicle=${vehicle.vehicleId}`}
            className="inline-block rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Đặt xe
          </Link>
        ) : (
          <span className="text-xs text-slate-400">Không thể đặt lúc này</span>
        )}
      </div>
    </li>
  );
}
