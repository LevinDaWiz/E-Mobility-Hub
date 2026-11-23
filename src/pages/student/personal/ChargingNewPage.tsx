import { useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card } from "../../../components/ui";
import { priorityBreakdown, type SlotOption } from "../../../engine/chargingScheduler";
import { ChargingService } from "../../../services/chargingService";
import { useStore } from "../../../store";
import { errorText, fmtMinutes, fmtTime, inputClass, useChargeableVehicles } from "./shared";

const START_OFFSETS = [0, 15, 30, 60, 120]; // phút
const DEADLINE_HOURS = [1, 2, 4, 8, 12];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ${active ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-slate-700 ring-slate-300"}`}
    >
      {children}
    </button>
  );
}

// UC05 (đăng ký nhu cầu sạc: xe, pin mục tiêu, giờ bắt đầu, deadline) + UC09 (chọn Hub, cổng, khung giờ).
export function ChargingNewPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const hubs = useStore((s) => s.hubs);
  const now = useStore((s) => s.clock.now);
  // Đăng ký theo dõi để phần xem trước cập nhật khi cổng / phiên sạc thay đổi.
  useStore((s) => s.chargingPorts);
  useStore((s) => s.chargingSessions);
  const { userId, personal, shared } = useChargeableVehicles();

  const vehicles = [
    ...personal.map((v) => ({ id: v.vehicleId, label: `${v.model} – ${v.plateNumber}`, battery: v.batteryLevel, fixedHub: null as string | null })),
    ...shared.map((v) => ({ id: v.vehicleId, label: `Xe dùng chung ${v.vehicleId} (vừa trả)`, battery: v.batteryLevel, fixedHub: v.currentHubId })),
  ];
  const [vehicleId, setVehicleId] = useState(() => {
    const q = params.get("vehicle");
    return vehicles.find((v) => v.id === q)?.id ?? vehicles[0]?.id ?? "";
  });
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const [hubIdState, setHubId] = useState(() => params.get("hub") ?? hubs[0]?.hubId ?? "");
  const hubId = vehicle?.fixedHub ?? hubIdState;
  const [target, setTarget] = useState(80);
  const [startIn, setStartIn] = useState(0);
  const [deadlineH, setDeadlineH] = useState(2);
  const [portId, setPortId] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; suggestions: SlotOption[] } | null>(null);

  if (!vehicle) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-brand-950">Đăng ký sạc</h1>
        <p className="text-sm text-slate-600">Bạn chưa có xe cá nhân hoặc xe dùng chung vừa trả để đăng ký sạc.</p>
      </div>
    );
  }

  const minTarget = Math.min(100, Math.ceil((vehicle.battery + 5) / 5) * 5);
  const targetBattery = Math.max(target, minTarget);
  const desiredStart = new Date(now + startIn * 60_000).toISOString();
  const deadline = new Date(now + startIn * 60_000 + deadlineH * 3_600_000).toISOString();
  const input = { vehicleId, targetBattery, desiredStart, deadline, hubId, studentId: userId };
  const priority = priorityBreakdown({ vehicleId, deadline });
  const { atHub, elsewhere } = ChargingService.previewOptions(input);
  const fits = atHub.filter((o) => o.meetsDeadline);
  const selected = fits.find((o) => o.portId === portId) ?? fits[0];
  const laterAtHub = atHub[0] && !atHub[0].meetsDeadline ? atHub[0] : null;
  const otherHubs = elsewhere.filter((o) => o.meetsDeadline).filter((o, i, arr) => arr.findIndex((x) => x.hubId === o.hubId) === i).slice(0, 3);

  const submit = () => {
    try {
      const result = ChargingService.registerCharging(input, selected?.portId);
      if (result.ok) navigate("/app/charging");
      else setError({ text: result.reason, suggestions: result.suggestions });
    } catch (e) {
      setError({ text: errorText(e, "Không thể đăng ký sạc."), suggestions: [] });
    }
  };

  const applySuggestion = (o: SlotOption) => {
    setError(null);
    if (o.hubId !== hubId) setHubId(o.hubId);
    if (!o.meetsDeadline || o.end > new Date(deadline).getTime()) {
      const needH = (o.end - now - startIn * 60_000) / 3_600_000;
      setDeadlineH(DEADLINE_HOURS.find((h) => h >= needH) ?? DEADLINE_HOURS[DEADLINE_HOURS.length - 1]);
    }
    setPortId(o.portId);
  };

  return (
    <div className="space-y-4">
      <div>
        <Link to="/app/charging" className="text-sm font-semibold text-brand-700">
          ← Lịch sạc của tôi
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-brand-950">Đăng ký sạc</h1>
        <p className="text-sm text-slate-500">Chọn xe, mức pin mong muốn và thời gian; hệ thống gán cổng sạc phù hợp.</p>
      </div>

      <Card title="Nhu cầu sạc">
        <div className="space-y-4 text-sm">
          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-700">Xe</span>
            <select className={inputClass} value={vehicleId} onChange={(e) => { setVehicleId(e.target.value); setError(null); }}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} · pin {v.battery}%
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-700">Hub</span>
            <select className={inputClass} value={hubId} disabled={!!vehicle.fixedHub} onChange={(e) => { setHubId(e.target.value); setPortId(null); setError(null); }}>
              {hubs.map((h) => (
                <option key={h.hubId} value={h.hubId}>
                  {h.name}
                </option>
              ))}
            </select>
            {vehicle.fixedHub && <span className="text-xs text-slate-500">Xe dùng chung chỉ sạc tại Hub đang đỗ.</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-700">
              Pin mục tiêu: <strong>{targetBattery}%</strong> <span className="font-normal text-slate-500">(hiện tại {vehicle.battery}%)</span>
            </span>
            <input type="range" min={minTarget} max={100} step={5} value={targetBattery} onChange={(e) => setTarget(Number(e.target.value))} />
          </label>
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-700">Muốn bắt đầu</span>
            <div className="flex flex-wrap gap-1">
              {START_OFFSETS.map((m) => (
                <Chip key={m} active={startIn === m} onClick={() => setStartIn(m)}>
                  {m === 0 ? "Ngay" : `+${fmtMinutes(m * 60_000)}`}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-700">Cần xong trước (deadline: {fmtTime(deadline)})</span>
            <div className="flex flex-wrap gap-1">
              {DEADLINE_HOURS.map((h) => (
                <Chip key={h} active={deadlineH === h} onClick={() => setDeadlineH(h)}>
                  {h} giờ
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card title={`Độ ưu tiên: ${priority.priority}/100`}>
        <p className="text-xs text-slate-500">{priority.reason}</p>
      </Card>

      <Card title="Cổng sạc & khung giờ">
        {fits.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {fits.slice(0, 4).map((o) => (
              <li key={o.portId}>
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 ring-1 ${selected?.portId === o.portId ? "bg-brand-50 ring-brand-700" : "ring-slate-200"}`}>
                  <input type="radio" name="port" checked={selected?.portId === o.portId} onChange={() => setPortId(o.portId)} />
                  <span className="flex-1">
                    <strong>{o.portId}</strong> · {o.kind === "FAST" ? "Nhanh" : "Thường"} {o.powerKw} kW
                    <span className="block text-xs text-slate-500">
                      {fmtTime(o.start)} – {fmtTime(o.end)} ({fmtMinutes(o.end - o.start)})
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-amber-800">Không còn cổng phù hợp tại Hub này kịp trước deadline.</p>
            <Suggestions later={laterAtHub} others={otherHubs} onPick={applySuggestion} />
          </div>
        )}
      </Card>

      {error && (
        <Card title="Không đăng ký được">
          <p className="text-sm text-rose-700">{error.text}</p>
          <div className="mt-2">
            <Suggestions later={error.suggestions.find((o) => o.hubId === hubId) ?? null} others={error.suggestions.filter((o) => o.hubId !== hubId)} onPick={applySuggestion} />
          </div>
        </Card>
      )}

      <Button className="w-full" onClick={submit}>
        Đăng ký sạc
      </Button>
    </div>
  );
}

function Suggestions({ later, others, onPick }: { later: SlotOption | null; others: SlotOption[]; onPick: (o: SlotOption) => void }) {
  if (!later && others.length === 0) return <p className="text-xs text-slate-500">Hiện không có phương án thay thế.</p>;
  return (
    <ul className="space-y-1">
      {later && (
        <li>
          <button type="button" className="text-left text-xs font-semibold text-brand-700" onClick={() => onPick(later)}>
            → Khung giờ khác: cổng {later.portId}, {fmtTime(later.start)} – {fmtTime(later.end)} (nới deadline)
          </button>
        </li>
      )}
      {others.map((o) => (
        <li key={o.portId}>
          <button type="button" className="text-left text-xs font-semibold text-brand-700" onClick={() => onPick(o)}>
            → Hub khác: {o.hubName}, cổng {o.portId}, {fmtTime(o.start)} – {fmtTime(o.end)}
          </button>
        </li>
      ))}
    </ul>
  );
}
