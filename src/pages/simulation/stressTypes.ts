import { useStore } from "../../store";
import type { StressEvent, StressEventKind } from "../../services/simulationService";
import { makeId } from "../../utils/id";
import { resourceCode } from "../../utils/resourceCode";

export type { StressEvent, StressEventKind };

export const KIND_LABELS: Record<StressEventKind, string> = {
  PORT_FAULT: "Cổng sạc giả định lỗi",
  VEHICLE_FAULT: "Xe giả định lỗi",
  DEMAND_SURGE: "Tăng nhu cầu Metro",
};

export const STRATEGY_OPTIONS = [
  { value: "PRIORITIZE_SHORTAGE", label: "Ưu tiên Hub thiếu xe" },
  { value: "PROACTIVE_REBALANCE", label: "Cân bằng tải chủ động (Proactive Fleet Rebalancing)" },
  { value: "REACTIVE_DISPATCH", label: "Điều phối phản ứng theo ngưỡng (Reactive Dispatch)" },
  { value: "LOAD_SHEDDING", label: "Điều hướng & Tạm giới hạn (Dynamic Load Shedding)" },
  { value: "BASELINE_NOOP", label: "Không can thiệp (Quan sát Baseline quá tải)" },
];

export const DEFAULT_STRESS_DURATION = 60;
export const DEFAULT_STRESS_STRATEGY = "PRIORITIZE_SHORTAGE";
export const MAX_DEMAND_MULTIPLIER = 5;

// Hệ số nhu cầu tổng của mọi biến cố "Tăng nhu cầu" (nhân dồn).
export function surgeFactor(events: StressEvent[]): number {
  const f = events.filter((e) => e.kind === "DEMAND_SURGE").reduce((acc, e) => acc * e.multiplier, 1);
  return Number(Math.min(f, MAX_DEMAND_MULTIPLIER).toFixed(2));
}

export function countFaults(events: StressEvent[]): { ports: number; vehicles: number } {
  return {
    ports: events.filter((e) => e.kind === "PORT_FAULT").reduce((n, e) => n + e.resourceIds.length, 0),
    vehicles: events.filter((e) => e.kind === "VEHICLE_FAULT").reduce((n, e) => n + e.resourceIds.length, 0),
  };
}

export function defaultHubId(): string {
  const hubs = useStore.getState().hubs;
  return hubs.find((h) => h.hubId === "HUB-METRO-01")?.hubId ?? hubs[0]?.hubId ?? "";
}

// Dòng thời gian mặc định (như mockup): phút 0 tăng nhu cầu, phút 10 cổng lỗi, phút 20 xe lỗi.
export function buildDefaultEvents(hubId: string): StressEvent[] {
  const s = useStore.getState();
  const events: StressEvent[] = [
    { id: makeId("EV"), timeMin: 0, kind: "DEMAND_SURGE", hubId, resourceIds: [], multiplier: 2 },
  ];
  const ports = s.chargingPorts.filter((p) => p.hubId === hubId).slice(0, 2);
  if (ports.length > 0) {
    events.push({ id: makeId("EV"), timeMin: 10, kind: "PORT_FAULT", hubId, resourceIds: ports.map((p) => p.portId), multiplier: 1 });
  }
  const vehicle = s.vehicles.find((v) => v.currentHubId === hubId);
  if (vehicle) {
    events.push({ id: makeId("EV"), timeMin: 20, kind: "VEHICLE_FAULT", hubId, resourceIds: [vehicle.vehicleId], multiplier: 1 });
  }
  return events;
}

// Mã hiển thị của tài nguyên trong bảng / chip: cổng "P1", xe "VH-015".
export function displayCode(kind: StressEventKind, id: string, hubId: string): string {
  return kind === "PORT_FAULT" ? resourceCode(id, hubId) : id;
}
