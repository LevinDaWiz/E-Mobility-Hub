import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, Modal, Progress, Table, type Column } from "../../components/ui";
import { OVERLOAD_THRESHOLD, WARNING_THRESHOLD } from "../../config/constants";
import { type ExtendedRecommendation, OverloadHandler } from "../../engine/overloadHandler";
import { useStore } from "../../store";
import { utilizationBarClass } from "../../styles/statusColors";
import type { Hub } from "../../types";
import { computeHubStats } from "../../utils/hubStats";

export function OverloadPage() {
  const navigate = useNavigate();
  const hubs = useStore((s) => s.hubs);
  const slots = useStore((s) => s.parkingSlots);
  const ports = useStore((s) => s.chargingPorts);
  const vehicles = useStore((s) => s.vehicles);

  const [activeModalHubId, setActiveModalHubId] = useState<string | null>(null);
  const [selectedRecIndex, setSelectedRecIndex] = useState<number>(0);

  const stateInput = { parkingSlots: slots, chargingPorts: ports, vehicles };

  const hubStatsList = hubs.map((h) => ({
    hub: h,
    stats: computeHubStats(stateInput, h.hubId),
  }));

  const overloadedHubs = hubStatsList.filter((item) => item.stats.utilization > OVERLOAD_THRESHOLD);
  const warningHubs = hubStatsList.filter(
    (item) => item.stats.utilization >= WARNING_THRESHOLD && item.stats.utilization <= OVERLOAD_THRESHOLD
  );

  const currentHub = hubs.find((h) => h.hubId === activeModalHubId);
  const currentStats = currentHub ? computeHubStats(stateInput, currentHub.hubId) : null;
  const currentRecommendations: ExtendedRecommendation[] = activeModalHubId
    ? OverloadHandler.proposeActions(activeModalHubId)
    : [];

  const handleApplyAction = () => {
    if (!currentRecommendations[selectedRecIndex]) return;
    const chosenRec = currentRecommendations[selectedRecIndex];
    OverloadHandler.applyAction(chosenRec);
    setActiveModalHubId(null);
    if (chosenRec.type === "REDISTRIBUTE") {
      navigate("/admin/vehicles/dispatch");
    }
  };

  const columns: Column<{ hub: Hub; stats: ReturnType<typeof computeHubStats> }>[] = [
    {
      header: "Hub",
      cell: ({ hub }) => (
        <div>
          <span className="font-semibold text-slate-900">{hub.name}</span>
          <p className="text-xs text-slate-400">{hub.hubId}</p>
        </div>
      ),
    },
    {
      header: "Mức sử dụng",
      className: "min-w-44",
      cell: ({ stats }) => (
        <Progress
          value={Math.round(stats.utilization * 100)}
          barClassName={utilizationBarClass(stats.utilization)}
          label={`${Math.round(stats.utilization * 100)}%`}
        />
      ),
    },
    {
      header: "Chỗ trống",
      cell: ({ stats }) => `${stats.freeSlots}/${stats.totalSlots}`,
    },
    {
      header: "Xe đỗ hiện tại",
      cell: ({ stats }) => `${stats.totalSlots - stats.freeSlots} xe`,
    },
    {
      header: "Trạng thái",
      cell: ({ stats }) =>
        stats.utilization > OVERLOAD_THRESHOLD ? (
          <Badge value="CRITICAL" label="Quá tải (>85%)" />
        ) : (
          <Badge value="WARNING" label="Tải cao (70-85%)" />
        ),
    },
    {
      header: "Hành động",
      className: "text-right",
      cell: ({ hub }) => (
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            setActiveModalHubId(hub.hubId);
            setSelectedRecIndex(0);
          }}
        >
          Xử lý quá tải
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-950">Cảnh báo & Xử lý Hub Quá tải</h1>
          <p className="text-sm text-slate-500">
            Tự động phát hiện Hub vượt ngưỡng sức chứa (NIFR-03) và đề xuất các gói giải tỏa áp lực (UC15).
          </p>
        </div>
      </div>

      {/* Danh sách Hub quá tải nghiêm trọng */}
      <Card
        title={`Các Hub đang Quá tải nghiêm trọng (${overloadedHubs.length})`}
        actions={<Badge value="CRITICAL" label="Ngưỡng kích hoạt: > 85%" />}
      >
        <Table
          columns={columns}
          rows={overloadedHubs}
          rowKey={(r) => r.hub.hubId}
          empty="Hiện không có Hub nào vượt ngưỡng quá tải nghiêm trọng."
        />
      </Card>

      {/* Danh sách Hub mức cảnh báo */}
      <Card
        title={`Các Hub đang ở mức Tải cao (${warningHubs.length})`}
        actions={<Badge value="WARNING" label="Ngưỡng chú ý: 70% - 85%" />}
      >
        <Table
          columns={columns}
          rows={warningHubs}
          rowKey={(r) => r.hub.hubId}
          empty="Không có Hub nào ở mức cảnh báo tải cao."
        />
      </Card>

      {/* Modal Phương án giải tỏa quá tải */}
      {currentHub && currentStats && (
        <Modal
          open={!!activeModalHubId}
          onClose={() => setActiveModalHubId(null)}
          title={`PHƯƠNG ÁN GIẢI TỎA HUB QUÁ TẢI – ${currentHub.name}`}
        >
          <div className="space-y-4">
            {/* Khung phân tích tình trạng */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Phân tích tình trạng hiện tại
              </h4>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Sức chứa chiếm dụng:</span>
                  <p className="text-lg font-bold text-rose-600">
                    {Math.round(currentStats.utilization * 100)}% ({currentStats.totalSlots - currentStats.freeSlots}/{currentStats.totalSlots} chỗ)
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Tốc độ dòng xe đến:</span>
                  <p className="text-lg font-bold text-amber-700">+12 xe / 10 phút (Cao 3.2x)</p>
                </div>
              </div>
            </div>

            {/* Danh sách phương án xử lý */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Chọn phương án giải tỏa áp lực:
              </p>
              <div className="space-y-3">
                {currentRecommendations.map((rec, idx) => (
                  <label
                    key={idx}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                      selectedRecIndex === idx
                        ? "border-brand-600 bg-brand-50/40 ring-1 ring-brand-600"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="recommendation"
                      className="mt-1 accent-brand-600"
                      checked={selectedRecIndex === idx}
                      onChange={() => setSelectedRecIndex(idx)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-sm">
                          {idx === 0
                            ? "1. Điều phối xe sang Hub khác"
                            : idx === 1
                            ? "2. Phân luồng dòng xe trả về"
                            : "3. Hạn chế tiếp nhận xe mới"}
                        </span>
                        <Badge
                          value={rec.impactScore === "HIGH" ? "AVAILABLE" : rec.impactScore === "MEDIUM" ? "RESERVED" : "FAULTY"}
                          label={rec.impactScore === "HIGH" ? "Hiệu quả Cao" : rec.impactScore === "MEDIUM" ? "Trung bình" : "Thấp"}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{rec.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Cảnh báo rủi ro thứ cấp */}
            {currentRecommendations[selectedRecIndex]?.riskWarning && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <span className="font-bold">⚠ Cảnh báo rủi ro: </span>
                {currentRecommendations[selectedRecIndex].riskWarning}
              </div>
            )}

            {/* Nút hành động */}
            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setActiveModalHubId(null)}>
                Tiếp tục theo dõi
              </Button>
              <Button variant="danger" onClick={handleApplyAction}>
                Áp dụng phương án
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
