import type { ReportData } from "../../types";
import { formatDateVi, TOPIC_TITLES } from "../../services/reportEngine";

// "Bộ lọc đang áp dụng": chuyên đề, khoảng thời gian, Hub, phương tiện.
export function FilterChips({ data }: { data: ReportData }) {
  const chips = [
    `Chuyên đề: ${TOPIC_TITLES[data.topic]}`,
    `${formatDateVi(data.filters.from)} – ${formatDateVi(data.filters.to)}`,
    `Hub: ${data.hubLabel}`,
    `Phương tiện: ${data.vehicleLabel}`,
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-bold text-slate-800">Bộ lọc đang áp dụng</span>
      {chips.map((c) => (
        <span key={c} className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">
          {c}
        </span>
      ))}
    </div>
  );
}
