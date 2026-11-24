import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, Progress } from "../../../components/ui";
import { ChargingService } from "../../../services/chargingService";
import { useStore } from "../../../store";
import { RequestStatus, SessionStatus, type ChargingRequest, type ChargingSession } from "../../../types";
import { REQUEST_LABELS, SESSION_LABELS, errorText, fmtMinutes, fmtTime } from "./shared";

const ACTIVE_REQ = [RequestStatus.PENDING, RequestStatus.SCHEDULED];

// UC10: theo dõi yêu cầu, trạng thái phiên sạc, tiến độ pin và giờ dự kiến xong.
export function MyChargingPage() {
  const userId = useStore((s) => s.currentUser.userId);
  const requests = useStore((s) => s.chargingRequests);
  const sessions = useStore((s) => s.chargingSessions);
  const hubs = useStore((s) => s.hubs);
  const ports = useStore((s) => s.chargingPorts);
  const now = useStore((s) => s.clock.now);
  const [message, setMessage] = useState<string | null>(null);

  const mine = requests.filter((r) => r.studentId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = mine.filter((r) => ACTIVE_REQ.includes(r.status));
  const history = mine.filter((r) => !ACTIVE_REQ.includes(r.status)).slice(0, 8);
  const hubName = (id: string) => hubs.find((h) => h.hubId === id)?.name ?? id;
  const sessionsOf = (r: ChargingRequest) =>
    sessions.filter((cs) => cs.requestId === r.requestId).sort((a, b) => b.startTime.localeCompare(a.startTime));

  const cancel = (r: ChargingRequest) => {
    try {
      ChargingService.cancelRequest(r.requestId);
      setMessage(`Đã huỷ yêu cầu sạc xe ${r.vehicleId}.`);
    } catch (e) {
      setMessage(errorText(e, "Không thể huỷ."));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-brand-950">Lịch sạc của tôi</h1>
          <p className="text-sm text-slate-500">Theo dõi yêu cầu, trạng thái và thời gian sạc.</p>
        </div>
        <Link to="/app/charging/new" className="shrink-0 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white">
          + Đăng ký sạc
        </Link>
      </div>

      {message && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}

      {active.length === 0 && (
        <Card>
          <p className="text-sm text-slate-600">Bạn chưa có yêu cầu sạc nào đang hoạt động.</p>
        </Card>
      )}

      {active.map((r) => {
        const [current, ...older] = sessionsOf(r);
        return (
          <Card
            key={r.requestId}
            title={`Xe ${r.vehicleId}`}
            actions={<Badge value={current?.status ?? r.status} label={current ? SESSION_LABELS[current.status] : REQUEST_LABELS[r.status]} />}
          >
            {current ? (
              <SessionDetail session={current} hubName={hubName(ports.find((p) => p.portId === current.portId)?.hubId ?? r.hubId)} now={now} />
            ) : (
              <p className="text-sm text-amber-800">Đang chờ cổng trống tại {hubName(r.hubId)}. Hệ thống sẽ tự xếp lịch theo độ ưu tiên.</p>
            )}
            {older.some((o) => o.status === SessionStatus.INTERRUPTED) && (
              <p className="mt-2 text-xs text-rose-700">Phiên trước bị gián đoạn do cổng sạc gặp sự cố, đã được xếp lại.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Ưu tiên {r.priority}/100 · Deadline {fmtTime(r.deadline)}
            </p>
            <div className="mt-3">
              <Button size="sm" variant="secondary" onClick={() => cancel(r)}>
                {current?.status === SessionStatus.CHARGING ? "Dừng sạc" : "Huỷ yêu cầu"}
              </Button>
            </div>
          </Card>
        );
      })}

      {history.length > 0 && (
        <Card title="Lịch sử">
          <ul className="divide-y divide-slate-100 text-sm">
            {history.map((r) => {
              const last = sessionsOf(r)[0];
              return (
                <li key={r.requestId} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    Xe {r.vehicleId} · {hubName(r.hubId)}
                    <span className="block truncate text-xs text-slate-500">
                      {fmtTime(r.createdAt)}
                      {last && ` · pin ${Math.round(last.startBattery)}% → ${Math.round(last.currentBattery)}%`}
                      {r.status === RequestStatus.REJECTED && ` · ${r.priorityReason.split("Từ chối: ")[1] ?? ""}`}
                    </span>
                  </span>
                  <Badge value={r.status} label={REQUEST_LABELS[r.status]} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function SessionDetail({ session, hubName, now }: { session: ChargingSession; hubName: string; now: number }) {
  const finish = ChargingService.getEstimatedFinish(session);
  const charging = session.status === SessionStatus.CHARGING;
  return (
    <div className="space-y-2 text-sm">
      <p className="text-slate-700">
        {hubName} · cổng <strong>{session.portId}</strong>
        {session.rescheduledFrom && <span className="text-xs text-slate-500"> (chuyển từ {session.rescheduledFrom})</span>}
      </p>
      <Progress
        value={session.currentBattery}
        label={`Pin ${Math.round(session.currentBattery)}% / mục tiêu ${session.targetBattery}%`}
        barClassName={charging ? "bg-violet-500" : "bg-slate-400"}
      />
      <p className="text-xs text-slate-600">
        {charging
          ? `Dự kiến xong ${fmtTime(finish)} (còn ${fmtMinutes(new Date(finish).getTime() - now)})`
          : `Bắt đầu ${fmtTime(session.startTime)} (sau ${fmtMinutes(new Date(session.startTime).getTime() - now)}) · dự kiến xong ${fmtTime(finish)}`}
      </p>
    </div>
  );
}
