import { useMemo, useState } from "react";
import { Button, FormField, Modal } from "../../components/ui";
import { useStore } from "../../store";
import { inputClass } from "../../styles/formClasses";
import { makeId } from "../../utils/id";
import { resourceCode } from "../../utils/resourceCode";
import { ResourceChipField, type ChipItem } from "./ResourceChipField";
import { KIND_LABELS, MAX_DEMAND_MULTIPLIER, type StressEvent, type StressEventKind } from "./stressTypes";

interface Props {
  // null = thêm mới; có giá trị = chỉnh sửa biến cố đó.
  event: StressEvent | null;
  defaultHubId: string;
  durationMinutes: number;
  onSave: (event: StressEvent) => void;
  onClose: () => void;
}

// Hộp thoại "Thêm/chỉnh sửa biến cố" (mockup). Mount khi cần để form luôn mới.
export function StressEventModal({ event, defaultHubId, durationMinutes, onSave, onClose }: Props) {
  const hubs = useStore((s) => s.hubs);
  const ports = useStore((s) => s.chargingPorts);
  const vehicles = useStore((s) => s.vehicles);

  const [kind, setKind] = useState<StressEventKind>(event?.kind ?? "PORT_FAULT");
  const [timeMin, setTimeMin] = useState(String(event?.timeMin ?? 10));
  const [hubId, setHubId] = useState(event?.hubId ?? defaultHubId);
  const [resourceIds, setResourceIds] = useState<string[]>(event?.resourceIds ?? []);
  const [multiplier, setMultiplier] = useState(String(event && event.kind === "DEMAND_SURGE" ? event.multiplier : 2));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items: ChipItem[] = useMemo(() => {
    const hubName = (id: string) => hubs.find((h) => h.hubId === id)?.name ?? id;
    if (kind === "PORT_FAULT") {
      return ports
        .filter((p) => p.hubId === hubId)
        .map((p) => ({ id: p.portId, code: resourceCode(p.portId, p.hubId), hubName: hubName(p.hubId) }));
    }
    if (kind === "VEHICLE_FAULT") {
      return vehicles
        .filter((v) => v.currentHubId === hubId)
        .map((v) => ({ id: v.vehicleId, code: v.vehicleId, hubName: hubName(v.currentHubId) }));
    }
    return [];
  }, [kind, hubId, ports, vehicles, hubs]);

  const changeKind = (next: StressEventKind) => {
    setKind(next);
    setResourceIds([]);
    setErrors({});
  };

  const changeHub = (next: string) => {
    setHubId(next);
    setResourceIds([]); // tài nguyên thuộc Hub cũ không còn hợp lệ
  };

  const save = () => {
    const next: Record<string, string> = {};
    const t = Number(timeMin);
    if (timeMin.trim() === "" || !Number.isInteger(t) || t < 0) next.timeMin = "Nhập số phút nguyên ≥ 0.";
    else if (t > durationMinutes) next.timeMin = `Không vượt thời lượng mô phỏng (${durationMinutes} phút).`;

    const m = Number(multiplier);
    if (kind === "DEMAND_SURGE" && (Number.isNaN(m) || m <= 1 || m > MAX_DEMAND_MULTIPLIER)) {
      next.multiplier = `Hệ số phải lớn hơn 1 và tối đa ${MAX_DEMAND_MULTIPLIER}.`;
    }
    if (kind !== "DEMAND_SURGE" && resourceIds.length === 0) {
      next.resources = kind === "PORT_FAULT" ? "Chọn ít nhất một cổng sạc." : "Chọn ít nhất một xe.";
    }
    if (!hubId) next.hubId = "Vui lòng chọn Hub.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave({
      id: event?.id ?? makeId("EV"),
      timeMin: t,
      kind,
      hubId,
      resourceIds: kind === "DEMAND_SURGE" ? [] : resourceIds,
      multiplier: kind === "DEMAND_SURGE" ? m : 1,
    });
  };

  const errorCount = Object.keys(errors).length;

  return (
    <Modal
      open
      size="lg"
      title="Thêm/chỉnh sửa biến cố"
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
          <Button onClick={save}>Lưu biến cố</Button>
        </>
      }
    >
      <p className="-mt-2 mb-4 text-xs text-slate-500">Cấu hình chi tiết một biến cố trong dòng thời gian Stress-Test.</p>

      <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
        <FormField label="Loại biến cố" htmlFor="ev-kind">
          <select
            id="ev-kind"
            className={inputClass()}
            value={kind}
            onChange={(e) => changeKind(e.target.value as StressEventKind)}
          >
            {(Object.keys(KIND_LABELS) as StressEventKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Thời điểm xảy ra (phút)" htmlFor="ev-time" error={errors.timeMin}>
          <input
            id="ev-time"
            inputMode="numeric"
            className={inputClass(!!errors.timeMin)}
            value={timeMin}
            onChange={(e) => setTimeMin(e.target.value)}
          />
        </FormField>
      </div>

      <div className="mt-4 space-y-4">
        {kind === "DEMAND_SURGE" ? (
          <FormField
            label="Hệ số nhân nhu cầu đặt xe (×)"
            htmlFor="ev-mult"
            error={errors.multiplier}
            hint={`Hệ số nhiều biến cố được nhân dồn, tối đa ×${MAX_DEMAND_MULTIPLIER}.`}
          >
            <input
              id="ev-mult"
              inputMode="decimal"
              className={inputClass(!!errors.multiplier)}
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
            />
          </FormField>
        ) : (
          <ResourceChipField
            label={kind === "PORT_FAULT" ? "Cổng sạc giả định lỗi" : "Xe giả định lỗi"}
            searchPlaceholder={kind === "PORT_FAULT" ? "Nhập mã cổng hoặc tên Hub" : "Nhập mã xe hoặc tên Hub"}
            items={items}
            selected={resourceIds}
            onChange={setResourceIds}
            error={errors.resources}
          />
        )}

        <FormField label="Hub" htmlFor="ev-hub" error={errors.hubId}>
          <select id="ev-hub" className={inputClass(!!errors.hubId)} value={hubId} onChange={(e) => changeHub(e.target.value)}>
            {hubs.map((h) => (
              <option key={h.hubId} value={h.hubId}>
                {h.name}
              </option>
            ))}
          </select>
        </FormField>

        <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
          ⓘ Với loại <strong>Xe giả định lỗi</strong>: chọn mã xe cụ thể. Với <strong>Tăng nhu cầu</strong>: nhập hệ số nhân nhu
          cầu đặt xe (×lần).
        </p>
      </div>
    </Modal>
  );
}
