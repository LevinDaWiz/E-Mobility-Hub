import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../../store";
import { VehicleService } from "../../../services/vehicleService";
import { ReservationService } from "../../../services/reservationService";
import { ReservationStatus, TripStatus, VehicleStatus, VehicleType, type Vehicle } from "../../../types";

const vehicleTypeLabel: Record<VehicleType, string> = {
  [VehicleType.E_BIKE]: "Xe đạp điện",
  [VehicleType.E_MOTORBIKE]: "Xe máy điện",
};

const vehicleStatusLabel: Record<VehicleStatus, string> = {
  [VehicleStatus.AVAILABLE]: "Sẵn sàng",
  [VehicleStatus.RESERVED]: "Đã đặt",
  [VehicleStatus.IN_USE]: "Đang sử dụng",
  [VehicleStatus.CHARGING]: "Đang sạc",
  [VehicleStatus.FAULTY]: "Bị lỗi",
};

const vehicleStatusColors: Record<VehicleStatus, string> = {
  [VehicleStatus.AVAILABLE]: "bg-emerald-100 text-emerald-800",
  [VehicleStatus.RESERVED]: "bg-amber-100 text-amber-800",
  [VehicleStatus.IN_USE]: "bg-blue-100 text-blue-800",
  [VehicleStatus.CHARGING]: "bg-purple-100 text-purple-800",
  [VehicleStatus.FAULTY]: "bg-red-100 text-red-800",
};

type TypeFilter = VehicleType | "ALL";
type StatusFilter = VehicleStatus | "ALL";

export default function SharedVehiclesPage() {
  // Subscribe vào Zustand: danh sách thay đổi thì giao diện cập nhật.
  const hubs = useStore((state) => state.hubs);
  const vehicles = useStore((state) => state.vehicles);
  const currentUser = useStore((state) => state.currentUser);
  const vehicleReservations = useStore((state) => state.vehicleReservations);
  const trips = useStore((state) => state.trips);
  const clockNow = useStore((state) => state.clock.now);

  const [hubId, setHubId] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [minBattery, setMinBattery] = useState(0);
  const [nearLocation, setNearLocation] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [confirmingReservation, setConfirmingReservation] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeReservation = vehicleReservations.find(
    (item) => item.studentId === currentUser.userId && item.status === ReservationStatus.ACTIVE && new Date(item.expiresAt).getTime() > clockNow,
  );
  const secondsRemaining = activeReservation
    ? Math.max(0, Math.ceil((new Date(activeReservation.expiresAt).getTime() - clockNow) / 1000))
    : 0;

  function cancelActiveReservation() {
    if (!activeReservation) return;
    try {
      ReservationService.cancelReservation(activeReservation.reservationId, currentUser.userId);
      setSuccessMessage(`Đã hủy lượt đặt xe ${activeReservation.vehicleId}.`);
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(error instanceof Error ? error.message : "Không thể hủy lượt đặt.");
    }
  }

  const hasOngoingTrip = trips.some(
    (trip) => trip.studentId === currentUser.userId && trip.status === TripStatus.ONGOING,
  );

  function closeDetails() {
    setSelectedVehicleId(null);
    setConfirmingReservation(false);
    setErrorMessage("");
  }

  function reserveSelectedVehicle() {
    if (!selectedVehicleId) return;
    try {
      const reservation = ReservationService.reserveVehicle(currentUser.userId, selectedVehicleId);
      setSuccessMessage(`Đã đặt xe ${reservation.vehicleId} thành công. Mã đặt: ${reservation.reservationId}.`);
      closeDetails();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể đặt xe.");
    }
  }

  // SearchCriteria.type của M1 yêu cầu VehicleType cụ thể. Để có tùy chọn
  // "Tất cả loại xe", gọi service cho cả 2 loại rồi gộp Hub tương ứng.
  const matchingHubIds = useMemo(() => {
    const selectedTypes = type === "ALL" ? Object.values(VehicleType) : [type];
    const matchingHubs = selectedTypes.flatMap((vehicleType) =>
      VehicleService.searchHubsAndVehicles({
        hubId,
        type: vehicleType,
        minBattery,
        nearLocation,
      }),
    );
    return new Set(matchingHubs.map((hub) => hub.hubId));
  }, [hubId, type, minBattery, nearLocation, hubs, vehicles]);

  const matchingVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          matchingHubIds.has(vehicle.currentHubId) &&
          (type === "ALL" || vehicle.type === type) &&
          (status === "ALL" || vehicle.status === status) &&
          vehicle.batteryLevel >= minBattery,
      ),
    [vehicles, matchingHubIds, type, status, minBattery],
  );

  const selectedVehicle: Vehicle | undefined = selectedVehicleId
    ? vehicles.find((vehicle) => vehicle.vehicleId === selectedVehicleId)
    : undefined;
  const selectedHub = selectedVehicle
    ? hubs.find((hub) => hub.hubId === selectedVehicle.currentHubId)
    : undefined;

  function resetFilters() {
    setHubId("");
    setType("ALL");
    setStatus("ALL");
    setMinBattery(0);
    setNearLocation("");
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-950">Tìm xe dùng chung</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tìm Hub, lọc phương tiện và xem trạng thái xe đang có trong hệ thống.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-4 text-lg font-semibold text-brand-950">Bộ lọc</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col text-sm font-medium text-slate-900">
            <span className="flex min-h-12 items-end pb-1">Hub</span>
            <select
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2.5"
              value={hubId}
              onChange={(e) => setHubId(e.target.value)}
            >
              <option value="">Tất cả Hub</option>
              {hubs.map((hub) => (
                <option key={hub.hubId} value={hub.hubId}>{hub.name}</option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col text-sm font-medium text-slate-900">
            <span className="flex min-h-12 items-end pb-1">Loại xe</span>
            <select
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2.5"
              value={type}
              onChange={(e) => setType(e.target.value as TypeFilter)}
            >
              <option value="ALL">Tất cả loại xe</option>
              {Object.values(VehicleType).map((value) => (
                <option key={value} value={value}>{vehicleTypeLabel[value]}</option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col text-sm font-medium text-slate-900">
            <span className="flex min-h-12 items-end pb-1">Trạng thái xe</span>
            <select
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2.5"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              {Object.values(VehicleStatus).map((value) => (
                <option key={value} value={value}>{vehicleStatusLabel[value]}</option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col text-sm font-medium text-slate-900">
            <span className="flex min-h-12 items-end pb-1">Vị trí gần (tìm theo tên hoặc địa chỉ Hub)</span>
            <input
              className="w-full min-w-0 rounded-lg border border-slate-300 p-2.5"
              type="text"
              placeholder="Ví dụ: KTX, Metro, Bách Khoa"
              value={nearLocation}
              onChange={(e) => setNearLocation(e.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-slate-900 sm:col-span-2">
            Pin tối thiểu: <strong>{minBattery}%</strong>
            <input
              className="mt-3 w-full accent-emerald-600"
              type="range"
              min={0}
              max={100}
              step={5}
              value={minBattery}
              onChange={(e) => setMinBattery(Number(e.target.value))}
            />
          </label>
        </div>
        <button
          type="button"
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          onClick={resetFilters}
        >
          Xóa bộ lọc
        </button>
      </section>

      {errorMessage && !selectedVehicle && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>
      )}
      {successMessage && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {successMessage}
          <button type="button" onClick={() => setSuccessMessage("")} className="ml-3 font-semibold underline">Đóng</button>
        </div>
      )}
      {activeReservation && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Bạn đang giữ xe {activeReservation.vehicleId}</p>
          <p className="mt-1 font-medium">Còn {secondsRemaining} giây để nhận xe (theo đồng hồ mô phỏng)</p>
          <p className="mt-1 text-xs">Hết hạn: {new Date(activeReservation.expiresAt).toLocaleString("vi-VN")}</p>
          <button
            type="button"
            onClick={cancelActiveReservation}
            className="mt-3 rounded-lg border border-amber-500 px-4 py-2 font-semibold hover:bg-amber-100"
          >
            Hủy đặt xe
          </button>
          <Link to="/app/trips" className="ml-0 mt-3 inline-block rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white sm:ml-2">Đến trang nhận xe</Link>
          <p className="mt-2 text-xs">Tự động chuyển EXPIRED và trả xe về AVAILABLE sẽ thực hiện ở bước NIFR-01.</p>
        </section>
      )}
      {hasOngoingTrip && (
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Bạn đang có chuyến đi chưa hoàn thành, nên chưa thể đặt xe mới.
        </p>
      )}

      <section aria-label="Kết quả tìm xe" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-brand-950">
            Kết quả ({matchingVehicles.length} xe)
          </h2>
          <p className="text-xs text-slate-500">Tổng số xe trong hệ thống: {vehicles.length}</p>
        </div>
        {matchingVehicles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
            Không tìm thấy xe phù hợp. Hãy thử xóa bộ lọc.
          </div>
        ) : (
          <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4">
            {matchingVehicles.map((vehicle) => {
              const hub = hubs.find((item) => item.hubId === vehicle.currentHubId);
              return (
                <article
                  key={vehicle.vehicleId}
                  className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex min-h-20 min-w-0 flex-col items-start gap-2">
                    <h3 className="whitespace-nowrap font-semibold text-slate-900">{vehicle.vehicleId}</h3>
                    <span className={`inline-block max-w-full rounded-full px-2 py-1 text-center text-xs font-medium ${vehicleStatusColors[vehicle.status]}`}>
                      {vehicleStatusLabel[vehicle.status]}
                    </span>
                  </div>
                  <p className="min-h-10 text-sm text-slate-600">{vehicleTypeLabel[vehicle.type]}</p>

                  {/* Chừa một vùng tên Hub đồng đều; tránh làm thanh pin và nút lệch nhau. */}
                  <p className="mt-2 h-16 overflow-hidden break-words text-sm text-slate-700">
                    Hub: {hub?.name ?? vehicle.currentHubId}
                  </p>

                  {/* mt-auto đặt cả cụm pin + nút sát đáy mỗi card. */}
                  <div className="mt-auto space-y-4 pt-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.max(0, Math.min(100, vehicle.batteryLevel))}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-sm font-medium">{vehicle.batteryLevel}%</span>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                      onClick={() => { setSelectedVehicleId(vehicle.vehicleId); setConfirmingReservation(false); setErrorMessage(""); }}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedVehicle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          role="presentation"
          onMouseDown={closeDetails}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Chi tiết xe ${selectedVehicle.vehicleId}`}
            className="my-auto w-full max-w-[360px] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Xe {selectedVehicle.vehicleId}</h2>
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-slate-100"
                onClick={closeDetails}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>Loại xe: <strong>{vehicleTypeLabel[selectedVehicle.type]}</strong></p>
              <p>Pin: <strong>{selectedVehicle.batteryLevel}%</strong></p>
              <p>Trạng thái: <strong>{vehicleStatusLabel[selectedVehicle.status]}</strong></p>
              <p>Hub hiện tại: <strong>{selectedHub?.name ?? selectedVehicle.currentHubId}</strong></p>
            </div>
            {errorMessage && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
            )}
            {confirmingReservation ? (
              <div className="mt-5 space-y-3">
                <p className="text-sm font-medium text-slate-800">Xác nhận đặt xe {selectedVehicle.vehicleId}? Bạn sẽ có 30 giây thời gian mô phỏng để nhận xe.</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <button type="button" onClick={() => setConfirmingReservation(false)} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm">Quay lại</button>
                  <button type="button" onClick={reserveSelectedVehicle} className="flex-1 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Xác nhận</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={selectedVehicle.status !== VehicleStatus.AVAILABLE || selectedVehicle.batteryLevel <= 0 || !!activeReservation || hasOngoingTrip}
                onClick={() => { setErrorMessage(""); setConfirmingReservation(true); }}
                className="mt-5 w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {selectedVehicle.status !== VehicleStatus.AVAILABLE || selectedVehicle.batteryLevel <= 0
                  ? "Xe hiện không thể đặt"
                  : activeReservation || hasOngoingTrip
                    ? "Bạn đã có lượt đặt hoặc chuyến đi"
                    : "Đặt xe"}
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
