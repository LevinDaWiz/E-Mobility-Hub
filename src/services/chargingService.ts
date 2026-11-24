import { useStore } from "../store";
import { RequestStatus, type ChargingRequest } from "../types";
import { makeId } from "../utils/id";
import { simNowIso } from "../utils/time";
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
import { notify } from "./notificationService";
import { OperationsService } from "./operationsService";
=======
>>>>>>> de73bc7e494bae2ece9ce73f5ad1aeb4ecf3f04a
>>>>>>> Stashed changes

// ===== M3 sở hữu file này. STUB để M2 gọi sau khi trả xe (UC05); M3 thay bằng bản đầy đủ. =====

export type ChargingRequestInput = Pick<
  ChargingRequest,
  "vehicleId" | "targetBattery" | "desiredStart" | "deadline" | "hubId" | "studentId"
>;

<<<<<<< Updated upstream
export const ChargingService = {
=======
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

export type ChargingRequestInput = Pick<
  ChargingRequest,
  "vehicleId" | "targetBattery" | "desiredStart" | "deadline" | "hubId" | "studentId"
>;

export const ChargingService = {
<<<<<<< HEAD
  // UC05: tạo yêu cầu sạc PENDING kèm priority (NIFR-05). M2 gọi sau khi trả xe; tick sẽ tự xếp lịch nếu chưa xếp.
>>>>>>> Stashed changes
  submitChargingRequest(input: ChargingRequestInput): ChargingRequest {
    const request: ChargingRequest = {
      requestId: makeId("CR"),
      ...input,
<<<<<<< Updated upstream
      priority: 0, // TODO(M3): ChargingScheduler.calculatePriority
      priorityReason: "",
      createdAt: simNowIso(),
=======
      priority,
      priorityReason: reason,
      createdAt,
=======
  submitChargingRequest(input: ChargingRequestInput): ChargingRequest {
    const request: ChargingRequest = {
      requestId: makeId("CR"),
      ...input,
      priority: 0, // TODO(M3): ChargingScheduler.calculatePriority
      priorityReason: "",
      createdAt: simNowIso(),
>>>>>>> de73bc7e494bae2ece9ce73f5ad1aeb4ecf3f04a
>>>>>>> Stashed changes
      status: RequestStatus.PENDING,
    };
    useStore.getState().upsertChargingRequest(request);
    return request;
  },
};
