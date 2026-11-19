import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, FormField, Modal } from "../../../components/ui";
import { createHub, type FieldErrors, type NewHubInput } from "../../../services/hubConfigService";
import { inputClass } from "../../../styles/formClasses";
import { HubOperationalStatus, HubType } from "../../../types";

interface AddHubModalProps {
  onClose: () => void;
  onOpenImport: () => void;
}

// "Thêm Mobility Hub". Mount khi cần (state form được tạo mới mỗi lần mở).
export function AddHubModal({ onClose, onOpenImport }: AddHubModalProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<NewHubInput>({
    hubId: "",
    name: "",
    type: HubType.CAMPUS,
    location: "",
    capacity: "",
    initialSlots: "0",
    initialPorts: "0",
    status: HubOperationalStatus.MAINTENANCE,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof NewHubInput>(key: K, value: NewHubInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const errorCount = Object.keys(errors).length;

  const submit = () => {
    const result = createHub(form);
    if (result.ok) {
      onClose();
      navigate(`/admin/hubs/${result.value.hubId}`);
    } else if (result.kind === "validation") {
      setErrors(result.errors);
    }
  };

  return (
    <Modal
      open
      size="lg"
      title="Thêm Mobility Hub"
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
          <Button onClick={submit}>Tạo Hub</Button>
        </>
      }
    >
      <p className="mb-4 text-slate-500">Sau khi tạo Hub, vào Chi tiết Hub để thêm hoặc chỉnh từng tài nguyên.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Hub ID" htmlFor="hubId" error={errors.hubId}>
          <input id="hubId" className={inputClass(!!errors.hubId)} placeholder="HUB-XXX-X" value={form.hubId} onChange={(e) => set("hubId", e.target.value)} />
        </FormField>
        <FormField label="Hub Name" htmlFor="hubName" error={errors.name}>
          <input id="hubName" className={inputClass(!!errors.name)} placeholder="Tên Hub" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField label="Loại Hub" htmlFor="hubType">
          <select id="hubType" className={inputClass()} value={form.type} onChange={(e) => set("type", e.target.value as HubType)}>
            <option value={HubType.METRO}>Metro</option>
            <option value={HubType.DORM}>Ký túc xá</option>
            <option value={HubType.CAMPUS}>Khuôn viên trường</option>
            <option value={HubType.SERVICE}>Dịch vụ / bảo trì</option>
          </select>
        </FormField>
        <FormField label="Initial Status" htmlFor="hubStatus">
          <select
            id="hubStatus"
            className={inputClass()}
            value={form.status}
            onChange={(e) => set("status", e.target.value as HubOperationalStatus)}
          >
            <option value={HubOperationalStatus.MAINTENANCE}>Maintenance</option>
            <option value={HubOperationalStatus.AVAILABLE}>Available</option>
            <option value={HubOperationalStatus.UNAVAILABLE}>Unavailable</option>
          </select>
        </FormField>
        <FormField label="Location" htmlFor="hubLocation" error={errors.location} className="sm:col-span-2">
          <input
            id="hubLocation"
            className={inputClass(!!errors.location)}
            placeholder="Tọa độ GPS (GeoJSON) hoặc chọn trên bản đồ"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </FormField>
        <FormField label="Capacity" htmlFor="hubCapacity" error={errors.capacity}>
          <input id="hubCapacity" className={inputClass(!!errors.capacity)} placeholder="Sức chứa tối đa" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
        </FormField>
        <FormField label="Số chỗ đỗ ban đầu" htmlFor="hubSlots" error={errors.initialSlots}>
          <input id="hubSlots" className={inputClass(!!errors.initialSlots)} value={form.initialSlots} onChange={(e) => set("initialSlots", e.target.value)} />
        </FormField>
        <FormField label="Số cổng sạc ban đầu" htmlFor="hubPorts" error={errors.initialPorts}>
          <input id="hubPorts" className={inputClass(!!errors.initialPorts)} value={form.initialPorts} onChange={(e) => set("initialPorts", e.target.value)} />
        </FormField>
      </div>
      <p className="mt-3 text-xs text-slate-500">Hub ID không được trùng. Vị trí có thể nhập tọa độ GPS hoặc mô tả địa điểm.</p>
      <button type="button" className="mt-2 text-xs font-semibold text-brand-700" onClick={onOpenImport}>
        Cần thêm nhiều Hub? Nhập từ tệp (CSV/JSON) →
      </button>
    </Modal>
  );
}
