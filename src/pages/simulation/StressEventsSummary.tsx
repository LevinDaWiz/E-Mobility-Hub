import { Card, Table, type Column } from "../../components/ui";
import { useStore } from "../../store";
import { KIND_LABELS, displayCode, type StressEvent } from "./stressTypes";

// Dòng thời gian biến cố của một phiên Stress-Test, chỉ đọc (hiện ở tab Kết quả).
export function StressEventsSummary({ events }: { events: StressEvent[] }) {
  const hubs = useStore((s) => s.hubs);
  const hubName = (id: string) => hubs.find((h) => h.hubId === id)?.name ?? id;
  const sorted = [...events].sort((a, b) => a.timeMin - b.timeMin);

  const columns: Column<StressEvent>[] = [
    { header: "Thời điểm", cell: (e) => `Phút ${e.timeMin}` },
    { header: "Loại biến cố", cell: (e) => KIND_LABELS[e.kind] },
    {
      header: "Hub/Tài nguyên",
      cell: (e) =>
        e.kind === "DEMAND_SURGE"
          ? hubName(e.hubId)
          : `${hubName(e.hubId)}: ${e.resourceIds.map((id) => displayCode(e.kind, id, e.hubId)).join(", ")}`,
    },
    {
      header: "Tham số",
      cell: (e) =>
        e.kind === "DEMAND_SURGE" ? `×${e.multiplier}` : `${e.resourceIds.length} ${e.kind === "PORT_FAULT" ? "cổng" : "xe"}`,
    },
  ];

  return (
    <Card title={`Dòng thời gian biến cố đã mô phỏng (${events.length})`}>
      <Table columns={columns} rows={sorted} rowKey={(e) => e.id} />
    </Card>
  );
}
