import { OVERLOAD_THRESHOLD } from "../config/constants";
import { useStore } from "../store";
import {
  AlertSeverity,
  RecommendationType,
  VehicleStatus,
  type Hub,
  type Recommendation,
} from "../types";
import { computeHubStats } from "../utils/hubStats";
import { OperationsService } from "../services/operationsService";

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
}

export const OverloadHandler = {
  threshold: OVERLOAD_THRESHOLD,

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

    return stats.utilization > this.threshold;
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

    const bestTarget = otherHubs[0] ?? {
      hub: { hubId: "HUB-DORM-02", name: "KTX Khu B" } as Hub,
      stats: { freeSlots: 10, utilization: 0.4 },
    };

    const secondTarget = otherHubs[1] ?? {
      hub: { hubId: "HUB-DORM-01", name: "KTX Khu A" } as Hub,
      stats: { freeSlots: 5, utilization: 0.76 },
    };

    // Số xe cần chuyển để đưa utilization về ngưỡng an toàn 80%
    const currentOccupied = Math.round(stats.utilization * stats.totalSlots);
    const targetOccupied = Math.floor(stats.totalSlots * 0.8);
    const vehiclesToMove = Math.max(3, Math.min(currentOccupied - targetOccupied, 15));

    const recommendations: ExtendedRecommendation[] = [
      {
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
      },
      {
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
      },
      {
        type: RecommendationType.REDIRECT, // mapping type
        targetHubId: hubId,
        fromHubId: hubId,
        sourceHubName: sourceHub.name,
        targetHubName: sourceHub.name,
        impactScore: "LOW",
        description: `Tạm khóa cổng tiếp nhận xe mới: Tạm dừng nhận đặt chỗ trước và hướng dẫn trả xe sang trạm phụ trong 20 phút.`,
      },
    ];

    return recommendations;
  },

  /**
   * Áp dụng phương án giải tỏa đã chọn vào vận hành thực tế
   */
  applyAction(recommendation: ExtendedRecommendation): void {
    const s = useStore.getState();

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
