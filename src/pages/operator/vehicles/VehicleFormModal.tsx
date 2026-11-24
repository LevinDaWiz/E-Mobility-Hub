import { useState } from "react";
import { Button, FormField, Modal } from "../../../components/ui";
import {
  createVehicle,
  isSystemManaged,
  nextVehicleId,
  updateVehicle,
  type VehicleFieldErrors,
  type VehicleFormInput,
} from "../../../services/vehicleAdminService";
import { useStore } from "../../../store";
import { inputClass } from "../../../styles/formClasses";
import { VehicleStatus, VehicleType, type Vehicle } from "../../../types";

interface Props {
  // Không truyền vehicle = thêm xe mới; có vehicle = chỉnh sửa.
  vehicle?: Vehicle;
  defaultHubId?: string;
  onClose: () => void;
  onSaved: (vehicle: Vehicle) => void;
}

const STATUS_LABELS: Record<VehicleStatus, string> = {
  [VehicleStatus.AVAILABLE]: "Sẵn sàng (Available)",
  [VehicleStatus.RESERVED]: "Đã đặt trước (Reserved)",
  [VehicleStatus.IN_USE]: "Đang sử dụng (In Use)",
  [VehicleStatus.CHARGING]: "Đang sạc (Charging)",
  [VehicleStatus.FAULTY]: "Lỗi / Cần sửa (Faulty)",
};

// Form thêm / sửa phương tiện. Mount khi cần để form luôn mới.
export function VehicleFormModal({ vehicle, defaultHubId, onClose, onSaved }: Props) {
  const hubs = useStore((s) => s.hubs);
  const isNew = !vehicle;
  const locked = !!vehicle && isSystemManaged(vehicle.status); // đang đặt / dùng / sạc
  const batteryLocked = vehicle?.status === VehicleStatus.CHARGING || vehicle?.status === VehicleStatus.IN_USE;

  const [form, setForm] = useState<VehicleFormInput>(() => ({
    vehicleId: vehicle?.vehicleId ?? nextVehicleId(),
    type: vehicle?.type ?? VehicleType.E_BIKE,
    batteryLevel: String(vehicle?.batteryLevel ?? 100),
    status: vehicle?.status ?? VehicleStatus.AVAILABLE,
    currentHubId: vehicle?.currentHubId ?? defaultHubId ?? hubs[0]?.hubId ?? "",
  }));
  const [errors, setErrors] = useState<VehicleFieldErrors>({});
  const set = <K extends keyof VehicleFormInput>(key: K, value: VehicleFormInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = () => {
    const result = isNew ? createVehicle(form) : updateVehicle(vehicle.vehicleId, form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSaved(result.vehicle);
  };

  const errorCount = Object.keys(errors).length;

  return (
    <Modal
      open
      title={isNew ? "Thêm phương tiện" : `Chỉnh sửa phương tiện ${vehicle.vehicleId}`}
      onClose={onClose}
      footer={
        <>
          {errorCount > 0 && (
            <span className="mr-auto self-center text-xs font-semibold text-red-700">
              Vui lòng sửa {errorCount} lỗi trước khi lưu.
            </span>
          )}
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={save}>{isNew ? "Thêm phương tiện" : "Lưu thay đổi"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Mã xe (QR / IoT ID)" htmlFor="vh-id" error={errors.vehicleId}>
          <input
            id="vh-id"
            className={inputClass(!!errors.vehicleId)}
            value={form.vehicleId}
            disabled={!isNew}
            onChange={(e) => set("vehicleId", e.target.value)}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Loại phương tiện" htmlFor="vh-type">
            <select id="vh-type" className={inputClass()} value={form.type} onChange={(e) => set("type", e.target.value as VehicleType)}>
              <option value={VehicleType.E_BIKE}>Xe đạp điện</option>
              <option value={VehicleType.E_MOTORBIKE}>Xe máy điện</option>
            </select>
          </FormField>
          <FormField
            label="Mức pin (%)"
            htmlFor="vh-battery"
            error={errors.batteryLevel}
            hint={batteryLocked ? "Pin do phiên sạc / chuyến đi cập nhật, không sửa tay." : undefined}
          >
            <input
              id="vh-battery"
              inputMode="numeric"
              className={inputClass(!!errors.batteryLevel)}
              value={form.batteryLevel}
              disabled={batteryLocked}
              onChange={(e) => set("batteryLevel", e.target.value)}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Trạng thái"
            htmlFor="vh-status"
            hint={locked ? "Trạng thái do hệ thống quản lý (đặt xe / chuyến đi / phiên sạc)." : undefined}
          >
            <select
              id="vh-status"
              className={inputClass()}
              value={form.status}
              disabled={locked}
              onChange={(e) => set("status", e.target.value as VehicleStatus)}
            >
              {locked ? (
                <option value={form.status}>{STATUS_LABELS[form.status]}</option>
              ) : (
                <>
                  <option value={VehicleStatus.AVAILABLE}>{STATUS_LABELS[VehicleStatus.AVAILABLE]}</option>
                  <option value={VehicleStatus.FAULTY}>{STATUS_LABELS[VehicleStatus.FAULTY]}</option>
                </>
              )}
            </select>
          </FormField>
          <FormField label="Hub hiện tại" htmlFor="vh-hub" error={errors.currentHubId}>
            <select
              id="vh-hub"
              className={inputClass(!!errors.currentHubId)}
              value={form.currentHubId}
              disabled={locked}
              onChange={(e) => set("currentHubId", e.target.value)}
            >
              {hubs.map((h) => (
                <option key={h.hubId} value={h.hubId}>
                  {h.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>
    </Modal>
  );
}
