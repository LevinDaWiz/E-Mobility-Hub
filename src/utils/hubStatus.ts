import { HubOperationalStatus, AlertSeverity, type Alert, type Hub } from "../types";
import type { HubStats } from "./hubStats";

// ===== M1 sở hữu (UC11): trạng thái hiển thị và cảnh báo của Hub, dùng chung cho mọi trang =====
// M4 (NIFR-03 quá tải) nên dùng hub.thresholds thay vì hằng số chung.

export type HubDisplayStatus = "AVAILABLE" | "AT_RISK" | "OVERLOADED" | "MAINTENANCE" | "UNAVAILABLE";

export const HUB_STATUS_LABELS: Record<HubDisplayStatus, string> = {
  AVAILABLE: "Available",
  AT_RISK: "At Risk",
  OVERLOADED: "Overloaded",
  MAINTENANCE: "Maintenance",
  UNAVAILABLE: "Unavailable",
};

export function getHubDisplayStatus(hub: Hub, utilization: number): HubDisplayStatus {
  if (hub.operationalStatus === HubOperationalStatus.MAINTENANCE) return "MAINTENANCE";
  if (hub.operationalStatus === HubOperationalStatus.UNAVAILABLE) return "UNAVAILABLE";
  if (utilization > hub.thresholds.overload) return "OVERLOADED";
  if (utilization >= hub.thresholds.parkingWarning) return "AT_RISK";
  return "AVAILABLE";
}

export interface HubAlertItem {
  severity: AlertSeverity;
  message: string;
  // derived: suy ra từ số liệu và ngưỡng; alert: bản ghi Alert trong store (ví dụ do Metro surge, gây lỗi).
  source: "derived" | "alert";
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  METRO_SURGE: "Metro surge: lượng khách tăng đột biến",
  PORT_FAULT: "Cổng sạc báo lỗi",
  VEHICLE_FAULT: "Xe báo lỗi",
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const SEVERITY_RANK: Record<AlertSeverity, number> = {
  [AlertSeverity.INFO]: 0,
  [AlertSeverity.WARNING]: 1,
  [AlertSeverity.CRITICAL]: 2,
};

// Hub đang bảo trì / không khả dụng không phát cảnh báo suy ra (chỉ hiện Alert đã ghi nhận).
export function getHubAlerts(hub: Hub, stats: HubStats, openAlerts: Alert[]): HubAlertItem[] {
  const items: HubAlertItem[] = [];
  const t = hub.thresholds;

  if (hub.operationalStatus === HubOperationalStatus.AVAILABLE) {
    if (stats.utilization > t.overload) {
      items.push({
        severity: AlertSeverity.CRITICAL,
        message: `Chỗ đỗ đạt ${pct(stats.utilization)}, vượt ngưỡng quá tải ${pct(t.overload)}.`,
        source: "derived",
      });
    } else if (stats.utilization >= t.parkingWarning) {
      items.push({
        severity: AlertSeverity.WARNING,
        message: `Chỗ đỗ đạt ${pct(stats.utilization)}, vượt ngưỡng cảnh báo ${pct(t.parkingWarning)}.`,
        source: "derived",
      });
    }
    if (stats.chargingUtilization > t.chargingOverload) {
      items.push({
        severity: AlertSeverity.WARNING,
        message: `Cổng sạc đang dùng ${pct(stats.chargingUtilization)}, vượt ngưỡng quá tải cổng sạc ${pct(t.chargingOverload)}.`,
        source: "derived",
      });
    }
    if (stats.availableVehicles < t.minAvailableVehicles) {
      items.push({
        severity: AlertSeverity.WARNING,
        message: `Chỉ còn ${stats.availableVehicles} xe khả dụng, thấp hơn mức tối thiểu ${t.minAvailableVehicles}.`,
        source: "derived",
      });
    }
  }

  for (const alert of openAlerts.filter((a) => a.hubId === hub.hubId && !a.resolved)) {
    items.push({
      severity: alert.severity,
      message: ALERT_TYPE_LABELS[alert.type] ?? alert.type,
      source: "alert",
    });
  }
  return items;
}

// Mức cảnh báo cao nhất, hoặc null nếu không có.
export function maxAlertSeverity(items: HubAlertItem[]): AlertSeverity | null {
  return items.reduce<AlertSeverity | null>(
    (max, item) => (max === null || SEVERITY_RANK[item.severity] > SEVERITY_RANK[max] ? item.severity : max),
    null,
  );
}
