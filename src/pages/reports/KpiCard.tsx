import type { ReportKpi } from "../../types";

// Thẻ chỉ số bên trái trang kết quả: số lớn, ghi chú, thanh tiến độ cho các tỷ lệ.
export function KpiCard({ kpi }: { kpi: ReportKpi }) {
  const long = kpi.value.length > 11;
  return (
    <div className="rounded-xl border border-slate-200 bg-stone-50 px-4 py-3">
      <p className="text-xs text-slate-600">{kpi.label}</p>
      <p className={`mt-1 font-bold leading-tight text-slate-900 ${long ? "text-lg" : "text-3xl"}`}>{kpi.value}</p>
      {kpi.progress !== undefined && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-300" role="progressbar" aria-valuenow={Math.round(kpi.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-brand-700" style={{ width: `${Math.min(100, Math.max(0, kpi.progress * 100))}%` }} />
        </div>
      )}
      {kpi.sub && <p className="mt-1 text-[11px] text-slate-500">{kpi.sub}</p>}
    </div>
  );
}
