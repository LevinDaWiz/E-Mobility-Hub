import { useStore } from "../store";
import {
  AlertSeverity,
  RecommendationType,
  VehicleStatus,
  type Recommendation,
} from "../types";
import { computeHubStats } from "../utils/hubStats";
import { OperationsService } from "../services/operationsService";
import { notify } from "../services/notificationService";

// ===== M4 sở hữu file này: Phát hiện quá tải & đề xuất giải tỏa (NIFR-03, UC15) =====

export interface ExtendedRecommendation extends Recommendation {
  impactScore?: "HIGH" | "MEDIUM" | "LOW";
  suggestedVehiclesCount?: number;
  fromHubId?: string;
  sourceHubName?: string;
  targetHubName?: string;
  etaMinutes?: number;
  cost?: string;
  riskWarning?: string;
  // Có giá trị: phương án "tạm khóa cổng tiếp nhận", khoá nhận xe mới tại Hub này trong ngần ấy phút (giờ mô phỏng).
  lockMinutes?: number;
}

const INTAKE_LOCK_MINUTES = 20;

export const OverloadHandler = {
  /**
   * Phát hiện một Hub có đang quá tải sức chứa hay không (utilization > threshold)
   */
  detectOverload(hubId: string): boolean {
    const s = useStore.getState();
    const hub = s.hubs.find((h) => h.hubId === hubId);
    if (!hub) return false;

    const stats = computeHubStats(
      { parkingSlots: s.parkingSlots, chargingPorts: s.chargingPorts, vehicles: s.vehicles },
      hubId
    );

    return stats.utilization > hub.thresholds.overload; // ngưỡng riêng từng Hub (UC19)
  },

  /**
   * Phân tích và sinh danh sách 3 gói khuyến nghị giải tỏa áp lực (UC15)
   */
  proposeActions(hubId: string): ExtendedRecommendation[] {
    const s = useStore.getState();
    const sourceHub = s.hubs.find((h) => h.hubId === hubId);
    if (!sourceHub) return [];

    const stats = computeHubStats(
      { parkingSlots: s.parkingSlots, chargingPorts: s.chargingPorts, vehicles: s.vehicles },
      hubId
    );

    // Tìm các Hub thay thế có mức sử dụng thấp nhất
    const otherHubs = s.hubs
      .filter((h) => h.hubId !== hubId && h.type !== "SERVICE")
      .map((h) => {
        const hStats = computeHubStats(
          { parkingSlots: s.parkingSlots, chargingPorts: s.chargingPorts, vehicles: s.vehicles },
          h.hubId
        );
        return { hub: h, stats: hStats };
      })
      .sort((a, b) => a.stats.utilization - b.stats.utilization);

    // Không bịa Hub thay thế: nếu mạng lưới không có (đủ) Hub khác thì bỏ các phương án cần Hub đó.
    const bestTarget = otherHubs[0];
    const secondTarget = otherHubs[1];

    // Số xe cần chuyển để đưa utilization về ngưỡng an toàn 80%
    const currentOccupied = Math.round(stats.utilization * stats.totalSlots);
    const targetOccupied = Math.floor(stats.totalSlots * 0.8);
    const vehiclesToMove = Math.max(3, Math.min(currentOccupied - targetOccupied, 15));

    const recommendations: ExtendedRecommendation[] = [];

    if (bestTarget) {
      recommendations.push({
        type: RecommendationType.REDISTRIBUTE,
        targetHubId: bestTarget.hub.hubId,
        fromHubId: hubId,
        sourceHubName: sourceHub.name,
        targetHubName: bestTarget.hub.name,
        suggestedVehiclesCount: vehiclesToMove,
        impactScore: "HIGH",
        etaMinutes: 18,
        cost: "Thấp",
        description: `Điều phối ${vehiclesToMove} xe sang ${bestTarget.hub.name}: ETA 18 phút, giảm tải Hub ${sourceHub.name} xuống ~80%, chi phí vận chuyển thấp.`,
      });
    }

    if (secondTarget) {
      recommendations.push({
        type: RecommendationType.REDIRECT,
        targetHubId: secondTarget.hub.hubId,
        fromHubId: hubId,
        sourceHubName: sourceHub.name,
        targetHubName: secondTarget.hub.name,
        impactScore: "MEDIUM",
        etaMinutes: 10,
        riskWarning:
          secondTarget.stats.utilization >= 0.7
            ? `${secondTarget.hub.name} hiện đang ở mức ${Math.round(
                secondTarget.stats.utilization * 100
              )}% sức chứa. Cần giới hạn phân luồng dưới 40% để tránh quá tải thứ cấp.`
            : undefined,
        description: `Phân luồng dòng xe trả về sang ${secondTarget.hub.name}: Chuyển hướng 50% lưu lượng dự kiến trong 30 phút.`,
      });
    }

    // Luôn có: tạm khóa nhận xe mới tại chính Hub này (không phụ thuộc Hub khác).
    recommendations.push({
      type: RecommendationType.REDIRECT, // mapping type
      targetHubId: hubId,
      fromHubId: hubId,
      sourceHubName: sourceHub.name,
      targetHubName: sourceHub.name,
      impactScore: "LOW",
      lockMinutes: INTAKE_LOCK_MINUTES,
      description: `Tạm khóa cổng tiếp nhận xe mới: Hub không nhận xe trả và đặt chỗ đỗ mới trong ${INTAKE_LOCK_MINUTES} phút, sinh viên được hướng dẫn trả xe sang Hub khác.`,
    });

    return recommendations;
  },

  /**
   * Áp dụng phương án giải tỏa đã chọn vào vận hành thực tế
   */
  applyAction(recommendation: ExtendedRecommendation): void {
    const s = useStore.getState();

    // Tạm khóa nhận xe mới: khoá thật (M2 chặn trả xe, M3 chặn đặt chỗ đỗ qua utils/hubAvailability), không chỉ cảnh báo.
    if (recommendation.lockMinutes && recommendation.fromHubId) {
      const hubId = recommendation.fromHubId;
      const until = s.clock.now + recommendation.lockMinutes * 60_000;
      s.lockHubIntake({ hubId, until, reason: "OVERLOAD" });
      OperationsService.raiseAlert(hubId, "HUB_INTAKE_LOCKED", AlertSeverity.WARNING, recommendation.description);
      notify(
        "role:STUDENT",
        `${recommendation.sourceHubName ?? "Hub"} tạm ngưng nhận xe mới trong ${recommendation.lockMinutes} phút do quá tải. Vui lòng trả xe tại Hub khác.`,
        "warning"
      );
      return;
    }

    if (recommendation.type === RecommendationType.REDISTRIBUTE && recommendation.fromHubId && recommendation.targetHubId) {
      // Chọn các xe AVAILABLE tại Hub nguồn có mức pin cao nhất
      const availableVehicles = s.vehicles
        .filter((v) => v.currentHubId === recommendation.fromHubId && v.status === VehicleStatus.AVAILABLE)
        .sort((a, b) => b.batteryLevel - a.batteryLevel)
        .slice(0, recommendation.suggestedVehiclesCount ?? 5)
        .map((v) => v.vehicleId);

      if (availableVehicles.length > 0) {
        OperationsService.createDispatchOrder(
          recommendation.fromHubId,
          recommendation.targetHubId,
          availableVehicles,
          "TRUCK"
        );
      } else {
        notify(
          "role:OPERATOR",
          `${recommendation.sourceHubName ?? "Hub"} không còn xe AVAILABLE để điều phối. Hãy chọn phương án khác (ví dụ tạm khóa cổng tiếp nhận).`,
          "warning"
        );
      }
    } else {
      // Thông báo hệ thống về việc phân luồng / hạn chế
      OperationsService.raiseAlert(
        recommendation.fromHubId ?? recommendation.targetHubId,
        "HUB_TRAFFIC_REROUTED",
        AlertSeverity.INFO,
        recommendation.description
      );
    }
  },
};
