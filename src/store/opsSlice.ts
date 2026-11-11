import type { StateCreator } from "zustand";
import type {
  Alert,
  DispatchOrder,
  IncidentTicket,
  Scenario,
  SimulationResult,
  SimulationRun,
} from "../types";
import { upsertById } from "../utils/collections";
import type { AppState } from "./index";

// ===== M4 sở hữu file này: cảnh báo, điều phối, sự cố, mô phỏng (UC11, UC13-UC16, UC18) =====

export interface OpsSliceData {
  alerts: Alert[];
  dispatchOrders: DispatchOrder[];
  tickets: IncidentTicket[];
  scenarios: Scenario[];
  simulationRuns: SimulationRun[];
  simulationResults: SimulationResult[];
}

export interface OpsSliceActions {
  upsertAlert: (a: Alert) => void;
  upsertDispatchOrder: (o: DispatchOrder) => void;
  upsertTicket: (t: IncidentTicket) => void;
  upsertScenario: (sc: Scenario) => void;
  upsertSimulationRun: (r: SimulationRun) => void;
  upsertSimulationResult: (r: SimulationResult) => void;
}

export type OpsSlice = OpsSliceData & OpsSliceActions;

export function initialOpsState(): OpsSliceData {
  return {
    alerts: [],
    dispatchOrders: [],
    tickets: [],
    scenarios: [],
    simulationRuns: [],
    simulationResults: [],
  };
}

export const createOpsSlice: StateCreator<AppState, [], [], OpsSliceActions> = (set) => ({
  upsertAlert: (a) => set((s) => ({ alerts: upsertById(s.alerts, a, "alertId") })),
  upsertDispatchOrder: (o) =>
    set((s) => ({ dispatchOrders: upsertById(s.dispatchOrders, o, "orderId") })),
  upsertTicket: (t) => set((s) => ({ tickets: upsertById(s.tickets, t, "ticketId") })),
  upsertScenario: (sc) => set((s) => ({ scenarios: upsertById(s.scenarios, sc, "scenarioId") })),
  upsertSimulationRun: (r) =>
    set((s) => ({ simulationRuns: upsertById(s.simulationRuns, r, "runId") })),
  upsertSimulationResult: (r) =>
    set((s) => ({ simulationResults: upsertById(s.simulationResults, r, "runId") })),
});
