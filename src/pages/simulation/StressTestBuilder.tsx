import { useState } from "react";
import { Button, Card, Table, type Column } from "../../components/ui";
import { useStore } from "../../store";
import { inputClass } from "../../styles/formClasses";
import { PortStatus, SlotStatus, VehicleStatus } from "../../types";
import { formatDateTime } from "../../utils/format";
import { simNowIso } from "../../utils/time";
import { StressEventModal } from "./StressEventModal";
import {
  KIND_LABELS,
  STRATEGY_OPTIONS,
  countFaults,
  displayCode,
  surgeFactor,
  type StressEvent,
} from "./stressTypes";

interface Props {
  events: StressEvent[];
  onEventsChange: (events: StressEvent[]) => void;
  hubId: string;
  onHubChange: (hubId: string) => void;
  duration: number;
  onDurationChange: (minutes: number) => void;
  strategy: string;
  onStrategyChange: (strategy: string) => void;
  error: string | null;
  onReset: () => void;
  onRun: () => void;
}

// Chế độ "Phối hợp đa sự cố (Stress-Test)" của trang Mô phỏng (mockup SOFTWARE_2).
export function StressTestBuilder(props: Props) {
  const { events, onEventsChange, hubId, onHubChange, duration, onDurationChange, strategy, onStrategyChange } = props;
  const hubs = useStore((s) => s.hubs);
  const vehicles = useStore((s) => s.vehicles);
  const slots = useStore((s) => s.parkingSlots);
  const ports = useStore((s) => s.chargingPorts);

  // undefined = đóng; null = thêm mới; StressEvent = chỉnh sửa.
  const [editing, setEditing] = useState<StressEvent | null | undefined>(undefined);

  const hubName = (id: string) => hubs.find((h) => h.hubId === id)?.name ?? id;
  const sorted = [...events].sort((a, b) => a.timeMin - b.timeMin);
  const faults = countFaults(events);
  const factor = surgeFactor(events);

  const saveEvent = (ev: StressEvent) => {
    const exists = events.some((e) => e.id === ev.id);
    onEventsChange(exists ? events.map((e) => (e.id === ev.id ? ev : e)) : [...events, ev]);
    setEditing(undefined);
  };

  const columns: Column<StressEvent>[] = [
    { header: "Thời điểm", cell: (e) => `Phút ${e.timeMin}` },
    { header: "Loại biến cố", cell: (e) => KIND_LABELS[e.kind] },
    {
      header: "Hub/Tài nguyên",
      cell: (e) =>
        e.kind === "DEMAND_SURGE"
          ? hubName(e.hubId)
          : e.resourceIds.map((id) => displayCode(e.kind, id, e.hubId)).join(", "),
    },
    {
      header: "Tham số",
      cell: (e) =>
        e.kind === "DEMAND_SURGE"
          ? `×${e.multiplier}`
          : `${e.resourceIds.length} ${e.kind === "PORT_FAULT" ? "cổng" : "xe"}`,
    },
    {
      header: "Thao tác",
      cell: (e) => (
        <span className="whitespace-nowrap text-blue-700">
          <button type="button" className="hover:underline" onClick={() => setEditing(e)}>
            Sửa
          </button>
          {" · "}
          <button
            type="button"
            className="hover:underline"
            onClick={() => onEventsChange(events.filter((x) => x.id !== e.id))}
          >
            Xóa
          </button>
        </span>
      ),
    },
  ];

  const faultSummary =
    faults.ports + faults.vehicles === 0
      ? "Không có"
      : [faults.ports > 0 && `${faults.ports} cổng`, faults.vehicles > 0 && `${faults.vehicles} xe`]
          .filter(Boolean)
          .join(", ");

  const tiles = [
    { value: vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE).length, label: "Xe khả dụng", danger: false },
    { value: slots.filter((p) => p.status === SlotStatus.FREE).length, label: "Chỗ đỗ trống", danger: false },
    { value: ports.filter((p) => p.status === PortStatus.FREE).length, label: "Cổng sạc", danger: false },
    {
      value:
        ports.filter((p) => p.status === PortStatus.FAULTY).length +
        vehicles.filter((v) => v.status === VehicleStatus.FAULTY).length,
      label: "Tài nguyên lỗi",
      danger: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card title="Chọn kịch bản mô phỏng">
        <h3 className="mb-2 text-sm font-bold text-slate-900">Dòng thời gian biến cố</h3>
        <div className="overflow-hidden rounded-md border border-slate-200">
          <Table
            columns={columns}
            rows={sorted}
            rowKey={(e) => e.id}
            empty="Chưa có biến cố. Bấm “+ Thêm biến cố” để bắt đầu."
          />
        </div>
        <Button variant="secondary" size="sm" className="mt-3 border-blue-200 bg-blue-50 text-blue-800" onClick={() => setEditing(null)}>
          + Thêm biến cố
        </Button>

        <h3 className="mb-2 mt-6 text-sm font-bold text-slate-900">Tham số chung</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="st-hub" className="mb-1 block text-xs text-slate-500">
              Hub chịu ảnh hưởng
            </label>
            <select id="st-hub" className={inputClass()} value={hubId} onChange={(e) => onHubChange(e.target.value)}>
              {hubs.map((h) => (
                <option key={h.hubId} value={h.hubId}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="st-duration" className="mb-1 block text-xs text-slate-500">
              Thời lượng (phút)
            </label>
            <input
              id="st-duration"
              type="number"
              min={10}
              max={240}
              className={inputClass()}
              value={duration}
              onChange={(e) => onDurationChange(Number(e.target.value))}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="st-strategy" className="mb-1 block text-xs text-slate-500">
              Chiến lược điều phối
            </label>
            <select id="st-strategy" className={inputClass()} value={strategy} onChange={(e) => onStrategyChange(e.target.value)}>
              {STRATEGY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card title="Hiện trạng mạng lưới">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {tiles.map((t) => (
              <div
                key={t.label}
                className={`rounded-md border px-2 py-3 text-center ${t.danger ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}
              >
                <div className={`text-xl font-bold ${t.danger ? "text-rose-700" : "text-blue-700"}`}>{t.value}</div>
                <div className={`text-xs ${t.danger ? "text-rose-700" : "text-slate-600"}`}>{t.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] italic text-slate-400">
            UC22 · Cập nhật: {formatDateTime(simNowIso())}. Tạo bản sao dữ liệu khi khởi tạo phiên.
          </p>
        </Card>

        <section className="rounded-xl bg-brand-950 p-5 text-white shadow-sm">
          <h2 className="mb-3 text-lg font-bold">Tóm tắt cấu hình</h2>
          <dl className="space-y-1.5 text-sm">
            <div>
              Kịch bản: <strong>Stress-Test đa sự cố ({events.length} biến cố)</strong>
            </div>
            <div>Hub: {hubName(hubId)}</div>
            <div>Thời lượng: {duration} phút</div>
            <div>Hệ số: ×{factor}</div>
            <div>Cổng/xe lỗi: {faultSummary}</div>
            <div>Chiến lược: {STRATEGY_OPTIONS.find((o) => o.value === strategy)?.label ?? strategy}</div>
          </dl>
          {props.error && (
            <p className="mt-3 rounded-md bg-rose-100 px-3 py-2 text-xs font-medium text-rose-800" role="alert">
              {props.error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={props.onReset}>
              Khôi phục mặc định
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={events.length === 0} onClick={props.onRun}>
              Chạy Simulation
            </Button>
          </div>
        </section>
      </div>

      {editing !== undefined && (
        <StressEventModal
          event={editing}
          defaultHubId={hubId}
          durationMinutes={duration}
          onSave={saveEvent}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}
