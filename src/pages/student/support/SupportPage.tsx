import { useMemo, useState } from "react";
import { Badge, Button, Card, Modal } from "../../../components/ui";
import { OperationsService } from "../../../services/operationsService";
import { useStore } from "../../../store";
import type { OpsIncidentTicket } from "../../../store/opsSlice";
import { TicketStatus, TicketType } from "../../../types";
import { simNowIso } from "../../../utils/time";

const COMMON_VEHICLE_ISSUES = [
  "Lốp xe bị xẹp / non hơi",
  "Phanh trước hoặc sau không ăn",
  "Không thể mở khóa xe qua ứng dụng",
  "Pin tụt nhanh bất thường hoặc không khởi động được",
  "Hỏng còi, đèn chiếu sáng hoặc xi-nhan",
  "Xe phát ra tiếng kêu lạ ở động cơ",
];

const COMMON_PORT_ISSUES = [
  "Cổng sạc không nhận súng sạc",
  "Đã cắm súng nhưng không vào điện",
  "Dây sạc bị rách vỏ cách điện / có dấu hiệu chập",
  "Màn hình hiển thị trụ sạc báo lỗi hoặc tắt",
  "Đầu nối sạc bị kẹt không rút ra được",
];

export function SupportPage() {
  const hubs = useStore((s) => s.hubs);
  const vehicles = useStore((s) => s.vehicles);
  const ports = useStore((s) => s.chargingPorts);
  const tickets = useStore((s) => s.tickets);
  const userName = useStore((s) => s.currentUser.name);

  // Tab switch
  const [activeTab, setActiveTab] = useState<"NEW_REPORT" | "MY_TICKETS">("NEW_REPORT");

  // Form states
  const [reportType, setReportType] = useState<TicketType>(TicketType.VEHICLE_FAULT);
  const [selectedHubId, setSelectedHubId] = useState<string>(hubs[0]?.hubId ?? "");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [customDetail, setCustomDetail] = useState<string>("");
  const [isEmergency, setIsEmergency] = useState<boolean>(false);

  // Success Modal
  const [submittedTicket, setSubmittedTicket] = useState<OpsIncidentTicket | null>(null);

  // Available devices based on Hub & Type
  const availableVehicles = useMemo(
    () => vehicles.filter((v) => v.currentHubId === selectedHubId),
    [vehicles, selectedHubId]
  );

  const availablePorts = useMemo(
    () => ports.filter((p) => p.hubId === selectedHubId),
    [ports, selectedHubId]
  );

  // Common issue checklist according to type
  const issueList = reportType === TicketType.VEHICLE_FAULT ? COMMON_VEHICLE_ISSUES : COMMON_PORT_ISSUES;

  // Toggle issue checkbox
  const handleToggleIssue = (issue: string) => {
    if (selectedIssues.includes(issue)) {
      setSelectedIssues(selectedIssues.filter((i) => i !== issue));
    } else {
      setSelectedIssues([...selectedIssues, issue]);
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const target = selectedTargetId || (reportType === TicketType.VEHICLE_FAULT ? availableVehicles[0]?.vehicleId : availablePorts[0]?.portId) || "THIET-BI-CHUNG";
    const issuesDesc = selectedIssues.length > 0 ? `Vấn đề: ${selectedIssues.join(", ")}. ` : "";
    const fullDesc = `${issuesDesc}${customDetail.trim() ? `Chi tiết: ${customDetail.trim()}` : ""}${isEmergency ? " [YÊU CẦU CỨU HỘ KHẨN CẤP TẠI CHỖ]" : ""}`;

    const newTicket: OpsIncidentTicket = {
      ticketId: "",
      type: reportType,
      targetId: target,
      hubId: selectedHubId,
      description: fullDesc || "Sinh viên phản ánh sự cố kỹ thuật qua ứng dụng",
      status: TicketStatus.OPEN,
      createdAt: simNowIso(),
    };

    const created = OperationsService.handleIncident(newTicket);
    setSubmittedTicket(created);

    // Reset Form
    setSelectedIssues([]);
    setCustomDetail("");
    setIsEmergency(false);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Hỗ trợ & Báo cáo Sự cố
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Đội kỹ thuật và cứu hộ E-Mobility ĐHQG sẵn sàng trợ giúp bạn 24/7 (UC14)
        </p>
      </div>

      {/* Hotline emergency banner */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-rose-600 to-red-700 p-4 text-white shadow-md">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-200">
            Tổng đài Cứu hộ khẩn cấp
          </span>
          <div className="text-xl font-black">1900 6868</div>
          <div className="text-xs text-rose-100">Miễn phí cho sinh viên ĐHQG-HCM</div>
        </div>
        <a
          href="tel:19006868"
          className="rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-rose-700 shadow hover:bg-rose-50"
        >
          📞 Gọi ngay
        </a>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("NEW_REPORT")}
          className={`rounded-lg py-2 transition ${
            activeTab === "NEW_REPORT"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Báo cáo sự cố mới
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("MY_TICKETS")}
          className={`rounded-lg py-2 transition ${
            activeTab === "MY_TICKETS"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Lịch sử phiếu đã gửi ({tickets.length})
        </button>
      </div>

      {/* TAB 1: NEW REPORT FORM */}
      {activeTab === "NEW_REPORT" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-800">
                1. Chọn phân loại sự cố
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportType(TicketType.VEHICLE_FAULT);
                    setSelectedTargetId("");
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    reportType === TicketType.VEHICLE_FAULT
                      ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="text-xl">🚗</div>
                  <div className="mt-1 font-bold text-xs text-slate-900">Phương tiện điện</div>
                  <div className="text-[11px] text-slate-500">Xe máy điện / Xe đạp điện</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReportType(TicketType.PORT_FAULT);
                    setSelectedTargetId("");
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    reportType === TicketType.PORT_FAULT
                      ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="text-xl">⚡</div>
                  <div className="mt-1 font-bold text-xs text-slate-900">Trạm / Cổng sạc</div>
                  <div className="text-[11px] text-slate-500">Trụ sạc, súng sạc, dây dẫn</div>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-800">
                2. Vị trí Hub xảy ra sự cố
              </label>
              <select
                aria-label="Vị trí Hub xảy ra sự cố"
                value={selectedHubId}
                onChange={(e) => {
                  setSelectedHubId(e.target.value);
                  setSelectedTargetId("");
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              >
                {hubs.map((h) => (
                  <option key={h.hubId} value={h.hubId}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-800">
                3. Chọn thiết bị cụ thể (Nếu nhận biết được mã)
              </label>
              <select
                aria-label="Chọn thiết bị cụ thể"
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Thiết bị chưa rõ mã định danh --</option>
                {reportType === TicketType.VEHICLE_FAULT
                  ? availableVehicles.map((v) => (
                      <option key={v.vehicleId} value={v.vehicleId}>
                        {v.vehicleId} ({v.type} - Pin: {v.batteryLevel}%)
                      </option>
                    ))
                  : availablePorts.map((p) => (
                      <option key={p.portId} value={p.portId}>
                        {p.portId} (Công suất: {p.powerKw}kW)
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-slate-800">
                4. Chọn triệu chứng thường gặp (Tích chọn nhiều mục)
              </label>
              <div className="space-y-1.5">
                {issueList.map((issue) => {
                  const isChecked = selectedIssues.includes(issue);
                  return (
                    <label
                      key={issue}
                      onClick={() => handleToggleIssue(issue)}
                      className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs cursor-pointer transition ${
                        isChecked
                          ? "border-blue-500 bg-blue-50 text-blue-900 font-medium"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>{issue}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-800">
                5. Mô tả bổ sung triệu chứng hoặc vị trí đỗ hiện tại
              </label>
              <textarea
                rows={3}
                placeholder="VD: Xe đang đỗ gần cổng sau KTX Bách Khoa, màn hình xe chớp đỏ liên tục..."
                value={customDetail}
                onChange={(e) => setCustomDetail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-rose-900">
                    Cần hỗ trợ cứu hộ khẩn cấp ngay tại chỗ
                  </span>
                  <div className="text-[11px] text-rose-700">
                    Kỹ thuật viên sẽ lập tức được điều động kèm xe cứu hộ đến tọa độ của bạn.
                  </div>
                </div>
              </label>
            </div>
          </Card>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 text-sm font-semibold shadow-md bg-blue-600 hover:bg-blue-700"
          >
            🚀 Gửi báo cáo sự cố & Yêu cầu kỹ thuật
          </Button>
        </form>
      )}

      {/* TAB 2: MY TICKETS LIST */}
      {activeTab === "MY_TICKETS" && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <Card className="p-8 text-center text-slate-500 space-y-2">
              <div className="text-3xl">🎉</div>
              <h2 className="text-sm font-semibold text-slate-800">Không có sự cố nào được ghi nhận</h2>
              <p className="text-xs">Hệ thống xe điện và trụ sạc đang vận hành trơn tru.</p>
            </Card>
          ) : (
            tickets.map((t) => (
              <Card key={t.ticketId} className="p-3.5 space-y-2 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-800">
                    #{t.ticketId}
                  </span>
                  <Badge
                    value={t.status}
                    label={
                      t.status === TicketStatus.OPEN
                        ? "Tiếp nhận"
                        : t.status === TicketStatus.ASSIGNED
                        ? "Đã cử KTV"
                        : t.status === TicketStatus.IN_PROGRESS
                        ? "Đang sửa chữa"
                        : "Đã khắc phục"
                    }
                  />
                </div>

                <div className="text-xs">
                  <div className="font-semibold text-slate-900">
                    {t.type === TicketType.VEHICLE_FAULT ? "🚗 Xe: " : "⚡ Cổng sạc: "}
                    {t.targetId}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Tại Hub: {hubs.find((h) => h.hubId === t.hubId)?.name ?? t.hubId}
                  </div>
                  <p className="mt-1 text-slate-700 leading-relaxed bg-slate-50 p-2 rounded">
                    {t.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400">
                  <span>
                    KTV: <strong className="text-slate-700">{t.assignedTo ? t.assignedTo.split("(")[0] : "Chờ phân bổ"}</strong>
                  </span>
                  <span>{t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal when Submitted */}
      {submittedTicket && (
        <Modal
          open={!!submittedTicket}
          title="Báo cáo sự cố đã được gửi thành công!"
          onClose={() => setSubmittedTicket(null)}
          footer={
            <Button
              variant="primary"
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setSubmittedTicket(null);
                setActiveTab("MY_TICKETS");
              }}
            >
              Xem tiến trình xử lý
            </Button>
          }
        >
          <div className="space-y-3 text-xs text-slate-700 text-center py-2">
            <div className="text-4xl">✅</div>
            <h2 className="text-sm font-bold text-slate-900">
              Mã tiếp nhận: #{submittedTicket.ticketId}
            </h2>
            <p className="text-slate-600">
              Cảm ơn bạn <strong>{userName}</strong>. Phiếu báo cáo sự cố kỹ thuật của bạn đã được chuyển thẳng tới Trung tâm Điều hành Vận hành (M4).
            </p>
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800 text-left border border-emerald-200 text-[11px] space-y-1">
              <div>✓ Thiết bị hỏng đã được tạm khóa để đảm bảo an toàn cho người dùng khác.</div>
              <div>✓ Kỹ thuật viên phụ trách khu vực sẽ liên hệ hoặc đến hỗ trợ trong vòng 10–15 phút.</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
