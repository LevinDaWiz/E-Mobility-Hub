import { useParams } from "react-router-dom";
import { Badge, Card, Table, type Column } from "../../../components/ui";
import { useStore } from "../../../store";
import { TripStatus, type Trip } from "../../../types";
import { formatDateTime } from "../../../utils/format";

// Tab "Lịch sử chuyến": các chuyến đi đã dùng xe này (mới nhất trước).
export function VehicleTripsTab() {
  const { vehicleId = "" } = useParams();
  const allTrips = useStore((s) => s.trips);
  const trips = allTrips
    .filter((t) => t.vehicleId === vehicleId)
    .sort((a, b) => b.startTime.localeCompare(a.startTime));

  const columns: Column<Trip>[] = [
    { header: "Mã chuyến", cell: (t) => <span className="font-mono text-xs">{t.tripId}</span> },
    { header: "Sinh viên", cell: (t) => t.studentId },
    { header: "Bắt đầu", cell: (t) => formatDateTime(t.startTime) },
    { header: "Kết thúc", cell: (t) => (t.endTime ? formatDateTime(t.endTime) : "—") },
    {
      header: "Trạng thái",
      cell: (t) => (
        <Badge value={t.status === TripStatus.ONGOING ? "WARNING" : "INFO"} label={t.status === TripStatus.ONGOING ? "Đang đi" : "Hoàn tất"} />
      ),
    },
  ];

  return (
    <Card title={`Lịch sử chuyến (${trips.length})`}>
      <Table columns={columns} rows={trips} rowKey={(t) => t.tripId} empty="Xe chưa có chuyến đi nào." />
    </Card>
  );
}
