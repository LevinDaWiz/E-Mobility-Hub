import { useMemo, useState } from "react";
import { Badge, Button, Card, Modal, Table, type Column } from "../../components/ui";
import { OperationsService } from "../../services/operationsService";
import { useStore } from "../../store";
import type { OpsIncidentTicket } from "../../store/opsSlice";
import { TicketStatus, TicketType } from "../../types";

const TECHNICIANS = [
  "Võ Thanh Tâm (Đội Kỹ thuật Điện - Trạm Ga Metro)",
  "Trần Minh Hoàng (Đội Cơ khí - Trạm KTX Khu B)",
  "Lê Quốc Bảo (Đội Bảo trì Hạ tầng - Trạm KTX Khu A)",
  "Nguyễn Tuấn Vỹ (Kỹ thuật viên Vận hành M4)",
  "Đỗ Hoàng Nam (Đội Phản ứng nhanh - Cơ sở 2)",
];

export function IncidentsPage() {
  const tickets = useStore((s) => s.tickets);
  const hubs = useStore((s) => s.hubs);
  const vehicles = useStore((s) => s.vehicles);
  const ports = useStore((s) => s.chargingPorts);
  const alerts = useStore((s) => s.alerts);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [hubFilter, setHubFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState<OpsIncidentTicket | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<string>(TECHNICIANS[0]);
  const [resolutionNote, setResolutionNote] = useState<string>("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // New report form state
  const [newReportType, setNewReportType] = useState<TicketType>(TicketType.VEHICLE_FAULT);
  const [newReportHubId, setNewReportHubId] = useState<string>(hubs[0]?.hubId ?? "");
  const [newReportTargetId, setNewReportTargetId] = useState<string>("");
  const [newReportDesc, setNewReportDesc] = useState<string>("");

  // KPIs
  const openCount = tickets.filter((t) => t.status === TicketStatus.OPEN).length;
  const inProgressCount = tickets.filter(
    (t) => t.status === TicketStatus.ASSIGNED || t.status === TicketStatus.IN_PROGRESS
  ).length;
  const closedCount = tickets.filter((t) => t.status === TicketStatus.CLOSED).length;
  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL" && !a.resolved).length;

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && t.type !== typeFilter) return false;
      if (hubFilter !== "ALL" && t.hubId !== hubFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = t.ticketId.toLowerCase().includes(q);
        const matchTarget = t.targetId.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchTech = t.assignedTo?.toLowerCase().includes(q) ?? false;
        if (!matchId && !matchTarget && !matchDesc && !matchTech) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, typeFilter, hubFilter, searchQuery]);

  // Handle open ticket details
  const handleOpenDetail = (ticket: OpsIncidentTicket) => {
    setSelectedTicket(ticket);
    setSelectedTechnician(ticket.assignedTo || TECHNICIANS[0]);
    setResolutionNote(ticket.resolutionNotes || "");
  };

  // Actions
  const handleAssign = () => {
    if (!selectedTicket) return;
    OperationsService.assignTicket(selectedTicket.ticketId, selectedTechnician);
    setSelectedTicket({
      ...selectedTicket,
      status: TicketStatus.ASSIGNED,
      assignedTo: selectedTechnician,
    });
  };

  const handleStartRepair = () => {
    if (!selectedTicket) return;
    OperationsService.startRepairTicket(selectedTicket.ticketId);
    setSelectedTicket({
      ...selectedTicket,
      status: TicketStatus.IN_PROGRESS,
    });
  };

  const handleCloseTicket = () => {
    if (!selectedTicket) return;
    const note = resolutionNote.trim() || "Đã kiểm tra, thay thế linh kiện và kiểm thử tải thành công.";
    OperationsService.closeTicket(selectedTicket.ticketId, note);
    setSelectedTicket(null);
  };

  // Handle manual incident report submission
  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportTargetId || !newReportDesc) return;

    OperationsService.handleIncident({
      ticketId: `TCK-${Date.now().toString().slice(-6)}`,
      type: newReportType,
      targetId: newReportTargetId,
      hubId: newReportHubId,
      description: newReportDesc,
      status: TicketStatus.OPEN,
    });

    setIsReportModalOpen(false);
    setNewReportTargetId("");
    setNewReportDesc("");
  };

  const candidateVehicles = useMemo(() => {
    return vehicles.filter((v) => v.currentHubId === newReportHubId);
  }, [newReportHubId, vehicles]);

  const candidatePorts = useMemo(() => {
    return ports.filter((p) => p.hubId === newReportHubId);
  }, [newReportHubId, ports]);

  // Columns definition
  const columns: Column<OpsIncidentTicket>[] = [
    {
      header: "Mã phiếu",
      cell: (t: OpsIncidentTicket) => (
        <span className="font-mono text-xs font-bold text-slate-800">
          #{t.ticketId}
        </span>
      ),
    },
    {
      header: "Loại & Thiết bị",
      cell: (t: OpsIncidentTicket) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{t.targetId}</span>
          <span className="text-xs text-slate-500">
            {t.type === TicketType.VEHICLE_FAULT ? "🚗 Xe điện" : "⚡ Cổng sạc"}
          </span>
        </div>
      ),
    },
    {
      header: "Vị trí Hub",
      cell: (t: OpsIncidentTicket) => {
        const hub = hubs.find((h) => h.hubId === t.hubId);
        return (
          <span className="text-xs font-medium text-slate-700">
            {hub?.name ?? t.hubId}
          </span>
        );
      },
    },
    {
      header: "Mô tả triệu chứng",
      cell: (t: OpsIncidentTicket) => (
        <p className="max-w-xs truncate text-xs text-slate-600" title={t.description}>
          {t.description}
        </p>
      ),
    },
    {
      header: "Kỹ thuật viên",
      cell: (t: OpsIncidentTicket) => (
        <span className="text-xs text-slate-700">
          {t.assignedTo ? (
            <span className="font-medium text-blue-700">{t.assignedTo.split("(")[0]}</span>
          ) : (
            <span className="italic text-slate-400">Chưa phân công</span>
          )}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      cell: (t: OpsIncidentTicket) => {
        let label = "Tiếp nhận";
        if (t.status === TicketStatus.OPEN) label = "Chờ xử lý (OPEN)";
        if (t.status === TicketStatus.ASSIGNED) label = "Đã phân công";
        if (t.status === TicketStatus.IN_PROGRESS) label = "Đang sửa chữa";
        if (t.status === TicketStatus.CLOSED) label = "Đã khắc phục";

        return <Badge value={t.status} label={label} />;
      },
    },
    {
      header: "Thời gian",
      cell: (t: OpsIncidentTicket) => (
        <span className="text-xs text-slate-500">
          {t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
        </span>
      ),
    },
    {
      header: "Thao tác",
      cell: (t: OpsIncidentTicket) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleOpenDetail(t)}
        >
          Chi tiết & Xử lý
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quản lý Sự cố & Phiếu sửa chữa
          </h1>
          <p className="text-sm text-slate-500">
            Theo dõi, phân công kỹ thuật viên và khôi phục thiết bị hỏng hóc tự động (UC14, NIFR-04)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => {
              if (newReportType === TicketType.VEHICLE_FAULT) {
                setNewReportTargetId(candidateVehicles[0]?.vehicleId ?? "");
              } else {
                setNewReportTargetId(candidatePorts[0]?.portId ?? "");
              }
              setIsReportModalOpen(true);
            }}
          >
            + Báo cáo sự cố mới
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-rose-500 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Sự cố chờ xử lý (OPEN)
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600">{openCount}</span>
            <span className="text-xs text-slate-500">cần phân công</span>
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-500 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Đang sửa chữa
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600">{inProgressCount}</span>
            <span className="text-xs text-slate-500">kỹ thuật đang xử lý</span>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Đã khắc phục hoàn tất
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600">{closedCount}</span>
            <span className="text-xs text-slate-500">thiết bị đã khôi phục</span>
          </div>
        </Card>

        <Card className="border-l-4 border-l-red-600 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cảnh báo Critical chưa giải tỏa
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600">{criticalCount}</span>
            <span className="text-xs text-slate-500">ảnh hưởng vận hành</span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Trạng thái phiếu
            </label>
            <select
              aria-label="Trạng thái phiếu"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value={TicketStatus.OPEN}>Chờ xử lý (OPEN)</option>
              <option value={TicketStatus.ASSIGNED}>Đã phân công (ASSIGNED)</option>
              <option value={TicketStatus.IN_PROGRESS}>Đang sửa chữa (IN_PROGRESS)</option>
              <option value={TicketStatus.CLOSED}>Đã hoàn tất (CLOSED)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Loại sự cố
            </label>
            <select
              aria-label="Loại sự cố"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Tất cả loại sự cố</option>
              <option value={TicketType.VEHICLE_FAULT}>Phương tiện (Xe)</option>
              <option value={TicketType.PORT_FAULT}>Trụ / Cổng sạc</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Vị trí Hub
            </label>
            <select
              aria-label="Vị trí Hub"
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Tất cả các Hub</option>
              {hubs.map((h) => (
                <option key={h.hubId} value={h.hubId}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Nhập mã phiếu, thiết bị, KTV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Tickets Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Danh sách phiếu sự cố kỹ thuật ({filteredTickets.length})
          </h2>
        </div>
        <Table
          columns={columns}
          rows={filteredTickets}
          rowKey={(t) => t.ticketId}
          empty="Không có phiếu sự cố nào phù hợp với bộ lọc."
        />
      </Card>

      {/* Modal: Ticket Detail & Workflow Processing */}
      {selectedTicket && (
        <Modal
          open={!!selectedTicket}
          title={`Chi tiết phiếu sự cố #${selectedTicket.ticketId}`}
          onClose={() => setSelectedTicket(null)}
          footer={
            <div className="flex w-full items-center justify-between">
              <Button variant="secondary" onClick={() => setSelectedTicket(null)}>
                Đóng
              </Button>
              <div className="flex items-center gap-2">
                {selectedTicket.status === TicketStatus.OPEN && (
                  <Button variant="primary" onClick={handleAssign}>
                    Phân công KTV
                  </Button>
                )}
                {selectedTicket.status === TicketStatus.ASSIGNED && (
                  <Button variant="primary" onClick={handleStartRepair}>
                    Bắt đầu sửa chữa
                  </Button>
                )}
                {(selectedTicket.status === TicketStatus.ASSIGNED ||
                  selectedTicket.status === TicketStatus.IN_PROGRESS) && (
                  <Button
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleCloseTicket}
                  >
                    ✓ Khắc phục xong & Đóng phiếu
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Status Flow Tracker */}
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-500 mb-2">TIẾN TRÌNH XỬ LÝ SỰ CỐ</div>
              <div className="grid grid-cols-4 text-center text-xs">
                <div
                  className={`rounded-l py-1.5 font-medium ${
                    selectedTicket.status === TicketStatus.OPEN
                      ? "bg-rose-500 text-white"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  1. Tiếp nhận
                </div>
                <div
                  className={`py-1.5 font-medium ${
                    selectedTicket.status === TicketStatus.ASSIGNED
                      ? "bg-amber-500 text-white"
                      : selectedTicket.status === TicketStatus.IN_PROGRESS ||
                        selectedTicket.status === TicketStatus.CLOSED
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  2. Phân công
                </div>
                <div
                  className={`py-1.5 font-medium ${
                    selectedTicket.status === TicketStatus.IN_PROGRESS
                      ? "bg-blue-600 text-white"
                      : selectedTicket.status === TicketStatus.CLOSED
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  3. Đang sửa
                </div>
                <div
                  className={`rounded-r py-1.5 font-medium ${
                    selectedTicket.status === TicketStatus.CLOSED
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  4. Đã khôi phục
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-slate-200 p-2.5">
                <span className="text-slate-500">Thiết bị hỏng hóc:</span>
                <div className="mt-1 font-semibold text-slate-900 text-sm">
                  {selectedTicket.targetId}
                </div>
                <div className="text-slate-500 mt-0.5">
                  {selectedTicket.type === TicketType.VEHICLE_FAULT ? "Phương tiện điện" : "Cổng sạc pin"}
                </div>
              </div>

              <div className="rounded border border-slate-200 p-2.5">
                <span className="text-slate-500">Hub phát sinh:</span>
                <div className="mt-1 font-semibold text-slate-900 text-sm">
                  {hubs.find((h) => h.hubId === selectedTicket.hubId)?.name ?? selectedTicket.hubId}
                </div>
                <div className="text-slate-500 mt-0.5">
                  Mã trạm: {selectedTicket.hubId}
                </div>
              </div>
            </div>

            {/* Fault Description */}
            <div className="rounded border border-rose-200 bg-rose-50/50 p-3 text-xs">
              <span className="font-semibold text-rose-800">Triệu chứng & Báo cáo kỹ thuật:</span>
              <p className="mt-1 text-slate-700 leading-relaxed">{selectedTicket.description}</p>
            </div>

            {/* Technician Assignment */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Kỹ thuật viên phụ trách
              </label>
              {selectedTicket.status === TicketStatus.CLOSED ? (
                <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {selectedTicket.assignedTo || "Chưa ghi nhận"}
                </div>
              ) : (
                <select
                  aria-label="Kỹ thuật viên phụ trách"
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {TECHNICIANS.map((tech) => (
                    <option key={tech} value={tech}>
                      {tech}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Resolution Note */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Ghi chú khắc phục & Biên bản xử lý
              </label>
              {selectedTicket.status === TicketStatus.CLOSED ? (
                <div className="rounded border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900">
                  <div className="font-semibold">Nội dung khắc phục:</div>
                  <p className="mt-1 text-slate-800">{selectedTicket.resolutionNotes || "Đã hoàn tất khắc phục sự cố."}</p>
                  {selectedTicket.closedAt && (
                    <div className="mt-2 text-[11px] text-emerald-700">
                      Đóng phiếu lúc: {new Date(selectedTicket.closedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  rows={3}
                  placeholder="Nhập chi tiết biện pháp khắc phục (VD: Thay cáp nguồn, thay lốp xe, cân chỉnh điện áp, reset firmware...)"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>

            {/* Resource Auto-Restore Notice */}
            <div className="rounded bg-blue-50 p-2.5 text-[11px] text-blue-800">
              💡 <strong>Lưu ý:</strong> Khi nhấn &quot;Khắc phục xong & Đóng phiếu&quot;, hệ thống sẽ tự động đưa phương tiện về trạng thái <code>AVAILABLE</code> hoặc cổng sạc về <code>FREE</code>, đồng thời tự động đóng các cảnh báo liên quan.
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Manual Incident Report */}
      {isReportModalOpen && (
        <Modal
          open={isReportModalOpen}
          title="Báo cáo sự cố kỹ thuật mới"
          onClose={() => setIsReportModalOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsReportModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button variant="primary" onClick={handleCreateReport}>
                Ghi nhận sự cố & Cô lập thiết bị
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateReport} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Loại thiết bị gặp sự cố
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewReportType(TicketType.VEHICLE_FAULT);
                    setNewReportTargetId(candidateVehicles[0]?.vehicleId ?? "");
                  }}
                  className={`rounded-lg border p-2 text-center text-xs font-medium transition ${
                    newReportType === TicketType.VEHICLE_FAULT
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  🚗 Phương tiện điện
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewReportType(TicketType.PORT_FAULT);
                    setNewReportTargetId(candidatePorts[0]?.portId ?? "");
                  }}
                  className={`rounded-lg border p-2 text-center text-xs font-medium transition ${
                    newReportType === TicketType.PORT_FAULT
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  ⚡ Trụ / Cổng sạc
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Hub phát sinh
              </label>
              <select
                aria-label="Hub phát sinh"
                value={newReportHubId}
                onChange={(e) => {
                  setNewReportHubId(e.target.value);
                  setNewReportTargetId("");
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {hubs.map((h) => (
                  <option key={h.hubId} value={h.hubId}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Chọn thiết bị cụ thể
              </label>
              <select
                aria-label="Chọn thiết bị cụ thể"
                value={newReportTargetId}
                onChange={(e) => setNewReportTargetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">-- Chọn thiết bị --</option>
                {newReportType === TicketType.VEHICLE_FAULT
                  ? candidateVehicles.map((v) => (
                      <option key={v.vehicleId} value={v.vehicleId}>
                        {v.vehicleId} ({v.type} - Pin: {v.batteryLevel}% - {v.status})
                      </option>
                    ))
                  : candidatePorts.map((p) => (
                      <option key={p.portId} value={p.portId}>
                        {p.portId} (Công suất: {p.powerKw}kW - {p.status})
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Mô tả chi tiết triệu chứng hư hỏng
              </label>
              <textarea
                rows={3}
                placeholder="VD: Không khởi động được xe, màn hình báo lỗi E04, dây sạc bị rách vỏ cách điện..."
                value={newReportDesc}
                onChange={(e) => setNewReportDesc(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
