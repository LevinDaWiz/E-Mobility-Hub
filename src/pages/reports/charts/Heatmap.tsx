import type { ReportData } from "../../../types";

const LEVEL_CLASSES = [
  "bg-brand-200 text-slate-800",
  "bg-[#6ba0f2] text-slate-900",
  "bg-brand-700 text-white",
  "bg-brand-950 text-white",
] as const;
const LEGEND = [
  { label: "Low", dot: "bg-brand-200" },
  { label: "Medium", dot: "bg-[#6ba0f2]" },
  { label: "High", dot: "bg-brand-700" },
  { label: "Very High", dot: "bg-brand-950" },
];

// Heatmap Hub × khung giờ (hoặc ma trận O–D): ô tô màu theo 4 mức.
export function Heatmap({ heatmap }: { heatmap: ReportData["heatmap"] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-stone-50 p-4">
      <h2 className="text-xl font-bold text-brand-950">{heatmap.title}</h2>
      <p className="mb-3 text-xs text-slate-500">{heatmap.subtitle}</p>
      <div className="overflow-x-auto">
        <div className="grid min-w-[420px] gap-1.5" style={{ gridTemplateColumns: `4.5rem repeat(${heatmap.columns.length}, minmax(0, 1fr))` }}>
          <div />
          {heatmap.columns.map((c) => (
            <div key={c} className="truncate rounded bg-slate-900 px-1 py-2 text-center text-xs font-bold text-white" title={c}>
              {c}
            </div>
          ))}
          {heatmap.rows.map((row) => (
            <div key={row.label} className="contents">
              <div className="flex items-center justify-center rounded bg-slate-200 px-1 text-[11px] font-bold text-slate-700">{row.label}</div>
              {row.cells.map((cell, i) => (
                <div
                  key={`${row.label}-${heatmap.columns[i]}`}
                  className={`flex items-center justify-center rounded px-1 py-3.5 text-[11px] ${LEVEL_CLASSES[cell.level]}`}
                >
                  {cell.text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-full ${l.dot}`} /> {l.label}
          </span>
        ))}
      </div>
    </section>
  );
}
