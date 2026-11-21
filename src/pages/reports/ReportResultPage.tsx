import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui";
import { formatDateVi } from "../../services/reportEngine";
import { useStore } from "../../store";
import { inputClass } from "../../styles/formClasses";
import type { ExportFormat } from "../../types";
import { DailyChart } from "./charts/DailyChart";
import { Heatmap } from "./charts/Heatmap";
import { HubBars } from "./charts/HubBars";
import { FilterChips } from "./FilterChips";
import { KpiCard } from "./KpiCard";
import { SummaryTable } from "./SummaryTable";

// UC17 – kết quả báo cáo: KPI, biểu đồ theo ngày / giờ, nhu cầu theo Hub, heatmap, bảng tổng hợp, xuất file.
export function ReportResultPage() {
  const navigate = useNavigate();
  const report = useStore((s) => s.activeReport);
  const [format, setFormat] = useState<ExportFormat>("PDF");

  if (!report) return <Navigate to="/admin/reports" replace />;
  const data = report.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-slate-500">
            <Link to="/admin/reports" className="hover:underline">
              Báo cáo &amp; Thống kê
            </Link>{" "}
            / Kết quả
          </p>
          <h1 className="text-3xl font-bold text-brand-950">{data.title}</h1>
          <div className="mt-2">
            <FilterChips data={data} />
          </div>
        </div>
        <Button className="bg-blue-400 px-8 text-slate-900" onClick={() => navigate("/admin/reports")}>
          ← Quay lại
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[11rem_minmax(0,1fr)_minmax(0,0.62fr)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {data.kpis.map((k) => (
            <KpiCard key={k.label} kpi={k} />
          ))}
        </div>
        <DailyChart
          title={data.series.title}
          subtitle={data.series.subtitle}
          lineLabel={data.series.lineLabel}
          unit={data.series.unit}
          byDay={data.series.byDay}
          byHour={data.series.byHour}
        />
        <HubBars {...data.hubBars} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Heatmap heatmap={data.heatmap} />
        <SummaryTable table={data.table} />
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-stone-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-white">↓</span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Xuất báo cáo</h2>
            <p className="text-sm text-slate-600">
              File được tạo theo bộ lọc đang áp dụng: {data.title} · {formatDateVi(data.filters.from)} – {formatDateVi(data.filters.to)} · {data.hubLabel}.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="exportFormat" className="text-sm font-semibold text-slate-600">
            Export format:
          </label>
          <select
            id="exportFormat"
            className={`${inputClass()} w-28 bg-indigo-100`}
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
          >
            <option value="PDF">PDF</option>
            <option value="XLSX">XLSX</option>
            <option value="CSV">CSV</option>
          </select>
          <Button className="bg-brand-950 px-8" onClick={() => navigate("/admin/reports/export", { state: { autoExport: format } })}>
            Xuất dữ liệu
          </Button>
        </div>
      </section>
    </div>
  );
}
