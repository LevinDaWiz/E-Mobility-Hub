import { useParams } from "react-router-dom";
import { Badge, Card, Table, type Column } from "../../../components/ui";
import { useStore } from "../../../store";
import { TicketStatus, TicketType, type IncidentTicket } from "../../../types";

const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "Mới mở",
  [TicketStatus.ASSIGNED]: "Đã phân công",
  [TicketStatus.IN_PROGRESS]: "Đang xử lý",
  [TicketStatus.CLOSED]: "Đã đóng",
};

// Tab "Sự cố": các ticket liên quan tới xe này.
export function VehicleIncidentsTab() {
  const { vehicleId = "" } = useParams();
  const allTickets = useStore((s) => s.tickets);
  const tickets = allTickets.filter((t) => t.targetId === vehicleId && t.type === TicketType.VEHICLE_FAULT);

  const columns: Column<IncidentTicket>[] = [
    { header: "Mã ticket", cell: (t) => <span className="font-mono text-xs">{t.ticketId}</span> },
    { header: "Mô tả", cell: (t) => t.description },
    {
      header: "Trạng thái",
      cell: (t) => (
        <Badge value={t.status === TicketStatus.CLOSED ? "INFO" : "WARNING"} label={STATUS_LABELS[t.status]} />
      ),
    },
  ];

  return (
    <Card title={`Sự cố của xe (${tickets.length})`}>
      <Table columns={columns} rows={tickets} rowKey={(t) => t.ticketId} empty="Xe chưa có sự cố nào." />
    </Card>
  );
}
