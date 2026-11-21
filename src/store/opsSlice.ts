import type { StateCreator } from "zustand";
import {
  AlertSeverity,
  DispatchStatus,
  TicketStatus,
  TicketType,
  type Alert,
  type DispatchOrder,
  type IncidentTicket,
  type Recommendation,
  type Scenario,
  type ScenarioType,
  type SimulationResult,
  type SimulationRun,
  type RunStatus,
} from "../types";
import { upsertById } from "../utils/collections";
import type { AppState } from "./index";

// ===== M4 sở hữu file này: cảnh báo, điều phối, sự cố, mô phỏng (UC11, UC13-UC16, UC18) =====

export type ExtendedRunStatus = RunStatus | "APPLIED" | "REJECTED";

export type ExtendedScenarioType =
  | ScenarioType
  | "VEHICLE_BREAKDOWN"
  | "HUB_UNAVAILABLE"
  | "MASS_RETURN"
  | "ALTERNATIVE_OVERLOAD"
  | "CONCURRENT_EVENTS";

export interface OpsAlert extends Alert {
  message?: string;
  acknowledged?: boolean;
  acknowledgedBy?: string;
}

export interface OpsDispatchOrder extends DispatchOrder {
  transportMethod?: "TRUCK" | "SELF_DRIVE";
  driverName?: string;
  createdAt?: string;
  approvedBy?: string;
}

export interface OpsIncidentTicket extends IncidentTicket {
  assignedTo?: string;
  resolutionNotes?: string;
  createdAt?: string;
  closedAt?: string;
}

export interface OpsRecommendation extends Recommendation {
  id?: string;
  impactScore?: "HIGH" | "MEDIUM" | "LOW";
  fromHubId?: string;
  toHubId?: string;
  vehicleCount?: number;
}

export interface OpsSimulationRun extends Omit<SimulationRun, "status"> {
  status: ExtendedRunStatus;
  progress?: number;
  parameters?: Record<string, unknown>;
  rejectionReason?: string;
  scenarioType?: ExtendedScenarioType;
}

export interface OpsSimulationResult extends SimulationResult {
  scenarioId?: string;
  initialUtilization?: Record<string, number>;
  unservedDemandRate?: number;
  avgWaitingTimeMinutes?: number;
  reroutedUsersCount?: number;
  recommendations?: OpsRecommendation[];
}

// Tạm khoá nhận xe mới tại một Hub (phương án "Tạm khóa cổng tiếp nhận" của UC15). Hết hạn theo giờ mô phỏng.
export interface HubIntakeLock {
  hubId: string;
  until: number; // ms epoch (giờ mô phỏng)
  reason: string;
}

export interface OpsSliceData {
  alerts: OpsAlert[];
  dispatchOrders: OpsDispatchOrder[];
  tickets: OpsIncidentTicket[];
  scenarios: Scenario[];
  simulationRuns: OpsSimulationRun[];
  simulationResults: OpsSimulationResult[];
  activeSimulationId: string | null;
  intakeLocks: HubIntakeLock[];
}

export interface OpsSliceActions {
  upsertAlert: (a: OpsAlert) => void;
  resolveAlert: (alertId: string) => void;
  acknowledgeAlert: (alertId: string, operatorId?: string) => void;
  removeAlert: (alertId: string) => void;

  upsertDispatchOrder: (o: OpsDispatchOrder) => void;
  updateDispatchStatus: (orderId: string, status: OpsDispatchOrder["status"]) => void;

  upsertTicket: (t: OpsIncidentTicket) => void;
  assignTicket: (ticketId: string, technician: string) => void;
  closeTicket: (ticketId: string, resolution: string) => void;

  upsertScenario: (sc: Scenario) => void;
  upsertSimulationRun: (r: OpsSimulationRun) => void;
  updateSimulationProgress: (runId: string, progress: number, status?: ExtendedRunStatus) => void;
  upsertSimulationResult: (r: OpsSimulationResult) => void;
  setActiveSimulationId: (id: string | null) => void;
  rejectSimulationRun: (runId: string, reason: string) => void;

  lockHubIntake: (lock: HubIntakeLock) => void;
  unlockHubIntake: (hubId: string) => void;
}

export type OpsSlice = OpsSliceData & OpsSliceActions;

// now: thời điểm mô phỏng ban đầu (ms) để dữ liệu mẫu khớp đồng hồ mô phỏng, không dùng giờ thật.
export function initialOpsState(now: number): OpsSliceData {
  const nowIso = new Date(now).toISOString();
  return {
    alerts: [
      {
        alertId: "ALT-001",
        hubId: "HUB-SERVICE-01",
        type: "VEHICLE_FAULT",
        severity: AlertSeverity.WARNING,
        createdAt: nowIso,
        resolved: false,
        message: "Xe VH-027 gặp sự cố động cơ tại Trạm Dịch vụ",
        acknowledged: false,
      },
    ],
    dispatchOrders: [
      {
        orderId: "DO-001",
        fromHubId: "HUB-DORM-01",
        toHubId: "HUB-CAMPUS-01",
        vehicleIds: ["VH-007", "VH-008"],
        status: DispatchStatus.DONE,
        transportMethod: "TRUCK",
        driverName: "Nguyễn Văn B (Đội 01)",
        createdAt: nowIso,
        approvedBy: "OP001",
      },
    ],
    tickets: [
      {
        ticketId: "TCK-001",
        type: TicketType.VEHICLE_FAULT,
        targetId: "VH-027",
        hubId: "HUB-SERVICE-01",
        description: "Lỗi báo về từ cảm biến IoT: Động cơ mất phản hồi",
        status: TicketStatus.OPEN,
        createdAt: nowIso,
      },
    ],
    scenarios: [],
    simulationRuns: [],
    simulationResults: [],
    activeSimulationId: null,
    intakeLocks: [],
  };
}

export const createOpsSlice: StateCreator<AppState, [], [], OpsSliceActions> = (set) => ({
  upsertAlert: (a) => set((s) => ({ alerts: upsertById(s.alerts, a, "alertId") })),
  resolveAlert: (alertId) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.alertId === alertId ? { ...a, resolved: true } : a)),
    })),
  acknowledgeAlert: (alertId, operatorId = "OP001") =>
    set((s) => ({
      alerts: s.alerts.map((a) =>
        a.alertId === alertId ? { ...a, acknowledged: true, acknowledgedBy: operatorId } : a
      ),
    })),
  removeAlert: (alertId) =>
    set((s) => ({
      alerts: s.alerts.filter((a) => a.alertId !== alertId),
    })),

  upsertDispatchOrder: (o) =>
    set((s) => ({ dispatchOrders: upsertById(s.dispatchOrders, o, "orderId") })),
  updateDispatchStatus: (orderId, status) =>
    set((s) => ({
      dispatchOrders: s.dispatchOrders.map((o) => (o.orderId === orderId ? { ...o, status } : o)),
    })),

  upsertTicket: (t) => set((s) => ({ tickets: upsertById(s.tickets, t, "ticketId") })),
  assignTicket: (ticketId, technician) =>
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.ticketId === ticketId ? { ...t, status: TicketStatus.ASSIGNED, assignedTo: technician } : t
      ),
    })),
  closeTicket: (ticketId, resolution) =>
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.ticketId === ticketId
          ? {
              ...t,
              status: TicketStatus.CLOSED,
              resolutionNotes: resolution,
              closedAt: new Date(s.clock.now).toISOString(),
            }
          : t
      ),
    })),

  upsertScenario: (sc) => set((s) => ({ scenarios: upsertById(s.scenarios, sc, "scenarioId") })),
  upsertSimulationRun: (r) =>
    set((s) => ({ simulationRuns: upsertById(s.simulationRuns, r, "runId") })),
  updateSimulationProgress: (runId, progress, status) =>
    set((s) => ({
      simulationRuns: s.simulationRuns.map((r) =>
        r.runId === runId ? { ...r, progress, ...(status ? { status } : {}) } : r
      ),
    })),
  upsertSimulationResult: (r) =>
    set((s) => ({ simulationResults: upsertById(s.simulationResults, r, "runId") })),
  setActiveSimulationId: (id) => set({ activeSimulationId: id }),
  rejectSimulationRun: (runId, reason) =>
    set((s) => ({
      simulationRuns: s.simulationRuns.map((r) =>
        r.runId === runId ? { ...r, status: "REJECTED" as ExtendedRunStatus, rejectionReason: reason } : r
      ),
    })),

  // Mỗi Hub chỉ có một khoá; khoá mới thay khoá cũ.
  lockHubIntake: (lock) =>
    set((s) => ({ intakeLocks: [...s.intakeLocks.filter((l) => l.hubId !== lock.hubId), lock] })),
  unlockHubIntake: (hubId) => set((s) => ({ intakeLocks: s.intakeLocks.filter((l) => l.hubId !== hubId) })),
});
