import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Modal, Progress, Table, type Column } from "../../components/ui";
import {
  PRESET_SCENARIOS,
  SimulationService,
  type ScenarioDefinition,
} from "../../services/simulationService";
import { useStore } from "../../store";
import type {
  OpsRecommendation,
  OpsSimulationRun,
} from "../../store/opsSlice";
import {
  RecommendationType,
  RunStatus,
} from "../../types";

type TabKey = "CREATE" | "RUNNING" | "RESULTS" | "HISTORY";

export function SimulationPage() {
  const hubs = useStore((s) => s.hubs);
  const simulationRuns = useStore((s) => s.simulationRuns);
  const simulationResults = useStore((s) => s.simulationResults);
  const activeSimulationId = useStore((s) => s.activeSimulationId);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabKey>("CREATE");

  // Selection for Scenario Creation
  const [selectedScenarioCode, setSelectedScenarioCode] = useState<string>("WI01");
  const currentScenarioDef = useMemo(
    () => PRESET_SCENARIOS.find((s) => s.code === selectedScenarioCode) ?? PRESET_SCENARIOS[0],
    [selectedScenarioCode]
  );

  const [targetHubId, setTargetHubId] = useState<string>(currentScenarioDef.defaultHubId);
  const [durationMinutes, setDurationMinutes] = useState<number>(currentScenarioDef.defaultDuration);
  const [multiplier, setMultiplier] = useState<number>(currentScenarioDef.defaultMultiplier);
  const [strategy, setStrategy] = useState<string>("PROACTIVE_REBALANCE");

  // Custom Stress Test Event Timeline
  const [customEvents, setCustomEvents] = useState<Array<{ timeMin: number; type: string; target: string }>>([
    { timeMin: 15, type: "METRO_PEAK", target: "Ga Metro" },
    { timeMin: 30, type: "CHARGING_FAILURE", target: "Cổng P1" },
  ]);

  // Timeline slider for Results view
  const [timelineMinute, setTimelineMinute] = useState<number>(30);

  // Selected Run ID for Viewing Results
  const [viewingRunId, setViewingRunId] = useState<string | null>(null);

  // Modals for Recommendation Approval / Rejection
  const [confirmApplyModal, setConfirmApplyModal] = useState<{
    runId: string;
    recIndex: number;
    rec: OpsRecommendation;
  } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ runId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  // Report Modal (PDF view mockup)
  const [showReportModal, setShowReportModal] = useState(false);

  // Active Running Simulation Object
  const activeRun = useMemo(() => {
    return (
      simulationRuns.find((r) => r.runId === activeSimulationId && r.status === RunStatus.RUNNING) ??
      simulationRuns.find((r) => r.status === RunStatus.RUNNING)
    );
  }, [simulationRuns, activeSimulationId]);

  // Targeted Run Object for Results
  const currentResultRun = useMemo(() => {
    if (viewingRunId) {
      return simulationRuns.find((r) => r.runId === viewingRunId) ?? null;
    }
    // Default to latest completed run
    const completedRuns = simulationRuns.filter(
      (r) => r.status === RunStatus.COMPLETED || (r.status as string) === "APPLIED" || (r.status as string) === "REJECTED"
    );
    return completedRuns.length > 0 ? completedRuns[0] : null;
  }, [simulationRuns, viewingRunId]);

  // Result data for targeted run
  const currentResult = useMemo(() => {
    if (!currentResultRun) return null;
    return simulationResults.find((res) => res.runId === currentResultRun.runId) ?? null;
  }, [simulationResults, currentResultRun]);

  // Tự động chuyển sang Tab Kết quả khi phiên mô phỏng hoàn tất 100% (UC16 -> UC18)
  useEffect(() => {
    if (activeRun && (activeRun.progress ?? 0) >= 100) {
      const timer = setTimeout(() => {
        setViewingRunId(activeRun.runId);
        setActiveTab("RESULTS");
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [activeRun]);

  // Handle Scenario Choice Change
  const handleSelectPreset = (def: ScenarioDefinition) => {
    setSelectedScenarioCode(def.code);
    setTargetHubId(def.defaultHubId);
    setDurationMinutes(def.defaultDuration);
    setMultiplier(def.defaultMultiplier);
  };

  // Run Simulation Handler
  const handleStartSimulation = () => {
    const run = SimulationService.runScenario(currentScenarioDef.type, {
      hubId: targetHubId,
      duration: durationMinutes,
      multiplier,
      strategy,
      events: customEvents,
    });

    setViewingRunId(run.runId);
    setActiveTab("RUNNING");
  };

  // Cancel Simulation Handler
  const handleCancelSimulation = (runId: string) => {
    SimulationService.cancelSimulation(runId);
    setActiveTab("CREATE");
  };

  // Confirm Apply Recommendation
  const handleConfirmApply = () => {
    if (!confirmApplyModal) return;
    SimulationService.applyRecommendation(confirmApplyModal.runId, confirmApplyModal.recIndex);
    setConfirmApplyModal(null);
  };

  // Confirm Reject Recommendation
  const handleConfirmReject = () => {
    if (!rejectModal) return;
    const reason = rejectReason.trim() || "Phương án chưa phù hợp với năng lực điều phối hiện tại";
    SimulationService.rejectRecommendation(rejectModal.runId, reason);
    setRejectModal(null);
    setRejectReason("");
  };

  // Columns for History Table
  const historyColumns: Column<OpsSimulationRun>[] = [
    {
      header: "Mã phiên",
      cell: (r) => <span className="font-mono text-xs font-bold text-slate-800">#{r.runId}</span>,
    },
    {
      header: "Kịch bản",
      cell: (r) => (
        <span className="font-semibold text-slate-900 text-xs">
          {r.scenarioType ?? "Mô phỏng tổng quát"}
        </span>
      ),
    },
    {
      header: "Hub trọng điểm",
      cell: (r) => {
        const hubId = (r.parameters?.hubId as string) ?? "";
        const hub = hubs.find((h) => h.hubId === hubId);
        return <span className="text-xs text-slate-700">{hub?.name ?? hubId}</span>;
      },
    },
    {
      header: "Hệ số tải",
      cell: (r) => (
        <span className="font-medium text-xs text-blue-700">
          x{Number(r.parameters?.multiplier ?? 1).toFixed(1)} ({String(r.parameters?.duration ?? 60)}m)
        </span>
      ),
    },
    {
      header: "Trạng thái",
      cell: (r) => {
        let label = r.status as string;
        if (r.status === RunStatus.RUNNING) label = "Đang chạy";
        if (r.status === RunStatus.COMPLETED) label = "Hoàn tất";
        if ((r.status as string) === "APPLIED") label = "Đã áp dụng thực tế";
        if ((r.status as string) === "REJECTED") label = "Đã từ chối";
        if (r.status === RunStatus.CANCELLED) label = "Đã hủy";

        return <Badge value={r.status as string} label={label} />;
      },
    },
    {
      header: "Thời gian chạy",
      cell: (r) => (
        <span className="text-xs text-slate-500">
          {new Date(r.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      header: "Thao tác",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setViewingRunId(r.runId);
              setActiveTab("RESULTS");
            }}
          >
            Xem kết quả
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const def = PRESET_SCENARIOS.find((p) => p.type === r.scenarioType);
              if (def) handleSelectPreset(def);
              setActiveTab("CREATE");
            }}
          >
            Nạp lại
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Phân hệ Mô phỏng Kịch bản What-if
          </h1>
          <p className="text-sm text-slate-500">
            Thử nghiệm các giả định tải đột biến và chuỗi sự cố trong môi trường độc lập cách ly (NIFR-08, UC16, UC18)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeRun && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-violet-600"></span>
              Đang mô phỏng #{activeRun.runId} ({activeRun.progress ?? 0}%)
            </span>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("CREATE")}
          className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "CREATE"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          1. Thiết lập kịch bản (UC16)
        </button>

        <button
          onClick={() => setActiveTab("RUNNING")}
          className={`border-b-2 px-5 py-3 text-sm font-semibold transition flex items-center gap-1.5 ${
            activeTab === "RUNNING"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          2. Tiến trình mô phỏng
          {activeRun && <span className="h-2 w-2 rounded-full bg-violet-500"></span>}
        </button>

        <button
          onClick={() => setActiveTab("RESULTS")}
          className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "RESULTS"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          3. Kết quả & Khuyến nghị (UC18)
        </button>

        <button
          onClick={() => setActiveTab("HISTORY")}
          className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "HISTORY"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          4. Lịch sử mô phỏng ({simulationRuns.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: CREATE SCENARIO (UC16)
          ========================================================================= */}
      {activeTab === "CREATE" && (
        <div className="space-y-6">
          {/* Preset Scenarios Selector Grid (10 WI Presets) */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Lựa chọn kịch bản giả định (Danh mục 10 kịch bản WI-01 đến WI-10)
              </h2>
              <span className="text-xs text-slate-500">
                Được chuẩn hóa theo đặc tả vận hành đô thị ĐHQG-HCM
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {PRESET_SCENARIOS.map((sc) => {
                const isSelected = sc.code === selectedScenarioCode;
                return (
                  <div
                    key={sc.code}
                    onClick={() => handleSelectPreset(sc)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                          isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {sc.code}
                      </span>
                      <span className="text-[11px] text-slate-400">{sc.defaultDuration}m</span>
                    </div>

                    <h3 className="mt-2 text-xs font-bold text-slate-900 leading-snug">
                      {sc.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 leading-tight">
                      {sc.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuration & Parameters Panel */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Thông số thử nghiệm kịch bản [{currentScenarioDef.code}]: {currentScenarioDef.title}
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Hub trọng điểm chịu tác động
                  </label>
                  <select
                    aria-label="Hub trọng điểm chịu tác động"
                    value={targetHubId}
                    onChange={(e) => setTargetHubId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {hubs.map((h) => (
                      <option key={h.hubId} value={h.hubId}>
                        {h.name} ({h.hubId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Thời lượng mô phỏng (phút ảo)
                  </label>
                  <select
                    aria-label="Thời lượng mô phỏng (phút ảo)"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value={30}>30 phút</option>
                    <option value={45}>45 phút</option>
                    <option value={60}>60 phút (Khuyến nghị)</option>
                    <option value={90}>90 phút</option>
                    <option value={120}>120 phút (Cao điểm 2 giờ)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Hệ số tải / Nhu cầu (Multiplier)
                  </label>
                  <select
                    aria-label="Hệ số tải / Nhu cầu (Multiplier)"
                    value={multiplier}
                    onChange={(e) => setMultiplier(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value={1.5}>x1.5 (Tăng nhẹ +50%)</option>
                    <option value={2.0}>x2.0 (Gấp đôi nhu cầu thông thường)</option>
                    <option value={2.5}>x2.5 (Giờ tan tầm Ga Metro)</option>
                    <option value={3.0}>x3.0 (Cực đại Stress Test)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Chiến lược phản ứng giả định
                  </label>
                  <select
                    aria-label="Chiến lược phản ứng giả định"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="PROACTIVE_REBALANCE">Cân bằng tải chủ động (Proactive Fleet Rebalancing)</option>
                    <option value="REACTIVE_DISPATCH">Điều phối phản ứng theo ngưỡng (Reactive Dispatch)</option>
                    <option value="LOAD_SHEDDING">Điều hướng & Tạm giới hạn (Dynamic Load Shedding)</option>
                    <option value="BASELINE_NOOP">Không can thiệp (Quan sát Baseline quá tải)</option>
                  </select>
                </div>
              </div>

              {/* Stress-Test Timeline Events builder */}
              <div className="pt-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Bảng dòng thời gian biến cố (Stress-Test Timeline)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomEvents([
                        ...customEvents,
                        { timeMin: 45, type: "SECONDARY_JAM", target: "Hub KTX Khu B" },
                      ])
                    }
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    + Thêm mốc biến cố
                  </button>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
                  {customEvents.map((ev, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700">T+{ev.timeMin}m</span>
                        <span className="font-medium text-slate-800">{ev.type}</span>
                        <span className="text-slate-500 text-[11px]">→ tác động {ev.target}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomEvents(customEvents.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 text-xs"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Sidebar Summary & Launch */}
            <Card className="p-5 flex flex-col justify-between space-y-4 bg-slate-50/50">
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                  Tóm tắt phiên chuẩn bị
                </h2>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã kịch bản:</span>
                    <span className="font-bold text-slate-800">{currentScenarioDef.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Loại thử nghiệm:</span>
                    <span className="font-medium text-slate-800">{currentScenarioDef.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hub trọng điểm:</span>
                    <span className="font-medium text-slate-800">
                      {hubs.find((h) => h.hubId === targetHubId)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hệ số nhân tải:</span>
                    <span className="font-bold text-rose-600">x{multiplier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Thời gian mô phỏng:</span>
                    <span className="font-medium text-slate-800">{durationMinutes} phút</span>
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-50 p-3 text-[11px] text-emerald-800 border border-emerald-200 leading-relaxed">
                  🛡️ <strong>Tuân thủ NIFR-08:</strong> Mô phỏng thực thi trên bản sao Snapshot độc lập. Không làm biến động hay ghi đè dữ liệu thực tế tại Zustand Prod Store cho đến khi bạn xác nhận áp dụng.
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full py-2.5 text-sm font-semibold shadow-md bg-blue-600 hover:bg-blue-700"
                onClick={handleStartSimulation}
              >
                🚀 Bắt đầu chạy Simulation
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: RUNNING PROGRESS MONITOR
          ========================================================================= */}
      {activeTab === "RUNNING" && (
        <div className="space-y-6">
          {activeRun ? (
            <Card className="p-8 max-w-2xl mx-auto space-y-6 text-center">
              <div>
                <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
                  MÔ PHỎNG ĐANG THỰC THI (UC16)
                </span>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  Phiên #{activeRun.runId} - {activeRun.scenarioType}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Đang bước thời gian và tính toán rủi ro dây chuyền tại RAM Sandbox...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress
                  value={activeRun.progress ?? 0}
                  max={100}
                  label="Tiến trình tính toán What-if"
                  barClassName="bg-blue-600"
                />
              </div>

              {/* 4 Execution Steps */}
              <div className="grid grid-cols-1 gap-2 text-left sm:grid-cols-2 text-xs">
                <div
                  className={`rounded-lg p-3 border ${
                    (activeRun.progress ?? 0) >= 25
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <div className="font-semibold">✓ Bước 1: Deep-Clone Snapshot</div>
                  <div className="text-[11px] text-slate-600">Cách ly hoàn toàn dữ liệu thực tế (NIFR-08).</div>
                </div>

                <div
                  className={`rounded-lg p-3 border ${
                    (activeRun.progress ?? 0) >= 50
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <div className="font-semibold">✓ Bước 2: Bơm biến cố giả định</div>
                  <div className="text-[11px] text-slate-600">Tính toán dòng xe đến & tiêu thụ chỗ đỗ.</div>
                </div>

                <div
                  className={`rounded-lg p-3 border ${
                    (activeRun.progress ?? 0) >= 75
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <div className="font-semibold">✓ Bước 3: Đánh giá chỉ số KPI</div>
                  <div className="text-[11px] text-slate-600">Phát hiện quá tải thứ cấp & thời gian chờ.</div>
                </div>

                <div
                  className={`rounded-lg p-3 border ${
                    (activeRun.progress ?? 0) >= 100
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <div className="font-semibold">✓ Bước 4: Khuyến nghị điều hành</div>
                  <div className="text-[11px] text-slate-600">Sinh các phương án điều phối tối ưu A/B/C.</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="danger"
                  onClick={() => handleCancelSimulation(activeRun.runId)}
                >
                  Hủy mô phỏng an toàn
                </Button>
                {(activeRun.progress ?? 0) >= 100 && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setViewingRunId(activeRun.runId);
                      setActiveTab("RESULTS");
                    }}
                  >
                    Xem kết quả chi tiết →
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-slate-500 space-y-3">
              <div className="text-4xl">⏳</div>
              <h2 className="text-base font-semibold text-slate-800">Không có phiên mô phỏng nào đang chạy</h2>
              <p className="text-xs">
                Bạn có thể quay lại Tab 1 để tạo kịch bản mới hoặc chuyển sang Tab 3 để xem các kết quả đã hoàn tất.
              </p>
              <div className="pt-2">
                <Button variant="primary" onClick={() => setActiveTab("CREATE")}>
                  Tạo mô phỏng mới
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: RESULTS & RECOMMENDATIONS (UC18)
          ========================================================================= */}
      {activeTab === "RESULTS" && (
        <div className="space-y-6">
          {currentResult && currentResultRun ? (
            <>
              {/* Result Summary Banner */}
              <div className="flex flex-col gap-3 rounded-xl bg-slate-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">
                      Phiên #{currentResultRun.runId}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold">
                      {currentResultRun.scenarioType}
                    </span>
                    <Badge
                      value={currentResultRun.status as string}
                      label={
                        (currentResultRun.status as string) === "APPLIED"
                          ? "Đã áp dụng thực tế"
                          : (currentResultRun.status as string) === "REJECTED"
                          ? "Đã từ chối"
                          : "Hoàn tất phân tích"
                      }
                    />
                  </div>
                  <h2 className="mt-1 text-lg font-bold">
                    Kết quả mô phỏng kịch bản What-if & Báo cáo tác động
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowReportModal(true)}
                  >
                    📄 Xuất báo cáo (PDF)
                  </Button>
                </div>
              </div>

              {/* 4 KPIs Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-rose-500 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tỷ lệ nhu cầu không được đáp ứng
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-rose-600">
                      {Number(currentResult.unservedDemandRate ?? 18).toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-500">do thiếu xe / chỗ</span>
                  </div>
                </Card>

                <Card className="border-l-4 border-l-amber-500 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Thời gian chờ trung bình
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-amber-600">
                      {Number(currentResult.avgWaitingTimeMinutes ?? 12).toFixed(0)} phút
                    </span>
                    <span className="text-xs text-slate-500">khi nhận xe</span>
                  </div>
                </Card>

                <Card className="border-l-4 border-l-blue-500 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Lượt khách cần đổi hướng
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-blue-600">
                      {currentResult.reroutedUsersCount ?? 14} lượt
                    </span>
                    <span className="text-xs text-slate-500">sang Hub lân cận</span>
                  </div>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Phương án khả thi
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-emerald-600">
                      {currentResult.recommendations?.length ?? 3} phương án
                    </span>
                    <span className="text-xs text-slate-500">được sinh tự động</span>
                  </div>
                </Card>
              </div>

              {/* Hub Before vs After Comparison & Interactive Timeline */}
              <Card className="p-5 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Đối chiếu mức tải chỗ đỗ: Hiện trạng vs. Sau mô phỏng
                    </h2>
                    <p className="text-xs text-slate-500">
                      Kéo thanh trượt để quan sát diễn biến mức tải theo từng mốc thời gian giả định
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-700">
                      Mốc thời gian: T+{timelineMinute} phút
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={15}
                      value={timelineMinute}
                      onChange={(e) => setTimelineMinute(Number(e.target.value))}
                      className="w-36 accent-blue-600"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold uppercase">
                        <th className="px-3 py-2 text-left">Hub</th>
                        <th className="px-3 py-2 text-center">Tải hiện trạng (Snapshot)</th>
                        <th className="px-3 py-2 text-center">Tải dự báo (T+{timelineMinute}m)</th>
                        <th className="px-3 py-2 text-center">Chênh lệch</th>
                        <th className="px-3 py-2 text-left">Đánh giá nguy cơ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hubs.map((hub) => {
                        const initVal =
                          (currentResult.initialUtilization?.[hub.hubId] ?? 0.65) * 100;
                        const factor = 1 + (timelineMinute / 60) * 0.4;
                        const predVal = Math.min(
                          100,
                          Math.round(
                            (currentResult.predictedUtilization?.[hub.hubId] ?? 0.8) *
                              (hub.hubId === currentResultRun.parameters?.hubId ? factor : 1) *
                              100
                          )
                        );
                        const diff = predVal - initVal;
                        const isOverloaded = predVal > 85;

                        return (
                          <tr key={hub.hubId} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-medium text-slate-800">
                              {hub.name}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="font-mono">{initVal.toFixed(0)}%</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`font-mono font-bold ${
                                  isOverloaded ? "text-rose-600" : "text-slate-800"
                                }`}
                              >
                                {predVal}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`font-mono font-semibold ${
                                  diff > 0 ? "text-rose-600" : "text-emerald-600"
                                }`}
                              >
                                {diff > 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {isOverloaded ? (
                                <span className="inline-flex items-center rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                                  ⚠️ Nguy cơ quá tải nghiêm trọng
                                </span>
                              ) : predVal > 70 ? (
                                <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                  ⚡ Cảnh báo tải cao
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                  ✓ Bình thường
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* 3 Recommendations (A, B, C) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Các phương án khuyến nghị điều hành (UC18)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Chọn phương án tối ưu để triển khai trực tiếp vào hệ thống vận hành thực tế
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {(currentResult.recommendations ?? []).map((rec, idx) => {
                    const isHigh = rec.impactScore === "HIGH" || idx === 0;
                    return (
                      <Card
                        key={idx}
                        className={`p-4 flex flex-col justify-between space-y-4 border-2 transition ${
                          isHigh ? "border-blue-500 bg-blue-50/20" : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="rounded bg-slate-900 px-2 py-0.5 font-bold text-white text-xs">
                              Phương án {String.fromCharCode(65 + idx)}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                                isHigh
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              Hiệu quả: {rec.impactScore ?? "HIGH"}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900">
                            {rec.type === RecommendationType.REDISTRIBUTE
                              ? "Điều phối phương tiện chủ động"
                              : rec.type === RecommendationType.RESCHEDULE
                              ? "Dời lịch sạc tránh giờ cao điểm"
                              : "Điều hướng dòng người dùng"}
                          </h3>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {rec.description}
                          </p>

                          <div className="rounded bg-slate-100/70 p-2 text-[11px] text-slate-600">
                            <div>• Hub nguồn: {rec.fromHubId || "Toàn mạng"}</div>
                            <div>• Hub nhận: {rec.toHubId || "Hub lân cận"}</div>
                            <div>• Khối lượng xe: {rec.vehicleCount ?? 4} xe</div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() =>
                              setConfirmApplyModal({
                                runId: currentResultRun.runId,
                                recIndex: idx,
                                rec,
                              })
                            }
                          >
                            ✓ Áp dụng vào thực tế
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setRejectModal({ runId: currentResultRun.runId })}
                          >
                            Từ chối
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <Card className="p-12 text-center text-slate-500 space-y-3">
              <div className="text-4xl">📊</div>
              <h2 className="text-base font-semibold text-slate-800">Chưa có kết quả mô phỏng nào được chọn</h2>
              <p className="text-xs">
                Vui lòng khởi chạy một phiên mô phỏng mới tại Tab 1 hoặc chọn phiên từ danh sách Lịch sử tại Tab 4.
              </p>
              <div className="pt-2">
                <Button variant="primary" onClick={() => setActiveTab("CREATE")}>
                  Đến Tab Thiết lập kịch bản
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: SIMULATION HISTORY
          ========================================================================= */}
      {activeTab === "HISTORY" && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Lịch sử các phiên mô phỏng What-if đã thực hiện ({simulationRuns.length})
            </h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setActiveTab("CREATE")}
            >
              + Tạo phiên mới
            </Button>
          </div>
          <Table
            columns={historyColumns}
            rows={simulationRuns}
            rowKey={(r) => r.runId}
            empty="Chưa có phiên mô phỏng nào trong lịch sử."
          />
        </Card>
      )}

      {/* Modal: Confirm Apply Recommendation to Real Operations */}
      {confirmApplyModal && (
        <Modal
          open={!!confirmApplyModal}
          title="Xác nhận áp dụng khuyến nghị vào điều hành thực tế (UC18)"
          onClose={() => setConfirmApplyModal(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmApplyModal(null)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleConfirmApply}
              >
                Xác nhận & Chuyển sang Điều phối thực tế
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-slate-700">
            <p>
              Hệ thống sẽ chuyển khuyến nghị này thành một <strong>Lệnh điều phối thật (DispatchOrder)</strong> trong hệ thống vận hành:
            </p>

            <div className="rounded-lg bg-blue-50 p-3 border border-blue-200 space-y-1">
              <div className="font-bold text-blue-900">
                {confirmApplyModal.rec.description}
              </div>
              <div className="text-blue-800 text-[11px]">
                Hub nguồn: <strong>{confirmApplyModal.rec.fromHubId || confirmApplyModal.rec.targetHubId}</strong> → Hub đích:{" "}
                <strong>{confirmApplyModal.rec.toHubId || (currentResultRun?.parameters?.hubId as string) || "HUB-METRO-01"}</strong>
                {confirmApplyModal.rec.vehicleCount ? ` (${confirmApplyModal.rec.vehicleCount} xe)` : ""}
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Sau khi xác nhận, lệnh điều phối sẽ được tạo và tự động phê duyệt (<code>APPROVED</code>) tại màn hình{" "}
              <strong>/admin/vehicles/dispatch</strong> để nhân sự vận hành tiến hành điều động xe tải.
            </p>
          </div>
        </Modal>
      )}

      {/* Modal: Reject Recommendation */}
      {rejectModal && (
        <Modal
          open={!!rejectModal}
          title="Từ chối phương án mô phỏng"
          onClose={() => setRejectModal(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRejectModal(null)}>
                Đóng
              </Button>
              <Button variant="danger" onClick={handleConfirmReject}>
                Xác nhận từ chối
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-slate-700">
            <label className="block font-semibold text-slate-800">
              Lý do từ chối phương án (Lưu vào nhật ký vận hành):
            </label>
            <textarea
              rows={3}
              placeholder="VD: Không đủ xe tải vận chuyển vào khung giờ này, ưu tiên giải pháp phân luồng..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </Modal>
      )}

      {/* Modal: PDF Report Mockup */}
      {showReportModal && (
        <Modal
          open={showReportModal}
          title="Báo cáo Đánh giá Tác động Kịch bản What-if (Dành cho Ban Quản Lý)"
          onClose={() => setShowReportModal(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowReportModal(false)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  window.print();
                  setShowReportModal(false);
                }}
              >
                In báo cáo / Lưu PDF
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-slate-800 print:text-black">
            <div className="border-b border-slate-200 pb-2 text-center">
              <h2 className="text-sm font-bold uppercase text-slate-900">
                ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH
              </h2>
              <div className="text-[11px] text-slate-500">
                BAN ĐIỀU HÀNH MẠNG LƯỚI PHƯƠNG TIỆN ĐIỆN NỘI KHU (SMART E-MOBILITY HUB)
              </div>
            </div>

            <div className="space-y-1">
              <div><strong>Kịch bản:</strong> {currentResultRun?.scenarioType}</div>
              <div><strong>Thời gian chạy mô phỏng:</strong> {currentResultRun?.startTime}</div>
              <div><strong>Hệ số tải áp dụng:</strong> x{Number(currentResultRun?.parameters?.multiplier ?? 1).toFixed(1)}</div>
              <div><strong>Tỷ lệ nhu cầu không phục vụ:</strong> {Number(currentResult?.unservedDemandRate ?? 0).toFixed(1)}%</div>
            </div>

            <div className="rounded bg-slate-50 p-2 text-[11px] leading-relaxed">
              <strong>Kết luận chuyên môn:</strong> Khi xảy ra biến cố tải đột biến hoặc sự cố cổng sạc, việc can thiệp bằng phương án điều phối chủ động A (chuyển xe từ KTX sang Ga Metro) giúp hạ tải tại Ga Metro xuống dưới 80%, giải quyết 85% nhu cầu khách bộ hành và ngăn ngừa tình trạng ùn tắc thứ cấp.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
