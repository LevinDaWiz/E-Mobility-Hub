import { Link } from "react-router-dom";
import { HubCard } from "../../../components/HubCard";
import { useStore } from "../../../store";

// Tab "Hub": danh sách Hub. Bấm vào một Hub để xem xe tại Hub đó và đặt xe (UC01).
export function StudentHubsPage() {
  const hubs = useStore((s) => s.hubs);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-950">Các Hub</h1>
        <p className="text-sm text-slate-500">Chọn một Hub để xem xe đang có và đặt xe.</p>
      </div>
      {hubs.map((hub) => (
        <Link key={hub.hubId} to={`/app/hubs/${hub.hubId}`} className="block transition-opacity hover:opacity-90" aria-label={`Xem xe tại ${hub.name}`}>
          <HubCard hub={hub} />
          <p className="mt-1 text-right text-xs font-semibold text-brand-700">Xem xe tại Hub →</p>
        </Link>
      ))}
    </div>
  );
}
