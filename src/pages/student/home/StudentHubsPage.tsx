import { HubCard } from "../../../components/HubCard";
import { useStore } from "../../../store";

// Tab "Hub": danh sách Hub. M2 (UC01) và M3 (UC07) bổ sung bộ lọc, nút "Đặt xe" / "Đặt chỗ đỗ".
export function StudentHubsPage() {
  const hubs = useStore((s) => s.hubs);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-950">Các Hub</h1>
      {hubs.map((hub) => (
        <HubCard key={hub.hubId} hub={hub} />
      ))}
    </div>
  );
}
