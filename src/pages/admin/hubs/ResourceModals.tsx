import { useState } from "react";
import { Button, FormField, Modal } from "../../../components/ui";
import {
  addPort,
  addSlots,
  updatePort,
  updateSlot,
  type FieldErrors,
  type NewSlotInput,
  type PortFormInput,
} from "../../../services/hubConfigService";
import { useStore } from "../../../store";
import { inputClass } from "../../../styles/formClasses";
import { PortKind, SlotKind, type ChargingPort, type Hub, type ParkingSlot } from "../../../types";
import { resourceCode } from "../../../utils/resourceCode";

// ===== M1: các modal thêm / sửa chỗ đỗ và cổng sạc (UC19). Mount khi cần để form luôn mới. =====

function ErrorFooter({ count }: { count: number }) {
  if (count === 0) return null;
  return <span className="mr-auto self-center text-xs font-semibold text-red-700">Vui lòng sửa {count} lỗi trước khi lưu.</span>;
}

const KIND_OPTIONS_SLOT = (
  <>
    <option value={SlotKind.SHARED}>Shared</option>
    <option value={SlotKind.PERSONAL}>Personal</option>
  </>
);

const KIND_OPTIONS_PORT = (
  <>
    <option value={PortKind.FAST}>Fast</option>
    <option value={PortKind.STANDARD}>Standard</option>
  </>
);

// Gợi ý mã tiếp theo chưa dùng: S01, S02, ... / P1, P2, ...
function nextFreeCode(prefix: string, used: Set<string>, width: number): string {
  let n = used.size + 1;
  while (used.has(`${prefix}${String(n).padStart(width, "0")}`)) n++;
  return `${prefix}${String(n).padStart(width, "0")}`;
}

interface AddProps {
  hub: Hub;
  onClose: () => void;
  onOpenImport: () => void;
}

export function AddSlotsModal({ hub, onClose, onOpenImport }: AddProps) {
  const slots = useStore((s) => s.parkingSlots);
  const [form, setForm] = useState<NewSlotInput>(() => {
    const used = new Set(slots.filter((s) => s.hubId === hub.hubId).map((s) => resourceCode(s.slotId, hub.hubId)));
    const code = nextFreeCode("S", used, 2);
    return { code, kind: SlotKind.SHARED, status: "FREE", sensorId: `SNS-${hub.hubId.replace("HUB-", "")}-${code}`, quantity: "1" };
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof NewSlotInput>(key: K, value: NewSlotInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const count = slots.filter((s) => s.hubId === hub.hubId).length;

  const submit = () => {
    const result = addSlots(hub.hubId, form);
    if (result.ok) onClose();
    else if (result.kind === "validation") setErrors(result.errors);
  };

  return (
    <Modal
      open
      size="lg"
      title="Thêm chỗ đỗ"
      onClose={onClose}
      footer={
        <>
          <ErrorFooter count={Object.keys(errors).length} />
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit}>Lưu cấu hình</Button>
        </>
      }
    >
      <p className="mb-4 text-slate-500">
        Chỗ đỗ mới sẽ thuộc {hub.name}. Hiện có {count} chỗ đỗ.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Hub" htmlFor="slotHub">
          <input id="slotHub" className={inputClass()} value={`${hub.name} (${hub.hubId})`} disabled readOnly />
        </FormField>
        <FormField label="Slot ID (mã ô)" htmlFor="slotCode" error={errors.code}>
          <input id="slotCode" className={inputClass(!!errors.code)} value={form.code} onChange={(e) => set("code", e.target.value)} />
        </FormField>
        <FormField label="Loại chỗ đỗ" htmlFor="slotKind">
          <select id="slotKind" className={inputClass()} value={form.kind} onChange={(e) => set("kind", e.target.value as SlotKind)}>
            {KIND_OPTIONS_SLOT}
          </select>
        </FormField>
        <FormField label="Trạng thái ban đầu" htmlFor="slotStatus">
          <select id="slotStatus" className={inputClass()} value={form.status} onChange={(e) => set("status", e.target.value as NewSlotInput["status"])}>
            <option value="FREE">Available</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </FormField>
        <FormField label="Cảm biến (Sensor ID)" htmlFor="slotSensor">
          <input id="slotSensor" className={inputClass()} value={form.sensorId} onChange={(e) => set("sensorId", e.target.value)} />
        </FormField>
        <FormField label="Số lượng ô cần thêm" htmlFor="slotQty" error={errors.quantity}>
          <input id="slotQty" className={inputClass(!!errors.quantity)} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
        </FormField>
      </div>
      <button type="button" className="mt-4 text-xs font-semibold text-brand-700" onClick={onOpenImport}>
        Cần thêm nhiều ô? Nhập từ tệp (CSV/JSON) →
      </button>
    </Modal>
  );
}

export function EditSlotModal({ slot, hub, onClose }: { slot: ParkingSlot; hub: Hub; onClose: () => void }) {
  const [kind, setKind] = useState<SlotKind>(slot.kind);
  const [sensorId, setSensorId] = useState(slot.sensorId);
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = () => {
    const result = updateSlot(slot.slotId, { kind, sensorId });
    if (result.ok) onClose();
    else if (result.kind === "validation") setErrors(result.errors);
  };

  return (
    <Modal
      open
      title={`Chỉnh sửa chỗ đỗ ${resourceCode(slot.slotId, hub.hubId)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit}>Lưu cấu hình</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Slot ID" htmlFor="editSlotId" hint="Mã ô không thể đổi.">
          <input id="editSlotId" className={inputClass()} value={resourceCode(slot.slotId, hub.hubId)} disabled readOnly />
        </FormField>
        <FormField label="Loại chỗ đỗ" htmlFor="editSlotKind">
          <select id="editSlotKind" className={inputClass()} value={kind} onChange={(e) => setKind(e.target.value as SlotKind)}>
            {KIND_OPTIONS_SLOT}
          </select>
        </FormField>
        <FormField label="Cảm biến (Sensor ID)" htmlFor="editSlotSensor" error={errors.sensorId}>
          <input id="editSlotSensor" className={inputClass(!!errors.sensorId)} value={sensorId} onChange={(e) => setSensorId(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}

export function AddPortModal({ hub, onClose, onOpenImport }: AddProps) {
  const ports = useStore((s) => s.chargingPorts);
  const [form, setForm] = useState<PortFormInput>(() => {
    const used = new Set(ports.filter((p) => p.hubId === hub.hubId).map((p) => resourceCode(p.portId, hub.hubId)));
    const code = nextFreeCode("P", used, 0);
    return { code, kind: PortKind.FAST, powerKw: "7", dockId: `DOCK-${hub.hubId.replace("HUB-", "")}-${code.replace("P", "")}`, status: "FREE" };
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof PortFormInput>(key: K, value: PortFormInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const count = ports.filter((p) => p.hubId === hub.hubId).length;

  const submit = () => {
    const result = addPort(hub.hubId, form);
    if (result.ok) onClose();
    else if (result.kind === "validation") setErrors(result.errors);
  };

  return (
    <Modal
      open
      size="lg"
      title="Thêm cổng sạc"
      onClose={onClose}
      footer={
        <>
          <ErrorFooter count={Object.keys(errors).length} />
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit}>Lưu cấu hình</Button>
        </>
      }
    >
      <p className="mb-4 text-slate-500">
        Cổng sạc mới sẽ thuộc {hub.name}. Hiện có {count} cổng sạc.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Hub" htmlFor="portHub">
          <input id="portHub" className={inputClass()} value={`${hub.name} (${hub.hubId})`} disabled readOnly />
        </FormField>
        <FormField label="Port ID" htmlFor="portCode" error={errors.code}>
          <input id="portCode" className={inputClass(!!errors.code)} value={form.code} onChange={(e) => set("code", e.target.value)} />
        </FormField>
        <FormField label="Loại cổng" htmlFor="portKind">
          <select
            id="portKind"
            className={inputClass()}
            value={form.kind}
            onChange={(e) => {
              const kind = e.target.value as PortKind;
              setForm((f) => ({ ...f, kind, powerKw: kind === PortKind.FAST ? "7" : "3.5" }));
            }}
          >
            {KIND_OPTIONS_PORT}
          </select>
        </FormField>
        <FormField label="Công suất (kW)" htmlFor="portPower" error={errors.powerKw}>
          <input id="portPower" className={inputClass(!!errors.powerKw)} value={form.powerKw} onChange={(e) => set("powerKw", e.target.value)} />
        </FormField>
        <FormField label="Dock ID" htmlFor="portDock" error={errors.dockId}>
          <input id="portDock" className={inputClass(!!errors.dockId)} placeholder="Nhập Dock ID" value={form.dockId} onChange={(e) => set("dockId", e.target.value)} />
        </FormField>
        <FormField label="Trạng thái ban đầu" htmlFor="portStatus">
          <select id="portStatus" className={inputClass()} value={form.status} onChange={(e) => set("status", e.target.value as PortFormInput["status"])}>
            <option value="FREE">Available</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </FormField>
      </div>
      <button type="button" className="mt-4 text-xs font-semibold text-brand-700" onClick={onOpenImport}>
        Cần thêm nhiều dock sạc? Nhập từ tệp (CSV/JSON) →
      </button>
    </Modal>
  );
}

export function EditPortModal({ port, hub, onClose }: { port: ChargingPort; hub: Hub; onClose: () => void }) {
  const [kind, setKind] = useState<PortKind>(port.kind);
  const [powerKw, setPowerKw] = useState(String(port.powerKw));
  const [dockId, setDockId] = useState(port.dockId);
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = () => {
    const result = updatePort(port.portId, { kind, powerKw, dockId });
    if (result.ok) onClose();
    else if (result.kind === "validation") setErrors(result.errors);
  };

  return (
    <Modal
      open
      title={`Chỉnh sửa cổng sạc ${resourceCode(port.portId, hub.hubId)}`}
      onClose={onClose}
      footer={
        <>
          <ErrorFooter count={Object.keys(errors).length} />
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit}>Lưu cấu hình</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Loại cổng" htmlFor="editPortKind">
          <select id="editPortKind" className={inputClass()} value={kind} onChange={(e) => setKind(e.target.value as PortKind)}>
            {KIND_OPTIONS_PORT}
          </select>
        </FormField>
        <FormField label="Công suất (kW)" htmlFor="editPortPower" error={errors.powerKw}>
          <input id="editPortPower" className={inputClass(!!errors.powerKw)} value={powerKw} onChange={(e) => setPowerKw(e.target.value)} />
        </FormField>
        <FormField label="Dock ID" htmlFor="editPortDock" error={errors.dockId}>
          <input id="editPortDock" className={inputClass(!!errors.dockId)} value={dockId} onChange={(e) => setDockId(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}
