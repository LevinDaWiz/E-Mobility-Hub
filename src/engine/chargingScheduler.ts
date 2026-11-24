import { useStore, type AppState } from "../store";
import { notify } from "../services/notificationService";
import {
  HubOperationalStatus,
  PortKind,
  PortStatus,
  RequestStatus,
  SessionStatus,
  VehicleStatus,
  type ChargingPort,
  type ChargingRequest,
  type ChargingSession,
} from "../types";
import { BATTERY_CAPACITY_KWH } from "../config/constants";
import { makeId } from "../utils/id";

// ===== M3 sở hữu file này: bộ xếp lịch sạc (UC09, UC12, NIFR-05, NIFR-06) =====
// Mô hình: mỗi cổng sạc có một dòng thời gian gồm các phiên SCHEDULED / CHARGING (startTime → expectedEnd).
// Xếp lịch = tìm khoảng trống sớm nhất trên một cổng phù hợp đủ dài để sạc từ pin hiện tại tới pin mục tiêu.
// Trạng thái cổng suy ra từ phiên: có phiên CHARGING → CHARGING, có phiên SCHEDULED → RESERVED, còn lại FREE
// (cổng FAULTY / MAINTENANCE giữ nguyên, do M1/M4 đặt).

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// Lý do ưu tiên do vận hành đặt tay (UC12): bộ xếp lịch không tính lại priority của yêu cầu này nữa.
export const MANUAL_PRIORITY_PREFIX = "Vận hành đặt tay";

export const ACTIVE_SESSION_STATUSES: readonly SessionStatus[] = [SessionStatus.SCHEDULED, SessionStatus.CHARGING];
const isActive = (s: ChargingSession) => ACTIVE_SESSION_STATUSES.includes(s.status);

// ---------- Xe cần sạc (xe dùng chung hoặc xe cá nhân) ----------

export interface ChargeTarget {
  vehicleId: string;
  isShared: boolean;
  battery: number;
  capacityKwh: number;
  // FAST: dùng được mọi cổng; STANDARD: chỉ cổng STANDARD.
  portKind: PortKind;
  // Xe dùng chung chỉ sạc được tại Hub đang đỗ; xe cá nhân thì null (đi tới Hub nào cũng được).
  fixedHubId: string | null;
  ownerId: string | null;
  label: string;
}

export function getChargeTarget(vehicleId: string, s: AppState = useStore.getState()): ChargeTarget | null {
  const personal = s.personalVehicles.find((v) => v.vehicleId === vehicleId);
  if (personal) {
    return {
      vehicleId,
      isShared: false,
      battery: personal.batteryLevel,
      capacityKwh: personal.batteryCapacityKwh,
      portKind: personal.portKind,
      fixedHubId: null,
      ownerId: personal.ownerId,
      label: `${personal.model} (${personal.plateNumber})`,
    };
  }
  const shared = s.vehicles.find((v) => v.vehicleId === vehicleId);
  if (shared) {
    return {
      vehicleId,
      isShared: true,
      battery: shared.batteryLevel,
      capacityKwh: BATTERY_CAPACITY_KWH[shared.type],
      portKind: PortKind.FAST,
      fixedHubId: shared.currentHubId,
      ownerId: null,
      label: `Xe dùng chung ${vehicleId}`,
    };
  }
  return null;
}

export const isPortCompatible = (port: ChargingPort, target: Pick<ChargeTarget, "portKind">): boolean =>
  target.portKind === PortKind.FAST || port.kind === PortKind.STANDARD;

const isPortUsable = (port: ChargingPort) =>
  port.status !== PortStatus.FAULTY && port.status !== PortStatus.MAINTENANCE;

// Thời gian sạc (ms) = phần năng lượng cần nạp (kWh) / công suất cổng (kW). Tối thiểu 1 phút.
export function chargeDurationMs(fromPct: number, toPct: number, capacityKwh: number, powerKw: number): number {
  const kwh = (Math.max(0, toPct - fromPct) / 100) * capacityKwh;
  return Math.max(MINUTE, Math.round((kwh / powerKw) * HOUR));
}

// ---------- NIFR-05: độ ưu tiên ----------

export interface PriorityInput {
  vehicleId: string;
  deadline: string;
  createdAt?: string;
  battery?: number; // nếu không truyền thì đọc pin hiện tại của xe
}

// Công thức (thang 0–100, càng cao càng được xếp trước):
//   P = pin thấp + deadline gần + xe dùng chung + thời gian chờ
//   - Pin thấp:      (100 − pin%) × 0,4                          → tối đa 40 điểm
//   - Deadline gần:  ≤ 1 giờ: 35 điểm; từ 1 giờ tới 12 giờ giảm tuyến tính về 0
//   - Xe dùng chung: +20 điểm (cần sạc để cho sinh viên khác thuê)
//   - Chờ lâu:       +1 điểm mỗi 10 phút kể từ khi gửi yêu cầu, tối đa 5 điểm
// Ví dụ: xe cá nhân 18% pin, deadline sau 2 giờ, vừa gửi → 32,8 + 31,8 + 0 + 0 ≈ 65.
export function priorityBreakdown(r: PriorityInput, now: number = useStore.getState().clock.now) {
  const target = getChargeTarget(r.vehicleId);
  const battery = r.battery ?? target?.battery ?? 50;
  const batteryScore = (100 - battery) * 0.4;
  const hoursLeft = (new Date(r.deadline).getTime() - now) / HOUR;
  const deadlineScore = hoursLeft <= 1 ? 35 : Math.max(0, 35 * (1 - (hoursLeft - 1) / 11));
  const sharedScore = target?.isShared ? 20 : 0;
  const waitedMin = r.createdAt ? Math.max(0, (now - new Date(r.createdAt).getTime()) / MINUTE) : 0;
  const waitScore = Math.min(5, Math.floor(waitedMin / 10));
  const total = Math.round(Math.min(100, batteryScore + deadlineScore + sharedScore + waitScore));
  const parts = [
    `pin ${Math.round(battery)}% → ${batteryScore.toFixed(0)}`,
    `deadline ${hoursLeft <= 0 ? "đã qua" : `còn ${hoursLeft.toFixed(1)} giờ`} → ${deadlineScore.toFixed(0)}`,
  ];
  if (sharedScore) parts.push(`xe dùng chung → ${sharedScore}`);
  if (waitScore) parts.push(`chờ ${Math.round(waitedMin)} phút → ${waitScore}`);
  return { priority: total, reason: parts.join(", ") };
}

// ---------- Dòng thời gian cổng ----------

interface Interval {
  start: number;
  end: number;
}

function busyIntervals(portId: string, sessions: ChargingSession[], excludeSessionIds: Set<string>): Interval[] {
  return sessions
    .filter((s) => s.portId === portId && isActive(s) && !excludeSessionIds.has(s.sessionId))
    .map((s) => ({ start: new Date(s.startTime).getTime(), end: new Date(s.expectedEnd).getTime() }))
    .sort((a, b) => a.start - b.start);
}

// Thời điểm sớm nhất ≥ from mà cổng rảnh liên tục `duration` ms.
function earliestStart(busy: Interval[], from: number, duration: number): number {
  let t = from;
  for (const b of busy) {
    if (b.end <= t) continue;
    if (b.start >= t + duration) break;
    t = Math.max(t, b.end);
  }
  return t;
}

export interface SlotOption {
  hubId: string;
  hubName: string;
  portId: string;
  powerKw: number;
  kind: PortKind;
  start: number;
  end: number;
  meetsDeadline: boolean;
}

export interface FindOptionsParams {
  target: ChargeTarget;
  targetBattery: number;
  from: number;
  deadline: number;
  hubIds?: string[]; // giới hạn Hub; mặc định mọi Hub (xe dùng chung: chỉ Hub đang đỗ)
  sessions?: ChargingSession[];
  excludeSessionIds?: string[];
  excludePortIds?: string[];
}

// Mọi phương án (một phương án tốt nhất cho mỗi cổng phù hợp), sắp theo giờ xong sớm nhất.
export function findOptions(p: FindOptionsParams): SlotOption[] {
  const s = useStore.getState();
  const sessions = p.sessions ?? s.chargingSessions;
  const exclude = new Set(p.excludeSessionIds ?? []);
  const excludePorts = new Set(p.excludePortIds ?? []);
  const hubIds = p.target.fixedHubId ? [p.target.fixedHubId] : p.hubIds;
  const openHubs = new Map(
    s.hubs.filter((h) => h.operationalStatus === HubOperationalStatus.AVAILABLE).map((h) => [h.hubId, h.name]),
  );

  const options: SlotOption[] = [];
  for (const port of s.chargingPorts) {
    if (!openHubs.has(port.hubId) || (hubIds && !hubIds.includes(port.hubId))) continue;
    if (excludePorts.has(port.portId) || !isPortUsable(port) || !isPortCompatible(port, p.target)) continue;
    const duration = chargeDurationMs(p.target.battery, p.targetBattery, p.target.capacityKwh, port.powerKw);
    const start = earliestStart(busyIntervals(port.portId, sessions, exclude), p.from, duration);
    const end = start + duration;
    options.push({
      hubId: port.hubId,
      hubName: openHubs.get(port.hubId) ?? port.hubId,
      portId: port.portId,
      powerKw: port.powerKw,
      kind: port.kind,
      start,
      end,
      meetsDeadline: end <= p.deadline,
    });
  }
  return options.sort((a, b) => a.end - b.end || a.start - b.start);
}

// ---------- Đồng bộ trạng thái cổng ----------

export function syncPortStatuses(portIds?: string[]): void {
  const s = useStore.getState();
  const ids = portIds ? new Set(portIds) : null;
  for (const port of s.chargingPorts) {
    if (ids && !ids.has(port.portId)) continue;
    if (!isPortUsable(port)) continue;
    const onPort = s.chargingSessions.filter((cs) => cs.portId === port.portId);
    const next = onPort.some((cs) => cs.status === SessionStatus.CHARGING)
      ? PortStatus.CHARGING
      : onPort.some((cs) => cs.status === SessionStatus.SCHEDULED)
        ? PortStatus.RESERVED
        : PortStatus.FREE;
    if (port.status !== next) s.updateChargingPort(port.portId, { status: next, updatedAt: new Date(s.clock.now).toISOString() });
  }
}

// ---------- Xếp lịch ----------

export interface ScheduleOutcome {
  sessions: ChargingSession[]; // phiên SCHEDULED mới / đã dời
  unscheduled: { request: ChargingRequest; reason: string }[];
}

function sortByPriority(requests: ChargingRequest[]): ChargingRequest[] {
  return [...requests].sort(
    (a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt) || a.requestId.localeCompare(b.requestId),
  );
}

// Xếp tham lam theo priority giảm dần: yêu cầu ưu tiên cao chọn trước cổng/khung giờ xong sớm nhất.
// Phiên đang hoạt động không nằm trong `requests` được giữ nguyên làm vật cản. Chỉ tính toán, không ghi store.
export function buildSchedule(requests: ChargingRequest[], ports: ChargingPort[]): ScheduleOutcome {
  const s = useStore.getState();
  const now = s.clock.now;
  const requestIds = new Set(requests.map((r) => r.requestId));
  // Phiên SCHEDULED của chính các yêu cầu đang xếp thì bỏ ra để xếp lại.
  const replaced = s.chargingSessions.filter((cs) => cs.status === SessionStatus.SCHEDULED && cs.requestId && requestIds.has(cs.requestId));
  const working = s.chargingSessions.filter((cs) => !replaced.includes(cs));
  const portIds = ports.map((p) => p.portId);
  const hubIds = [...new Set(ports.map((p) => p.hubId))];

  const outcome: ScheduleOutcome = { sessions: [], unscheduled: [] };
  for (const request of sortByPriority(requests)) {
    const target = getChargeTarget(request.vehicleId, s);
    if (!target) {
      outcome.unscheduled.push({ request, reason: "Không tìm thấy xe." });
      continue;
    }
    if (target.battery >= request.targetBattery) {
      outcome.unscheduled.push({ request, reason: "Pin đã đạt mức mục tiêu." });
      continue;
    }
    const deadline = new Date(request.deadline).getTime();
    const options = findOptions({
      target,
      targetBattery: request.targetBattery,
      from: Math.max(now, new Date(request.desiredStart).getTime()),
      deadline,
      hubIds,
      sessions: working,
    }).filter((o) => portIds.includes(o.portId) && o.meetsDeadline);
    const best = options[0];
    if (!best) {
      outcome.unscheduled.push({ request, reason: "Không còn cổng phù hợp kịp trước deadline." });
      continue;
    }
    const previous = replaced.find((cs) => cs.requestId === request.requestId);
    const session: ChargingSession = {
      sessionId: previous?.sessionId ?? makeId("CS"),
      startTime: new Date(best.start).toISOString(),
      endTime: null,
      expectedEnd: new Date(best.end).toISOString(),
      startBattery: target.battery,
      currentBattery: target.battery,
      targetBattery: request.targetBattery,
      status: SessionStatus.SCHEDULED,
      portId: best.portId,
      vehicleId: request.vehicleId,
      requestId: request.requestId,
      rescheduledFrom: previous && previous.portId !== best.portId ? previous.portId : (previous?.rescheduledFrom ?? null),
    };
    working.push(session);
    outcome.sessions.push(session);
  }
  return outcome;
}

// Ghi kết quả buildSchedule vào store: phiên → SCHEDULED, yêu cầu → SCHEDULED (hub theo cổng được gán).
// Yêu cầu không xếp được và đang có phiên SCHEDULED cũ → phiên cũ bị huỷ, yêu cầu về PENDING để thử lại sau.
export function applySchedule(plan: ScheduleOutcome): void {
  const s = useStore.getState();
  const touchedPorts = new Set<string>();
  for (const session of plan.sessions) {
    const old = s.chargingSessions.find((cs) => cs.sessionId === session.sessionId);
    if (old) touchedPorts.add(old.portId);
    touchedPorts.add(session.portId);
    s.upsertChargingSession(session);
    const request = s.chargingRequests.find((r) => r.requestId === session.requestId);
    const port = s.chargingPorts.find((p) => p.portId === session.portId);
    if (request) s.upsertChargingRequest({ ...request, status: RequestStatus.SCHEDULED, hubId: port?.hubId ?? request.hubId });
  }
  for (const { request } of plan.unscheduled) {
    const old = useStore.getState().chargingSessions.find((cs) => cs.requestId === request.requestId && cs.status === SessionStatus.SCHEDULED);
    if (old) {
      touchedPorts.add(old.portId);
      s.upsertChargingSession({ ...old, status: SessionStatus.CANCELLED, endTime: new Date(s.clock.now).toISOString() });
    }
    if (request.status !== RequestStatus.PENDING) s.upsertChargingRequest({ ...request, status: RequestStatus.PENDING });
  }
  syncPortStatuses([...touchedPorts]);
}

// UC12: chạy lại buildSchedule cho cả Hub. Phiên đang sạc giữ nguyên; mọi phiên SCHEDULED chưa bắt đầu và yêu cầu
// PENDING tại Hub được tính lại priority (trừ priority vận hành đặt tay) và xếp lại theo thứ tự ưu tiên.
export function rebuildHubSchedule(hubId: string): ScheduleOutcome {
  const s = useStore.getState();
  const ports = s.chargingPorts.filter((p) => p.hubId === hubId);
  const portIds = new Set(ports.map((p) => p.portId));
  const scheduledRequestIds = new Set(
    s.chargingSessions.filter((cs) => cs.status === SessionStatus.SCHEDULED && portIds.has(cs.portId)).map((cs) => cs.requestId),
  );
  const requests = s.chargingRequests
    .filter(
      (r) =>
        (r.status === RequestStatus.SCHEDULED && scheduledRequestIds.has(r.requestId)) ||
        (r.status === RequestStatus.PENDING && r.hubId === hubId),
    )
    .map((r) => refreshPriority(r));
  requests.forEach((r) => s.upsertChargingRequest(r));
  const plan = buildSchedule(requests, ports);
  applySchedule(plan);
  return plan;
}

export function refreshPriority(r: ChargingRequest): ChargingRequest {
  if (r.priorityReason.startsWith(MANUAL_PRIORITY_PREFIX)) return r;
  const { priority, reason } = priorityBreakdown(r);
  return { ...r, priority, priorityReason: reason };
}

// ---------- NIFR-06: xếp lại khi xung đột (cổng lỗi / bảo trì) ----------

// Tìm cổng khác cho phiên bị ảnh hưởng: ưu tiên cùng Hub, không có thì Hub khác (REDIRECT, chỉ xe cá nhân).
// - Phiên CHARGING: phiên cũ → INTERRUPTED (ghi nhận gián đoạn), tạo phiên mới nối tiếp từ mức pin hiện tại.
// - Phiên SCHEDULED: dời chính phiên đó sang cổng/khung giờ mới.
// Trả phiên mới (hoặc phiên đã dời); null nếu không tìm được cổng nào (phiên → INTERRUPTED, yêu cầu → PENDING).
export function rescheduleOnConflict(sessionId: string): ChargingSession | null {
  const s = useStore.getState();
  const nowIso = new Date(s.clock.now).toISOString();
  const session = s.chargingSessions.find((cs) => cs.sessionId === sessionId);
  if (!session || !isActive(session)) return null;
  const target = getChargeTarget(session.vehicleId, s);
  const request = session.requestId ? s.chargingRequests.find((r) => r.requestId === session.requestId) : undefined;
  const oldPort = s.chargingPorts.find((p) => p.portId === session.portId);
  const oldHubId = oldPort?.hubId ?? request?.hubId ?? "";
  const studentId = request?.studentId ?? target?.ownerId ?? null;
  const battery = session.status === SessionStatus.CHARGING ? session.currentBattery : (target?.battery ?? session.currentBattery);

  const fail = (): null => {
    s.upsertChargingSession({ ...session, status: SessionStatus.INTERRUPTED, endTime: nowIso, currentBattery: battery });
    if (request) s.upsertChargingRequest({ ...request, status: RequestStatus.PENDING });
    releaseSharedVehicle(session.vehicleId);
    syncPortStatuses([session.portId]);
    const msg = `Phiên sạc ${session.sessionId} (xe ${session.vehicleId}) bị gián đoạn tại cổng ${session.portId}, chưa tìm được cổng thay thế. Yêu cầu được đưa lại hàng chờ.`;
    if (studentId) notify(studentId, msg, "warning");
    notify("role:OPERATOR", msg, "warning");
    return null;
  };
  if (!target) return fail();

  const deadline = request ? new Date(request.deadline).getTime() : s.clock.now + 12 * HOUR;
  const base = {
    target: { ...target, battery },
    targetBattery: session.targetBattery,
    from: Math.max(s.clock.now, session.status === SessionStatus.SCHEDULED ? new Date(session.startTime).getTime() : 0),
    deadline,
    excludeSessionIds: [session.sessionId],
    excludePortIds: [session.portId],
  };
  // Cùng Hub trước (kịp deadline thì tốt, không thì lấy phương án sớm nhất), rồi tới Hub khác.
  const sameHub = findOptions({ ...base, hubIds: [oldHubId] });
  const otherHubs = target.fixedHubId ? [] : findOptions(base).filter((o) => o.hubId !== oldHubId);
  const best =
    sameHub.find((o) => o.meetsDeadline) ?? otherHubs.find((o) => o.meetsDeadline) ?? sameHub[0] ?? otherHubs[0];
  if (!best) return fail();

  const startsNow = best.start <= s.clock.now;
  let next: ChargingSession;
  if (session.status === SessionStatus.CHARGING) {
    s.upsertChargingSession({ ...session, status: SessionStatus.INTERRUPTED, endTime: nowIso });
    next = {
      sessionId: makeId("CS"),
      startTime: new Date(best.start).toISOString(),
      endTime: null,
      expectedEnd: new Date(best.end).toISOString(),
      startBattery: battery,
      currentBattery: battery,
      targetBattery: session.targetBattery,
      status: SessionStatus.SCHEDULED,
      portId: best.portId,
      vehicleId: session.vehicleId,
      requestId: session.requestId,
      rescheduledFrom: session.portId,
    };
    if (!startsNow) releaseSharedVehicle(session.vehicleId);
  } else {
    next = {
      ...session,
      startTime: new Date(best.start).toISOString(),
      expectedEnd: new Date(best.end).toISOString(),
      portId: best.portId,
      rescheduledFrom: session.portId,
    };
  }
  s.upsertChargingSession(next);
  if (request) s.upsertChargingRequest({ ...request, status: RequestStatus.SCHEDULED, hubId: best.hubId });
  syncPortStatuses([session.portId, best.portId]);

  const redirected = best.hubId !== oldHubId;
  const when = new Date(best.start).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const msg = redirected
    ? `Cổng ${session.portId} gặp sự cố. Lịch sạc xe ${session.vehicleId} được chuyển sang ${best.hubName}, cổng ${best.portId}, bắt đầu ${when}.`
    : `Cổng ${session.portId} gặp sự cố. Lịch sạc xe ${session.vehicleId} được chuyển sang cổng ${best.portId}, bắt đầu ${when}.`;
  if (studentId) notify(studentId, msg + (best.meetsDeadline ? "" : " Lưu ý: không kịp deadline đã đăng ký."), "warning");
  if (redirected) notify("role:OPERATOR", `[REDIRECT] ${msg}`, "info");
  return next;
}

function releaseSharedVehicle(vehicleId: string): void {
  const s = useStore.getState();
  const v = s.vehicles.find((x) => x.vehicleId === vehicleId);
  if (v?.status === VehicleStatus.CHARGING) s.updateVehicle(vehicleId, { status: VehicleStatus.AVAILABLE });
}

// Giữ object cũ cho các module đang import (M4 gọi ChargingScheduler.rescheduleOnConflict).
export const ChargingScheduler = {
  calculatePriority: (r: PriorityInput): number => priorityBreakdown(r).priority,
  priorityBreakdown,
  buildSchedule,
  applySchedule,
  rebuildHubSchedule,
  rescheduleOnConflict,
  findOptions,
  syncPortStatuses,
};
