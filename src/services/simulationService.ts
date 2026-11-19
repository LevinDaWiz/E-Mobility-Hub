import { useStore } from "../store";
import type {
  ExtendedRunStatus,
  ExtendedScenarioType,
  OpsRecommendation,
  OpsSimulationResult,
  OpsSimulationRun,
} from "../store/opsSlice";
import {
  AlertSeverity,
  RecommendationType,
  RunStatus,
  ScenarioType,
  type Scenario,
} from "../types";
import { computeHubStats } from "../utils/hubStats";
import { makeId } from "../utils/id";
import { simNowIso } from "../utils/time";
import { notify } from "./notificationService";
import { OperationsService } from "./operationsService";
import { getSimulationInputs } from "./simulationInputs";

// ===== M4 sở hữu file này: Engine mô phỏng What-if cách ly tuyệt đối (NIFR-08, UC16, UC18) =====

export interface ScenarioDefinition {
  type: ExtendedScenarioType;
  code: string;
  title: string;
  description: string;
  defaultHubId: string;
  defaultDuration: number; // phút ảo
  defaultMultiplier: number;
}

export const PRESET_SCENARIOS: ScenarioDefinition[] = [
  {
    type: ScenarioType.METRO_SURGE,
    code: "WI01",
    title: "Tăng đột biến khách tại Ga Metro",
    description: "Tàu Metro cập ga xả khách khiến nhu cầu thuê xe tăng gấp 2–3 lần trong 15 phút.",
    defaultHubId: "HUB-METRO-01",
    defaultDuration: 60,
    defaultMultiplier: 2.5,
  },
  {
    type: ScenarioType.HUB_FULL,
    code: "WI02",
    title: "Sức chứa bãi xe Hub vượt ngưỡng",
    description: "Xe đổ về trả dồn dập khiến bãi đỗ Hub đạt 100% công suất, không thể tiếp nhận thêm xe.",
    defaultHubId: "HUB-CAMPUS-01",
    defaultDuration: 45,
    defaultMultiplier: 2.0,
  },
  {
    type: ScenarioType.CHARGING_SURGE,
    code: "WI03",
    title: "Nhu cầu sạc tăng đột biến",
    description: "Cuối giờ chiều sinh viên cắm sạc đồng loạt khiến toàn bộ cổng sạc kín chỗ và phát sinh hàng đợi.",
    defaultHubId: "HUB-DORM-01",
    defaultDuration: 90,
    defaultMultiplier: 3.0,
  },
  {
    type: ScenarioType.PORT_FAILURE,
    code: "WI04",
    title: "Hỏng cổng sạc diện rộng",
    description: "Sự cố sụt áp làm mất điện các cổng sạc nhanh tại Hub, làm vỡ lịch sạc đã xếp.",
    defaultHubId: "HUB-METRO-01",
    defaultDuration: 60,
    defaultMultiplier: 1.0,
  },
  {
    type: ScenarioType.VEHICLE_IMBALANCE,
    code: "WI05",
    title: "Mất cân bằng phân bổ xe liên Hub",
    description: "Sau giờ tan học, xe dồn về các Hub KTX làm các Hub trường học thiếu xe trầm trọng.",
    defaultHubId: "HUB-DORM-02",
    defaultDuration: 60,
    defaultMultiplier: 1.8,
  },
  {
    type: "VEHICLE_BREAKDOWN",
    code: "WI06",
    title: "Phương tiện gặp sự cố hàng loạt",
    description: "Nhiều xe bị lỗi khóa thông minh hoặc sụt pin đột ngột trước khi khách nhận xe.",
    defaultHubId: "HUB-METRO-01",
    defaultDuration: 45,
    defaultMultiplier: 1.2,
  },
  {
    type: "HUB_UNAVAILABLE",
    code: "WI07",
    title: "Hub tạm ngưng hoạt động đột xuất",
    description: "Mất điện toàn diện hoặc bảo trì khẩn cấp khiến một Hub ngừng hoạt động hoàn toàn.",
    defaultHubId: "HUB-CAMPUS-02",
    defaultDuration: 60,
    defaultMultiplier: 1.0,
  },
  {
    type: "MASS_RETURN",
    code: "WI08",
    title: "Hàng loạt phương tiện trả về cùng lúc",
    description: "Sự kiện giao lưu văn hóa kết thúc làm 50 xe trả về một Hub trong 10 phút.",
    defaultHubId: "HUB-DORM-01",
    defaultDuration: 60,
    defaultMultiplier: 2.5,
  },
  {
    type: "ALTERNATIVE_OVERLOAD",
    code: "WI09",
    title: "Quá tải Hub thay thế (Dây chuyền)",
    description: "Chuyển hướng toàn bộ dòng khách từ Metro sang KTX Khu A làm KTX Khu A bị nghẽn thứ cấp.",
    defaultHubId: "HUB-DORM-01",
    defaultDuration: 60,
    defaultMultiplier: 2.0,
  },
  {
    type: "CONCURRENT_EVENTS",
    code: "WI10",
    title: "Chuỗi sự cố đa biến cố đồng thời",
    description: "Metro xả khách + Sập trạm sạc + Trả xe hàng loạt diễn ra đồng thời (Maximum Stress-Test).",
    defaultHubId: "HUB-METRO-01",
    defaultDuration: 120,
    defaultMultiplier: 3.5,
  },
];

let activeSimulationTimer: ReturnType<typeof setInterval> | null = null;

export const SimulationService = {
  getPresetScenarios(): ScenarioDefinition[] {
    return PRESET_SCENARIOS;
  },

  /**
   * Tạo bản ghi kịch bản
   */
  createScenario(type: ExtendedScenarioType, parameters: Record<string, unknown>): Scenario {
    // Validate tham số kịch bản
    const multiplier = Number(parameters.multiplier ?? 1);
    const duration = Number(parameters.duration ?? 60);
    const hubId = String(parameters.hubId ?? "");

    if (multiplier <= 0 || duration <= 0) {
      throw new Error("Tham số mô phỏng không hợp lệ: hệ số và thời lượng phải lớn hơn 0");
    }

    const s = useStore.getState();
    if (hubId && !s.hubs.some((h) => h.hubId === hubId)) {
      throw new Error(`Hub ${hubId} không tồn tại trong hệ thống`);
    }

    const scenario: Scenario = {
      scenarioId: makeId("SCN"),
      type: type as ScenarioType,
      parameters,
    };

    s.upsertScenario(scenario);
    return scenario;
  },

  /**
   * Khởi chạy mô phỏng What-if với dữ liệu Deep-Clone độc lập (NIFR-08)
   */
  runScenario(
    type: ExtendedScenarioType,
    params: {
      hubId: string;
      duration: number;
      multiplier: number;
      strategy?: string;
      events?: Array<{ timeMin: number; type: string; target: string }>;
    }
  ): OpsSimulationRun {
    const s = useStore.getState();

    // 1. Kiểm tra tính hợp lệ (Validation)
    if (params.multiplier <= 0 || params.duration <= 0) {
      throw new Error("ERR_INVALID_PARAMS: Hệ số nhu cầu và thời lượng phải lớn hơn 0");
    }
    if (!s.hubs.some((h) => h.hubId === params.hubId)) {
      throw new Error(`ERR_HUB_NOT_FOUND: Hub ${params.hubId} không tồn tại`);
    }

    // 2. Lấy Deep-Clone Snapshot (NIFR-08: Sandbox RAM, Read-only)
    const snapshot = getSimulationInputs();

    // 3. Khởi tạo bản ghi kịch bản & phiên chạy
    const scenario = this.createScenario(type, { ...params });
    const runId = makeId("SIM");
    const run: OpsSimulationRun = {
      runId,
      scenarioId: scenario.scenarioId,
      scenarioType: type,
      status: RunStatus.RUNNING,
      startTime: simNowIso(),
      endTime: null,
      progress: 0,
      parameters: { ...params },
    };

    s.upsertSimulationRun(run);
    s.setActiveSimulationId(runId);

    // Dừng timer mô phỏng cũ nếu đang chạy
    if (activeSimulationTimer) {
      clearInterval(activeSimulationTimer);
      activeSimulationTimer = null;
    }

    // 4. Tiến trình chạy mô phỏng bất đồng bộ với thanh tiến trình mượt mà
    let progress = 0;
    activeSimulationTimer = setInterval(() => {
      progress += 25;
      if (progress < 100) {
        useStore.getState().updateSimulationProgress(runId, progress, RunStatus.RUNNING);
      } else {
        if (activeSimulationTimer) {
          clearInterval(activeSimulationTimer);
          activeSimulationTimer = null;
        }

        // 5. Tính toán kết quả mô phỏng trên bản sao snapshot (TUYỆT ĐỐI KHÔNG ghi vào useStore)
        const initialUtilization: Record<string, number> = {};
        const predictedUtilization: Record<string, number> = {};
        const overloadedHubs: string[] = [];

        for (const h of snapshot.hubs) {
          const stats = computeHubStats(
            { parkingSlots: snapshot.parkingSlots, chargingPorts: snapshot.chargingPorts, vehicles: snapshot.vehicles },
            h.hubId
          );
          initialUtilization[h.hubId] = stats.utilization;

          const predicted =
            h.hubId === params.hubId
              ? Math.min(1.0, stats.utilization * params.multiplier)
              : Math.min(0.95, stats.utilization + (params.multiplier - 1) * 0.15);

          predictedUtilization[h.hubId] = Number(predicted.toFixed(2));
          if (predicted > 0.85) {
            overloadedHubs.push(h.hubId);
          }
        }

        // Tính các chỉ số kỹ thuật KPI
        const targetHubName = snapshot.hubs.find((h) => h.hubId === params.hubId)?.name ?? params.hubId;
        const unservedDemandRate = Number(Math.min(35, (params.multiplier - 1) * 16).toFixed(1));
        const avgWaitingTimeMinutes = Math.round(8 + (params.multiplier - 1) * 9);
        const reroutedUsersCount = Math.round((params.multiplier - 1) * 28);

        // Sinh 3 gói khuyến nghị A, B, C
        const recommendations: OpsRecommendation[] = [
          {
            type: RecommendationType.REDISTRIBUTE,
            targetHubId: "HUB-DORM-02",
            description: `Phương án A: Điều chuyển 15 xe từ KTX Khu B về ${targetHubName} bằng xe tải chuyên dụng (ETA 18 phút).`,
          },
          {
            type: RecommendationType.REDIRECT,
            targetHubId: "HUB-CAMPUS-01",
            description: `Phương án B: Phân luồng 40% sinh viên di chuyển sang Hub ĐH Bách Khoa (cách 450m), tặng voucher 10.000đ.`,
          },
          {
            type: RecommendationType.RESCHEDULE,
            targetHubId: params.hubId,
            description: `Phương án C: Giới hạn mức sạc trần 75% tại trạm ${targetHubName} trong 60 phút để quay vòng cổng sạc.`,
          },
        ];

        const result: OpsSimulationResult = {
          runId,
          scenarioId: scenario.scenarioId,
          initialUtilization,
          predictedUtilization,
          overloadedHubs,
          unservedDemandRate,
          avgWaitingTimeMinutes,
          reroutedUsersCount,
          recommendations,
        };

        const storeNow = useStore.getState();
        storeNow.upsertSimulationResult(result);
        storeNow.updateSimulationProgress(runId, 100, RunStatus.COMPLETED);

        notify("role:OPERATOR", `Mô phỏng ${runId} (${type}) đã hoàn tất. Xem kết quả chi tiết.`, "info");
      }
    }, 600);

    return run;
  },

  /**
   * Hủy phiên mô phỏng đang chạy
   */
  cancelSimulation(runId: string): void {
    if (activeSimulationTimer) {
      clearInterval(activeSimulationTimer);
      activeSimulationTimer = null;
    }
    useStore.getState().updateSimulationProgress(runId, 0, RunStatus.CANCELLED);
    notify("role:OPERATOR", `Đã hủy phiên mô phỏng ${runId}. Dữ liệu vận hành an toàn.`, "warning");
  },

  /**
   * UC18: Áp dụng khuyến nghị từ mô phỏng vào hệ thống điều hành thực tế
   */
  applyRecommendation(runId: string, recIndex = 0): void {
    const s = useStore.getState();
    const result = s.simulationResults.find((r) => r.runId === runId);
    const run = s.simulationRuns.find((r) => r.runId === runId);
    if (!result || !result.recommendations || !run) return;

    const rec = result.recommendations[recIndex];
    if (!rec) return;

    // Chuyển đổi khuyến nghị thành lệnh điều phối thật
    if (rec.type === RecommendationType.REDISTRIBUTE) {
      const sourceHubId = rec.targetHubId; // Hub có xe điều đi
      const destHubId = String(run.parameters?.hubId ?? "HUB-METRO-01");

      const availableVehicles = s.vehicles
        .filter((v) => v.currentHubId === sourceHubId && v.status === "AVAILABLE")
        .slice(0, 5)
        .map((v) => v.vehicleId);

      const realOrder = OperationsService.createDispatchOrder(
        sourceHubId,
        destHubId,
        availableVehicles.length > 0 ? availableVehicles : ["VH-013", "VH-014", "VH-015"],
        "TRUCK",
        "Đội xe tải số 01 (Khuyến nghị từ Mô phỏng)"
      );

      // Tự động phê duyệt lệnh
      OperationsService.approveDispatchOrder(realOrder.orderId, "OPERATOR_SIM_APPLY");
    } else {
      OperationsService.raiseAlert(
        rec.targetHubId,
        "SIMULATION_RECOMMENDATION_APPLIED",
        AlertSeverity.INFO,
        `Áp dụng phương án: ${rec.description}`
      );
    }

    // Cập nhật trạng thái phiên
    s.updateSimulationProgress(runId, 100, "APPLIED" as ExtendedRunStatus);
    notify(
      "role:OPERATOR",
      `Đã áp dụng phương án khuyến nghị từ phiên mô phỏng ${runId} vào hệ thống điều hành thực tế.`,
      "success"
    );
  },

  /**
   * Từ chối khuyến nghị kèm lý do
   */
  rejectRecommendation(runId: string, reason: string): void {
    useStore.getState().rejectSimulationRun(runId, reason);
    notify("role:OPERATOR", `Đã từ chối phương án của phiên mô phỏng ${runId}. Lý do: ${reason}`, "info");
  },
};
