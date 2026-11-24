import { iotSimulator, IOT_SOURCE_ID } from "../engine/iotSimulator";
import { useStore } from "../store";
import { AlertSeverity, PortStatus, VehicleStatus } from "../types";
import { notify } from "./notificationService";
import { OperationsService } from "./operationsService";
import { simNowIso } from "../utils/time";

// ===== M1 sở hữu: nút "Gây lỗi / Khôi phục" ở Demo panel =====
// Mô phỏng thiết bị tự báo lỗi qua IoT (đi qua cùng đường ống với bộ giả lập), rồi tạo cảnh báo.
// Ticket sự cố do M4 tạo tự động (NIFR-04) khi thấy thiết bị FAULTY; phiên sạc bị ảnh hưởng do M3 xếp lại.

export type FaultEntity = "vehicle" | "port";

export interface FaultTarget {
  entity: FaultEntity;
  id: string;
  label: string;
  hubId: string;
  faulty: boolean;
}

export function listFaultTargets(): FaultTarget[] {
  const { vehicles, chargingPorts, hubs } = useStore.getState();
  const hubName = (id: string) => hubs.find((h) => h.hubId === id)?.name ?? id;
  return [
    ...chargingPorts.map<FaultTarget>((p) => ({
      entity: "port",
      id: p.portId,
      hubId: p.hubId,
      faulty: p.status === PortStatus.FAULTY,
      label: `Cổng ${p.portId} · ${hubName(p.hubId)}`,
    })),
    ...vehicles.map<FaultTarget>((v) => ({
      entity: "vehicle",
      id: v.vehicleId,
      hubId: v.currentHubId,
      faulty: v.status === VehicleStatus.FAULTY,
      label: `Xe ${v.vehicleId} · ${hubName(v.currentHubId)}`,
    })),
  ];
}

function findTarget(entity: FaultEntity, id: string): FaultTarget | undefined {
  return listFaultTargets().find((t) => t.entity === entity && t.id === id);
}

function emitStatus(entity: FaultEntity, id: string, status: string): void {
  iotSimulator.emit({ sourceId: IOT_SOURCE_ID, timestamp: simNowIso(), payload: { entity, id, status } });
}

export function injectFault(entity: FaultEntity, id: string): boolean {
  const target = findTarget(entity, id);
  if (!target || target.faulty) return false;

  emitStatus(entity, id, entity === "port" ? PortStatus.FAULTY : VehicleStatus.FAULTY);
  OperationsService.raiseAlert(
    target.hubId,
    entity === "port" ? "PORT_FAULT" : "VEHICLE_FAULT",
    entity === "port" ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
  );
  notify("role:OPERATOR", `Sự cố: ${target.label} báo lỗi`, "error");
  return true;
}

export function repairFault(entity: FaultEntity, id: string): boolean {
  const target = findTarget(entity, id);
  if (!target || !target.faulty) return false;

  emitStatus(entity, id, entity === "port" ? PortStatus.FREE : VehicleStatus.AVAILABLE);
  notify("role:OPERATOR", `Đã khôi phục: ${target.label}`, "success");
  return true;
}
