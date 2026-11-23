import { useState } from "react";
import { Badge, Button, Card, Modal, Progress, StatCard, Table, type Column } from "../../../components/ui";
import { MANUAL_PRIORITY_PREFIX, rebuildHubSchedule } from "../../../engine/chargingScheduler";
import { ChargingService } from "../../../services/chargingService";
import { useStore } from "../../../store";
import { PortStatus, RequestStatus, SessionStatus, type ChargingRequest, type ChargingSession } from "../../../types";
import { naturalCompare } from "../../../utils/format";

const MIN = 60_000;
const WINDOW_BEFORE = 30 * MIN;
const WINDOW_AFTER = 3 * 60 * MIN;

const SESSION_LABELS: Record<SessionStatus, string> = {
  [SessionStatus.SCHEDULED]: "Đã xếp lịch",
  [SessionStatus.CHARGING]: "Đang sạc",
  [SessionStatus.COMPLETED]: "Hoàn tất",
  [SessionStatus.INTERRUPTED]: "Gián đoạn",
  [SessionStatus.CANCELLED]: "Đã huỷ",
};
const PORT_LABELS: Record<PortStatus, string> = {
  [PortStatus.FREE]: "Trống",
  [PortStatus.RESERVED]: "Đã giữ",
  [PortStatus.CHARGING]: "Đang sạc",
  [PortStatus.FAULTY]: "Lỗi",
  [PortStatus.MAINTENANCE]: "Bảo trì",
};

const fmt = (iso: string | number) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

type Row = { session: ChargingSession; request?: ChargingRequest };

// UC12: quản lý lịch sạc theo Hub / cổng (NIFR-05 ưu tiên, NIFR-06 xếp lại).
export function ChargingSchedulePage() {
  const hubs = useStore((s) => s.hubs);
  const ports = useStore((s) => s.chargingPorts);
  const sessions = useStore((s) => s.chargingSessions);
  const requests = useStore((s) => s.chargingRequests);
  const students = useStore((s) => s.students);
  const now = useStore((s) => s.clock.now);

  const [hubId, setHubId] = useState(hubs[0]?.hubId ?? "");
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState<ChargingRequest | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const hubPorts = ports.filter((p) => p.hubId === hubId).sort((a, b) => naturalCompare(a.portId, b.portId));
  const portIds = new Set(hubPorts.map((p) => p.portId));
  const reqById = new Map(requests.map((r) => [r.requestId, r]));
  const hubSessions = sessions.filter((cs) => portIds.has(cs.portId));
  const activeSessions = hubSessions.filter((cs) => cs.status === SessionStatus.SCHEDULED || cs.status === SessionStatus.CHARGING);
  const rows: Row[] = (showHistory ? hubSessions : activeSessions)
    .map((session) => ({ session, request: session.requestId ? reqById.get(session.requestId) : undefined }))
    .sort((a, b) => a.session.startTime.localeCompare(b.session.startTime));
  const waiting = requests.filter((r) => r.hubId === hubId && (r.status === RequestStatus.PENDING || r.status === RequestStatus.REJECTED)).sort((a, b) => b.priority - a.priority);
  const studentName = (id: string | null | undefined) => (id ? (students.find((s) => s.studentId === id)?.name ?? id) : "Hệ thống");

  const act = (fn: () => string) => {
    try {
      setMessage({ ok: true, text: fn() });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Thao tác không thành công." });
    }
  };

  const rebuild = () =>
    act(() => {
      const plan = rebuildHubSchedule(hubId);
      return `Đã xếp lại ${plan.sessions.length} phiên theo độ ưu tiên${plan.unscheduled.length ? `; ${plan.unscheduled.length} yêu cầu chưa xếp được (chờ cổng trống)` : ""}.`;
    });

  const columns: Column<Row>[] = [
    { header: "Phiên", cell: ({ session }) => <span className="font-mono text-xs">{session.sessionId}</span> },
    {
      header: "Xe / Sinh viên",
      cell: ({ session, request }) => (
        <span>
          {session.vehicleId}
          <span className="block text-xs text-slate-500">{studentName(request?.studentId)}</span>
        </span>
      ),
    },
    {
      header: "Cổng",
      cell: ({ session }) => (
        <span>
          {session.portId.split("-").pop()}
          {session.rescheduledFrom && <span className="block text-xs text-amber-700">từ {session.rescheduledFrom.split("-").pop()}</span>}
        </span>
      ),
    },
    {
      header: "Ưu tiên",
      cell: ({ request }) =>
        request ? (
          <span title={request.priorityReason}>
            <strong>{request.priority}</strong>
            {request.priorityReason.startsWith(MANUAL_PRIORITY_PREFIX) && <span className="block text-xs text-slate-500">đặt tay</span>}
          </span>
        ) : (
          "—"
        ),
    },
    { header: "Khung giờ", cell: ({ session }) => `${fmt(session.startTime)} – ${fmt(ChargingService.getEstimatedFinish(session))}` },
    {
      header: "Pin",
      className: "min-w-32",
      cell: ({ session }) => <Progress value={session.currentBattery} label={`→ ${session.targetBattery}%`} barClassName="bg-violet-500" />,
    },
    { header: "Trạng thái", cell: ({ session }) => <Badge value={session.status} label={SESSION_LABELS[session.status]} /> },
    {
      header: "Thao tác",
      cell: ({ session, request }) =>
        session.status === SessionStatus.SCHEDULED || session.status === SessionStatus.CHARGING ? (
          <div className="flex flex-wrap gap-1">
            {request && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(request)}>
                Ưu tiên
              </Button>
            )}
            {session.status === SessionStatus.SCHEDULED && (
              <Button size="sm" variant="secondary" onClick={() => act(() => `Đã dời phiên sang ${fmt(ChargingService.postponeSession(session.sessionId, 15).startTime)}.`)}>
                Dời 15′
              </Button>
            )}
            {request && (
              <Button size="sm" variant="danger" onClick={() => act(() => (ChargingService.cancelRequest(request.requestId, "OPERATOR"), `Đã huỷ phiên ${session.sessionId}.`))}>
                Huỷ
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  const from = now - WINDOW_BEFORE;
  const span = WINDOW_BEFORE + WINDOW_AFTER;
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - from) / span) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sạc & Lịch sạc</h1>
          <p className="text-sm text-slate-500">Quản lý lịch sạc theo Hub / cổng – ưu tiên (NIFR-05) và xếp lại khi xung đột (NIFR-06).</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-lg border border-slate-300 bg-white p-2 text-sm" value={hubId} onChange={(e) => { setHubId(e.target.value); setMessage(null); }}>
            {hubs.map((h) => (
              <option key={h.hubId} value={h.hubId}>
                {h.name}
              </option>
            ))}
          </select>
          <Button onClick={rebuild}>Xếp lại lịch Hub</Button>
        </div>
      </div>

      {message && (
        <p className={`rounded-lg p-3 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{message.text}</p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Cổng hoạt động" value={`${hubPorts.filter((p) => p.status !== PortStatus.FAULTY && p.status !== PortStatus.MAINTENANCE).length}/${hubPorts.length}`} />
        <StatCard label="Đang sạc" value={activeSessions.filter((s) => s.status === SessionStatus.CHARGING).length} />
        <StatCard label="Đã xếp lịch" value={activeSessions.filter((s) => s.status === SessionStatus.SCHEDULED).length} />
        <StatCard label="Cổng lỗi / bảo trì" value={hubPorts.filter((p) => p.status === PortStatus.FAULTY || p.status === PortStatus.MAINTENANCE).length} tone="danger" />
      </div>

      <Card title={`Bảng thời gian cổng sạc (${fmt(from)} – ${fmt(now + WINDOW_AFTER)})`}>
        <div className="space-y-2">
          {hubPorts.length === 0 && <p className="text-sm text-slate-500">Hub chưa có cổng sạc.</p>}
          {hubPorts.map((port) => {
            const blocked = port.status === PortStatus.FAULTY || port.status === PortStatus.MAINTENANCE;
            return (
              <div key={port.portId} className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-xs">
                  <span className="font-semibold text-slate-800">{port.portId.split("-").pop()}</span>{" "}
                  <span className="text-slate-500">
                    {port.kind === "FAST" ? "Nhanh" : "Thường"} {port.powerKw} kW
                  </span>
                  <div className="mt-0.5">
                    <Badge value={port.status} label={PORT_LABELS[port.status]} />
                  </div>
                </div>
                <div className={`relative h-8 flex-1 overflow-hidden rounded-md ${blocked ? "bg-rose-50 ring-1 ring-rose-200" : "bg-slate-100"}`}>
                  <div className="absolute inset-y-0 w-px bg-rose-500" style={{ left: `${pct(now)}%` }} title="Bây giờ" />
                  {activeSessions
                    .filter((cs) => cs.portId === port.portId)
                    .map((cs) => {
                      const start = new Date(cs.startTime).getTime();
                      const end = new Date(ChargingService.getEstimatedFinish(cs)).getTime();
                      const left = pct(start);
                      const width = Math.max(1.5, pct(end) - left);
                      return (
                        <div
                          key={cs.sessionId}
                          className={`absolute inset-y-1 truncate rounded px-1 text-[10px] leading-6 text-white ${cs.status === SessionStatus.CHARGING ? "bg-violet-500" : "bg-sky-500"}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${cs.vehicleId}: ${fmt(start)} – ${fmt(end)}`}
                        >
                          {cs.vehicleId}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card
        title="Phiên sạc"
        actions={
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} /> Hiện cả phiên đã kết thúc
          </label>
        }
      >
        <Table columns={columns} rows={rows} rowKey={(r) => r.session.sessionId} empty="Không có phiên sạc nào." />
      </Card>

      <Card title="Yêu cầu chờ xếp lịch / bị từ chối">
        {waiting.length === 0 ? (
          <p className="text-sm text-slate-500">Không có yêu cầu nào đang chờ.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {waiting.map((r) => (
              <li key={r.requestId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <strong>{r.vehicleId}</strong> · {studentName(r.studentId)} · ưu tiên {r.priority} · deadline {fmt(r.deadline)}
                  <span className="block text-xs text-slate-500">{r.priorityReason}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge value={r.status} />
                  {r.status === RequestStatus.PENDING && (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>
                      Ưu tiên
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <PriorityModal
          request={editing}
          onClose={() => setEditing(null)}
          onSave={(value, rebuildAfter) => {
            act(() => {
              ChargingService.setPriority(editing.requestId, value);
              if (rebuildAfter) rebuildHubSchedule(hubId);
              return `Đã đặt ưu tiên ${value} cho xe ${editing.vehicleId}${rebuildAfter ? " và xếp lại lịch Hub" : ""}.`;
            });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PriorityModal({ request, onClose, onSave }: { request: ChargingRequest; onClose: () => void; onSave: (value: number, rebuild: boolean) => void }) {
  const [value, setValue] = useState(request.priority);
  const [rebuild, setRebuild] = useState(true);
  return (
    <Modal
      open
      title={`Độ ưu tiên – xe ${request.vehicleId}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={() => onSave(value, rebuild)}>Lưu</Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-xs text-slate-500">Hiện tại: {request.priorityReason}</p>
        <label className="flex flex-col gap-1">
          <span className="font-medium text-slate-700">
            Ưu tiên mới: <strong>{value}</strong>
          </span>
          <input type="range" min={0} max={100} value={value} onChange={(e) => setValue(Number(e.target.value))} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={rebuild} onChange={(e) => setRebuild(e.target.checked)} /> Xếp lại lịch Hub ngay sau khi lưu
        </label>
      </div>
    </Modal>
  );
}
