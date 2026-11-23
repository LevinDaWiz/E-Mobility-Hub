import {
  MANUAL_PRIORITY_PREFIX,
  applySchedule,
  buildSchedule,
  chargeDurationMs,
  findOptions,
  getChargeTarget,
  priorityBreakdown,
  refreshPriority,
  rescheduleOnConflict,
  syncPortStatuses,
  type SlotOption,
} from "../engine/chargingScheduler";
import { useStore } from "../store";
import {
  AlertSeverity,
  PortStatus,
  RequestStatus,
  SessionStatus,
  VehicleStatus,
  type ChargingRequest,
  type ChargingSession,
} from "../types";
import { computeHubStats } from "../utils/hubStats";
import { makeId } from "../utils/id";
import { simNowIso } from "../utils/time";
import { notify } from "./notificationService";
import { OperationsService } from "./operationsService";

// ===== M3 sở hữu file này: yêu cầu sạc & phiên sạc (UC05, UC09, UC10, UC12) =====
// Vòng đời yêu cầu: PENDING → SCHEDULED → COMPLETED, hoặc REJECTED / CANCELLED.
// Vòng đời phiên:   SCHEDULED → CHARGING → COMPLETED, hoặc INTERRUPTED (cổng lỗi) / CANCELLED.
// Tiến độ sạc chạy trong tick (engine/m3Handlers.ts → ChargingService.tick).

const MINUTE = 60_000;
const RETRY_PENDING_EVERY_MS = 5_000;

export type ChargingRequestInput = Pick<
  ChargingRequest,
  "vehicleId" | "targetBattery" | "desiredStart" | "deadline" | "hubId" | "studentId"
>;

export type ScheduleResult =
  | { ok: true; request: ChargingRequest; session: ChargingSession; displaced: ChargingRequest[] }
  | { ok: false; request: ChargingRequest; reason: string; suggestions: SlotOption[] };

const ACTIVE_REQUEST = [RequestStatus.PENDING, RequestStatus.SCHEDULED];

const state = () => useStore.getState();
const hubName = (hubId: string) => state().hubs.find((h) => h.hubId === hubId)?.name ?? hubId;
const fmtTime = (ms: number | string) =>
  new Date(ms).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

function requestOf(session: ChargingSession): ChargingRequest | undefined {
  return session.requestId ? state().chargingRequests.find((r) => r.requestId === session.requestId) : undefined;
}

function ownerOf(session: ChargingSession): string | null {
  return requestOf(session)?.studentId ?? getChargeTarget(session.vehicleId)?.ownerId ?? null;
}

// Hub vượt ngưỡng quá tải sạc (Hub.thresholds.chargingOverload) → cảnh báo cho vận hành (M4).
function checkChargingLoad(hubId: string): void {
  const s = state();
  const hub = s.hubs.find((h) => h.hubId === hubId);
  if (!hub) return;
  const stats = computeHubStats(s, hubId);
  if (stats.totalPorts > 0 && stats.chargingUtilization >= hub.thresholds.chargingOverload) {
    OperationsService.raiseAlert(
      hubId,
      "CHARGING_OVERLOAD",
      AlertSeverity.WARNING,
      `Cổng sạc tại ${hub.name} đã dùng/giữ ${Math.round(stats.chargingUtilization * 100)}%`,
    );
  }
}

let lastPendingRetry = 0;
let lastProgressAt: number | null = null;

export const ChargingService = {
  // UC05: tạo yêu cầu sạc PENDING kèm priority (NIFR-05). M2 gọi sau khi trả xe; tick sẽ tự xếp lịch nếu chưa xếp.
  submitChargingRequest(input: ChargingRequestInput): ChargingRequest {
    const s = state();
    const target = getChargeTarget(input.vehicleId, s);
    if (!target) throw new Error("Không tìm thấy xe.");
    if (input.targetBattery <= target.battery) throw new Error(`Pin hiện tại (${target.battery}%) đã đạt mức mục tiêu.`);
    if (input.targetBattery > 100) throw new Error("Pin mục tiêu tối đa 100%.");
    if (new Date(input.deadline).getTime() <= new Date(input.desiredStart).getTime()) {
      throw new Error("Deadline phải sau giờ mong muốn bắt đầu.");
    }
    if (s.chargingRequests.some((r) => r.vehicleId === input.vehicleId && ACTIVE_REQUEST.includes(r.status))) {
      throw new Error("Xe này đã có yêu cầu sạc đang chờ hoặc đã xếp lịch.");
    }
    if (target.isShared && target.fixedHubId) input = { ...input, hubId: target.fixedHubId };

    const createdAt = simNowIso();
    const { priority, reason } = priorityBreakdown({ ...input, createdAt, battery: target.battery });
    const request: ChargingRequest = {
      requestId: makeId("CR"),
      ...input,
      priority,
      priorityReason: reason,
      createdAt,
      status: RequestStatus.PENDING,
    };
    s.upsertChargingRequest(request);
    return request;
  },

  // Xem trước phương án cho form UC05/UC09 (không ghi store).
  previewOptions(input: Pick<ChargingRequestInput, "vehicleId" | "targetBattery" | "desiredStart" | "deadline"> & { hubId?: string }) {
    const s = state();
    const target = getChargeTarget(input.vehicleId, s);
    if (!target) return { atHub: [] as SlotOption[], elsewhere: [] as SlotOption[] };
    const base = {
      target,
      targetBattery: input.targetBattery,
      from: Math.max(s.clock.now, new Date(input.desiredStart).getTime()),
      deadline: new Date(input.deadline).getTime(),
    };
    const atHub = input.hubId || target.fixedHubId ? findOptions({ ...base, hubIds: input.hubId ? [input.hubId] : undefined }) : [];
    const elsewhere = target.fixedHubId
      ? []
      : findOptions(base).filter((o) => o.hubId !== input.hubId);
    return { atHub, elsewhere };
  },

  // UC09: gán cổng + khung giờ cho yêu cầu. Ưu tiên cổng người dùng đã chọn (preferredPortId) nếu vẫn hợp lệ.
  // Nếu Hub không còn chỗ trước deadline: xếp lại các phiên chưa bắt đầu tại Hub theo priority; yêu cầu mới chỉ
  // chen được khi những yêu cầu bị đẩy ra có priority THẤP hơn. Không được → REJECTED + gợi ý khung giờ/Hub khác.
  scheduleCharging(requestId: string, preferredPortId?: string): ScheduleResult {
    const s = state();
    const found = s.chargingRequests.find((r) => r.requestId === requestId);
    if (!found) throw new Error("Không tìm thấy yêu cầu sạc.");
    const request = refreshPriority(found);
    s.upsertChargingRequest(request);
    const target = getChargeTarget(request.vehicleId, s);
    const from = Math.max(s.clock.now, new Date(request.desiredStart).getTime());
    const deadline = new Date(request.deadline).getTime();
    const hubIds = request.hubId ? [request.hubId] : undefined;

    const reject = (reason: string): ScheduleResult => {
      const rejected = { ...request, status: RequestStatus.REJECTED, priorityReason: `${request.priorityReason}. Từ chối: ${reason}` };
      state().upsertChargingRequest(rejected);
      const suggestions = target
        ? [
            ...findOptions({ target, targetBattery: request.targetBattery, from, deadline: Infinity, hubIds }).slice(0, 2),
            ...(target.fixedHubId
              ? []
              : findOptions({ target, targetBattery: request.targetBattery, from, deadline })
                  .filter((o) => o.hubId !== request.hubId && o.meetsDeadline)
                  .slice(0, 3)),
          ]
        : [];
      if (request.hubId) checkChargingLoad(request.hubId);
      return { ok: false, request: rejected, reason, suggestions };
    };
    if (!target) return reject("Không tìm thấy xe.");

    const options = findOptions({ target, targetBattery: request.targetBattery, from, deadline, hubIds }).filter((o) => o.meetsDeadline);
    const chosen = options.find((o) => o.portId === preferredPortId) ?? options[0];
    if (chosen) {
      const plan = buildSchedule([request], s.chargingPorts.filter((p) => p.portId === chosen.portId));
      if (plan.sessions[0]) {
        applySchedule(plan);
        checkChargingLoad(chosen.hubId);
        const session = plan.sessions[0];
        this.notifyScheduled(request, session);
        return { ok: true, request: state().chargingRequests.find((r) => r.requestId === requestId)!, session, displaced: [] };
      }
    }

    // Không còn khe trống: thử xếp lại theo priority (yêu cầu ưu tiên cao được chen trước).
    if (request.hubId) {
      const ports = s.chargingPorts.filter((p) => p.hubId === request.hubId);
      const portIds = new Set(ports.map((p) => p.portId));
      const waitingIds = new Set(
        s.chargingSessions.filter((cs) => cs.status === SessionStatus.SCHEDULED && portIds.has(cs.portId)).map((cs) => cs.requestId),
      );
      const others = s.chargingRequests.filter((r) => r.status === RequestStatus.SCHEDULED && waitingIds.has(r.requestId)).map(refreshPriority);
      const plan = buildSchedule([request, ...others], ports);
      const mine = plan.sessions.find((cs) => cs.requestId === request.requestId);
      const displaced = plan.unscheduled.map((u) => u.request);
      if (mine && displaced.every((d) => d.priority < request.priority)) {
        s.upsertChargingRequest(request);
        others.forEach((r) => s.upsertChargingRequest(r));
        applySchedule(plan);
        for (const d of displaced) {
          if (d.studentId) notify(d.studentId, `Lịch sạc xe ${d.vehicleId} bị lùi do có yêu cầu ưu tiên cao hơn. Hệ thống sẽ xếp lại khi có cổng trống.`, "warning");
        }
        checkChargingLoad(request.hubId);
        this.notifyScheduled(request, mine);
        return { ok: true, request: state().chargingRequests.find((r) => r.requestId === requestId)!, session: mine, displaced };
      }
    }
    return reject("Không còn cổng phù hợp kịp trước deadline");
  },

  // UC05 + UC09 trong một bước (form "Đăng ký sạc" của sinh viên).
  registerCharging(input: ChargingRequestInput, preferredPortId?: string): ScheduleResult {
    const request = this.submitChargingRequest(input);
    return this.scheduleCharging(request.requestId, preferredPortId);
  },

  notifyScheduled(request: ChargingRequest, session: ChargingSession): void {
    const port = state().chargingPorts.find((p) => p.portId === session.portId);
    const msg = `Đã xếp lịch sạc xe ${request.vehicleId}: ${hubName(port?.hubId ?? request.hubId)}, cổng ${session.portId}, ${fmtTime(session.startTime)}–${fmtTime(session.expectedEnd)}.`;
    if (request.studentId) notify(request.studentId, msg, "success");
  },

  // UC10
  trackSession(sessionId: string): ChargingSession | undefined {
    return state().chargingSessions.find((cs) => cs.sessionId === sessionId);
  },

  // Giờ dự kiến sạc xong: phiên đang sạc tính lại từ pin hiện tại; phiên khác dùng expectedEnd đã xếp.
  getEstimatedFinish(session: ChargingSession): string {
    if (session.status !== SessionStatus.CHARGING) return session.endTime ?? session.expectedEnd;
    const s = state();
    const port = s.chargingPorts.find((p) => p.portId === session.portId);
    const target = getChargeTarget(session.vehicleId, s);
    if (!port || !target) return session.expectedEnd;
    return new Date(s.clock.now + chargeDurationMs(session.currentBattery, session.targetBattery, target.capacityKwh, port.powerKw)).toISOString();
  },

  updateSessionProgress(sessionId: string, battery: number): void {
    const s = state();
    const session = s.chargingSessions.find((cs) => cs.sessionId === sessionId);
    if (!session) return;
    const level = Math.min(100, Math.max(0, battery));
    s.upsertChargingSession({ ...session, currentBattery: level, expectedEnd: this.getEstimatedFinish({ ...session, currentBattery: level }) });
    setVehicleBattery(session.vehicleId, level);
  },

  // Huỷ yêu cầu (sinh viên hoặc vận hành). Phiên đang sạc thì dừng lại.
  cancelRequest(requestId: string, by: "STUDENT" | "OPERATOR" = "STUDENT"): void {
    const s = state();
    const request = s.chargingRequests.find((r) => r.requestId === requestId);
    if (!request) throw new Error("Không tìm thấy yêu cầu sạc.");
    if (!ACTIVE_REQUEST.includes(request.status)) throw new Error("Yêu cầu đã kết thúc, không thể huỷ.");
    const now = simNowIso();
    const ports: string[] = [];
    for (const cs of s.chargingSessions.filter((x) => x.requestId === requestId && (x.status === SessionStatus.SCHEDULED || x.status === SessionStatus.CHARGING))) {
      s.upsertChargingSession({ ...cs, status: SessionStatus.CANCELLED, endTime: now });
      ports.push(cs.portId);
    }
    s.upsertChargingRequest({ ...request, status: RequestStatus.CANCELLED });
    releaseSharedVehicle(request.vehicleId);
    syncPortStatuses(ports);
    if (by === "OPERATOR" && request.studentId) {
      notify(request.studentId, `Vận hành đã huỷ yêu cầu sạc xe ${request.vehicleId}.`, "warning");
    }
  },

  // UC12: dời phiên SCHEDULED muộn hơn `minutes` phút (ưu tiên giữ cổng cũ, cùng Hub).
  postponeSession(sessionId: string, minutes: number): ChargingSession {
    const s = state();
    const session = s.chargingSessions.find((cs) => cs.sessionId === sessionId);
    if (!session || session.status !== SessionStatus.SCHEDULED) throw new Error("Chỉ dời được phiên chưa bắt đầu.");
    const target = getChargeTarget(session.vehicleId, s);
    const port = s.chargingPorts.find((p) => p.portId === session.portId);
    if (!target || !port) throw new Error("Thiếu dữ liệu xe hoặc cổng.");
    const options = findOptions({
      target,
      targetBattery: session.targetBattery,
      from: Math.max(s.clock.now, new Date(session.startTime).getTime() + minutes * MINUTE),
      deadline: Infinity,
      hubIds: [port.hubId],
      excludeSessionIds: [sessionId],
    });
    const best = options.find((o) => o.portId === port.portId) ?? options[0];
    if (!best) throw new Error("Không tìm được khung giờ khác tại Hub.");
    const next: ChargingSession = {
      ...session,
      portId: best.portId,
      startTime: new Date(best.start).toISOString(),
      expectedEnd: new Date(best.end).toISOString(),
      rescheduledFrom: best.portId !== session.portId ? session.portId : session.rescheduledFrom,
    };
    s.upsertChargingSession(next);
    syncPortStatuses([session.portId, best.portId]);
    const owner = ownerOf(session);
    if (owner) notify(owner, `Phiên sạc xe ${session.vehicleId} được dời sang ${fmtTime(best.start)} (cổng ${best.portId}).`, "info");
    return next;
  },

  // UC12: vận hành đặt priority thủ công (bộ xếp lịch không tự tính lại nữa).
  setPriority(requestId: string, priority: number): void {
    const s = state();
    const request = s.chargingRequests.find((r) => r.requestId === requestId);
    if (!request) throw new Error("Không tìm thấy yêu cầu sạc.");
    const value = Math.round(Math.min(100, Math.max(0, priority)));
    s.upsertChargingRequest({ ...request, priority: value, priorityReason: `${MANUAL_PRIORITY_PREFIX}: ${value}` });
  },

  // Gọi mỗi tick (engine/m3Handlers.ts).
  tick(now: number): void {
    const dt = lastProgressAt === null || now < lastProgressAt ? 0 : now - lastProgressAt;
    lastProgressAt = now;

    // 1) NIFR-06: phiên nằm trên cổng FAULTY / MAINTENANCE → xếp lại.
    const blocked = new Set(
      state().chargingPorts.filter((p) => p.status === PortStatus.FAULTY || p.status === PortStatus.MAINTENANCE).map((p) => p.portId),
    );
    for (const cs of state().chargingSessions) {
      if ((cs.status === SessionStatus.SCHEDULED || cs.status === SessionStatus.CHARGING) && blocked.has(cs.portId)) {
        rescheduleOnConflict(cs.sessionId);
      }
    }

    // 2) Phiên đang sạc: tăng pin theo công suất cổng; đủ mục tiêu → COMPLETED.
    for (const cs of state().chargingSessions.filter((x) => x.status === SessionStatus.CHARGING)) {
      const port = state().chargingPorts.find((p) => p.portId === cs.portId);
      const target = getChargeTarget(cs.vehicleId);
      if (!port || !target) continue;
      const gained = ((port.powerKw * (dt / 3_600_000)) / target.capacityKwh) * 100;
      const level = Math.min(cs.targetBattery, cs.currentBattery + gained);
      if (level >= cs.targetBattery) this.completeSession(cs.sessionId, level);
      else if (gained > 0) this.updateSessionProgress(cs.sessionId, level);
    }

    // 3) Phiên SCHEDULED đến giờ và cổng đã rảnh → CHARGING.
    for (const cs of state().chargingSessions.filter((x) => x.status === SessionStatus.SCHEDULED)) {
      if (new Date(cs.startTime).getTime() > now) continue;
      const busy = state().chargingSessions.some((x) => x.portId === cs.portId && x.status === SessionStatus.CHARGING);
      if (!busy) this.startSession(cs.sessionId);
    }

    // 4) Yêu cầu PENDING: thử xếp lịch theo priority; quá deadline → REJECTED.
    if (now - lastPendingRetry >= RETRY_PENDING_EVERY_MS || now < lastPendingRetry) {
      lastPendingRetry = now;
      this.retryPending(now);
    }
  },

  startSession(sessionId: string): void {
    const s = state();
    const cs = s.chargingSessions.find((x) => x.sessionId === sessionId);
    const port = cs && s.chargingPorts.find((p) => p.portId === cs.portId);
    const target = cs && getChargeTarget(cs.vehicleId, s);
    if (!cs || !port || !target) return;
    const request = requestOf(cs);

    // Xe dùng chung phải còn đỗ tại Hub và đang rảnh (chưa bị sinh viên khác đặt / đi).
    if (target.isShared) {
      const v = s.vehicles.find((x) => x.vehicleId === cs.vehicleId);
      if (!v || v.currentHubId !== port.hubId || (v.status !== VehicleStatus.AVAILABLE && v.status !== VehicleStatus.CHARGING)) {
        s.upsertChargingSession({ ...cs, status: SessionStatus.CANCELLED, endTime: simNowIso() });
        if (request) s.upsertChargingRequest({ ...request, status: RequestStatus.CANCELLED });
        syncPortStatuses([cs.portId]);
        notify("role:OPERATOR", `Huỷ phiên sạc ${cs.sessionId}: xe ${cs.vehicleId} không còn rảnh tại ${hubName(port.hubId)}.`, "warning");
        return;
      }
      s.updateVehicle(cs.vehicleId, { status: VehicleStatus.CHARGING });
    }
    const startBattery = target.battery;
    s.upsertChargingSession({
      ...cs,
      status: SessionStatus.CHARGING,
      startTime: simNowIso(),
      startBattery,
      currentBattery: startBattery,
      expectedEnd: new Date(s.clock.now + chargeDurationMs(startBattery, cs.targetBattery, target.capacityKwh, port.powerKw)).toISOString(),
    });
    syncPortStatuses([cs.portId]);
    const owner = ownerOf(cs);
    if (owner) notify(owner, `Bắt đầu sạc xe ${cs.vehicleId} tại cổng ${cs.portId}.`, "info");
  },

  completeSession(sessionId: string, battery: number): void {
    const s = state();
    const cs = s.chargingSessions.find((x) => x.sessionId === sessionId);
    if (!cs || cs.status !== SessionStatus.CHARGING) return;
    const now = simNowIso();
    s.upsertChargingSession({ ...cs, status: SessionStatus.COMPLETED, currentBattery: battery, endTime: now, expectedEnd: now });
    setVehicleBattery(cs.vehicleId, battery);
    releaseSharedVehicle(cs.vehicleId);
    const request = requestOf(cs);
    if (request) s.upsertChargingRequest({ ...request, status: RequestStatus.COMPLETED });
    syncPortStatuses([cs.portId]);
    const owner = ownerOf(cs);
    if (owner) notify(owner, `Xe ${cs.vehicleId} đã sạc xong (${Math.round(battery)}%). Cổng ${cs.portId} đã được giải phóng.`, "success");
  },

  retryPending(now: number): void {
    const pending = state()
      .chargingRequests.filter((r) => r.status === RequestStatus.PENDING)
      .map(refreshPriority)
      .sort((a, b) => b.priority - a.priority);
    for (const r of pending) {
      if (new Date(r.deadline).getTime() <= now) {
        state().upsertChargingRequest({ ...r, status: RequestStatus.REJECTED, priorityReason: `${r.priorityReason}. Từ chối: quá deadline` });
        if (r.studentId) notify(r.studentId, `Yêu cầu sạc xe ${r.vehicleId} bị từ chối: không xếp được cổng trước deadline.`, "error");
        continue;
      }
      const hubPorts = state().chargingPorts.filter((p) => !r.hubId || p.hubId === r.hubId);
      const plan = buildSchedule([r], hubPorts);
      if (plan.sessions.length > 0) {
        state().upsertChargingRequest(r);
        applySchedule(plan);
        this.notifyScheduled(r, plan.sessions[0]);
      }
    }
  },
};

function setVehicleBattery(vehicleId: string, battery: number): void {
  const s = state();
  const level = Math.round(battery);
  const personal = s.personalVehicles.find((v) => v.vehicleId === vehicleId);
  if (personal) {
    s.upsertPersonalVehicle({ ...personal, batteryLevel: level, batteryUpdatedAt: simNowIso() });
    return;
  }
  if (s.vehicles.some((v) => v.vehicleId === vehicleId)) s.updateVehicle(vehicleId, { batteryLevel: level });
}

function releaseSharedVehicle(vehicleId: string): void {
  const v = state().vehicles.find((x) => x.vehicleId === vehicleId);
  if (v?.status === VehicleStatus.CHARGING) state().updateVehicle(vehicleId, { status: VehicleStatus.AVAILABLE });
}
