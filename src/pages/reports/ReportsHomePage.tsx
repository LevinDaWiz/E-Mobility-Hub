import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card } from "../../components/ui";
import { ReportError, TOPIC_DESCRIPTIONS, TOPIC_TITLES, VEHICLE_LABELS, formatDateVi, type FilterErrors } from "../../services/reportEngine";
import {
  DETAIL_LABELS,
  FREQUENCY_LABELS,
  computeNextRun,
  defaultFilters,
  describeSchedule,
  generateReport,
  todayKey,
  validateFilters,
} from "../../services/reportService";
import { useStore } from "../../store";
import { inputClass } from "../../styles/formClasses";
import type { Report, ReportDraft, ReportFilters, ReportTopic, VehicleFilter } from "../../types";
import { Segmented } from "./charts/Segmented";

const TOPICS: { topic: ReportTopic; icon: string }[] = [
  { topic: "MOVEMENT", icon: "⇄" },
  { topic: "ENERGY", icon: "ϟ" },
  { topic: "PERFORMANCE", icon: "◔" },
  { topic: "SERVICE_QUALITY", icon: "✓" },
];

const dateInput = (hasError: boolean) =>
  `${inputClass(hasError)} bg-sky-100 ${hasError ? "" : "border-sky-200"} text-slate-800`;

type Status = { kind: "idle" } | { kind: "generating" } | { kind: "error"; message: string };

// UC17 – bước 1 và 2: chọn chuyên đề, thiết lập bộ lọc, tạo báo cáo / báo cáo định kỳ.
export function ReportsHomePage() {
  const navigate = useNavigate();
  const hubs = useStore((s) => s.hubs);
  const reports = useStore((s) => s.reports);
  const schedules = useStore((s) => s.scheduledReports);
  const draft = useStore((s) => s.draft);
  const setDraft = useStore((s) => s.setDraft);
  const setActiveReport = useStore((s) => s.setActiveReport);

  const current: ReportDraft = draft ?? { topic: "SERVICE_QUALITY", filters: defaultFilters() };
  const { topic, filters } = current;

  const [errors, setErrors] = useState<FilterErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [tab, setTab] = useState<"all" | "scheduled">("all");

  const update = (next: Partial<ReportDraft>) => setDraft({ ...current, ...next });
  const setFilters = (patch: Partial<ReportFilters>) => update({ filters: { ...filters, ...patch } });

  const run = async () => {
    const found = validateFilters(filters, todayKey());
    setErrors(found);
    if (found.from || found.to) return;

    setStatus({ kind: "generating" });
    try {
      await generateReport(topic, filters);
      setStatus({ kind: "idle" });
      navigate("/admin/reports/result");
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof ReportError ? error.message : "Lỗi kết nối hoặc dữ liệu không đủ." });
    }
  };

  const open = (report: Report) => {
    setActiveReport(report);
    navigate("/admin/reports/result");
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Quản trị vận hành</p>
        <h1 className="text-3xl font-bold text-brand-950">Báo cáo &amp; Thống kê</h1>
        <p className="text-sm text-brand-700">Chọn chuyên đề, thiết lập bộ lọc rồi tạo báo cáo để xem KPI, biểu đồ và bảng dữ liệu.</p>
      </div>

      <section aria-labelledby="step1">
        <h2 id="step1" className="mb-3 flex items-center gap-2 text-2xl font-bold text-brand-950">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white">1</span>
          Chuyên đề báo cáo
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Chuyên đề báo cáo">
          {TOPICS.map(({ topic: t, icon }) => {
            const selected = t === topic;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ topic: t })}
                className={`rounded-lg p-4 text-left transition-colors ${selected ? "bg-blue-400 ring-2 ring-slate-900" : "bg-indigo-100 hover:bg-indigo-200"}`}
              >
                <span className="mb-3 flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-base font-bold text-white">{icon}</span>
                  <span className={`h-9 w-9 rounded-full border-2 ${selected ? "border-white bg-slate-900 ring-2 ring-slate-900" : "border-slate-900 bg-white"}`} />
                </span>
                <span className="block text-base font-bold text-slate-900">{TOPIC_TITLES[t]}</span>
                <span className={`mt-1 block text-sm ${selected ? "text-slate-900" : "text-slate-600"}`}>{TOPIC_DESCRIPTIONS[t]}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="step2">
        <h2 id="step2" className="mb-3 flex items-center gap-2 text-2xl font-bold text-brand-950">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white">2</span>
          Bộ lọc
        </h2>
        <Card>
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <p className="mb-2 text-sm font-bold text-slate-800">Khoảng thời gian</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="date"
                    aria-label="Từ ngày"
                    className={dateInput(!!errors.from)}
                    value={filters.from}
                    max={todayKey()}
                    onChange={(e) => setFilters({ from: e.target.value })}
                  />
                  {errors.from && <p className="mt-1 text-xs text-red-700" role="alert">{errors.from}</p>}
                </div>
                <div>
                  <input
                    type="date"
                    aria-label="Đến ngày"
                    className={dateInput(!!errors.to)}
                    value={filters.to}
                    max={todayKey()}
                    onChange={(e) => setFilters({ to: e.target.value })}
                  />
                  {errors.to && <p className="mt-1 text-xs text-red-700" role="alert">{errors.to}</p>}
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="rpHub" className="mb-2 block text-sm font-bold text-slate-800">
                Khu vực / Hub
              </label>
              <select id="rpHub" className={dateInput(false)} value={filters.hubId} onChange={(e) => setFilters({ hubId: e.target.value })}>
                <option value="ALL">All Hubs</option>
                {hubs.map((h) => (
                  <option key={h.hubId} value={h.hubId}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="rpVehicle" className="mb-2 block text-sm font-bold text-slate-800">
                Loại phương tiện
              </label>
              <select
                id="rpVehicle"
                className={dateInput(false)}
                value={filters.vehicle}
                onChange={(e) => setFilters({ vehicle: e.target.value as VehicleFilter })}
              >
                <option value="ALL">All (E-bike / E-motorbike)</option>
                <option value="E_BIKE">{VEHICLE_LABELS.E_BIKE}</option>
                <option value="E_MOTORBIKE">{VEHICLE_LABELS.E_MOTORBIKE}</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="secondary"
              className="bg-sky-200 ring-0"
              onClick={() => {
                setDraft({ topic, filters: defaultFilters() });
                setErrors({});
                setStatus({ kind: "idle" });
              }}
            >
              Đặt lại
            </Button>
            <div className="flex flex-col items-start gap-1">
              <span className="rounded-full bg-brand-100 px-3 py-0.5 text-[11px] text-slate-700">Áp dụng cho: {TOPIC_TITLES[topic]}</span>
              <div className="flex gap-3">
                <Button onClick={() => void run()} disabled={status.kind === "generating"} className="bg-brand-700 px-6">
                  Tạo báo cáo
                </Button>
                <Button onClick={() => navigate("/admin/reports/export")} className="bg-brand-700 px-6">
                  Báo cáo định kỳ
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section aria-label="Kết quả">
        {status.kind === "generating" && (
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-stone-50 px-6 py-8" role="status">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
            <div>
              <p className="font-bold text-slate-900">Đang tạo báo cáo...</p>
              <p className="text-sm text-slate-500">Vui lòng chờ trong giây lát</p>
            </div>
          </div>
        )}

        {status.kind === "error" && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-5" role="alert">
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-700 text-xl text-white">✕</span>
              <div>
                <p className="text-lg font-bold text-red-700">Không thể tạo báo cáo. Vui lòng thử lại.</p>
                <p className="text-sm text-slate-700">{status.message}</p>
              </div>
            </div>
            <Button variant="danger" onClick={() => void run()}>
              Thử lại
            </Button>
          </div>
        )}

        {status.kind === "idle" && (
          <Card
            title="Báo cáo đã tạo"
            actions={
              <Segmented
                label="Loại báo cáo"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "all", label: "Tất cả" },
                  { value: "scheduled", label: "Định kỳ" },
                ]}
              />
            }
          >
            {tab === "all" && reports.length === 0 && <EmptyState />}
            {tab === "all" && reports.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <li key={r.reportId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        {TOPIC_TITLES[r.data.topic]}
                        {r.scheduleId && <Badge value="SCHEDULED" label="Định kỳ" />}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateVi(r.periodFrom)} – {formatDateVi(r.periodTo)} · {r.data.hubLabel} · {r.data.vehicleLabel} · tạo lúc {new Date(r.createdAt).toLocaleTimeString("vi-VN")}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => open(r)}>
                      Xem
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {tab === "scheduled" && schedules.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500">
                Chưa có báo cáo định kỳ nào.{" "}
                <button type="button" className="font-semibold text-brand-700" onClick={() => navigate("/admin/reports/export")}>
                  Tạo báo cáo định kỳ →
                </button>
              </div>
            )}
            {tab === "scheduled" && schedules.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {schedules.map((s) => (
                  <li key={s.scheduleId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{describeSchedule(s)}</p>
                      <p className="text-xs text-slate-500">
                        {FREQUENCY_LABELS[s.frequency]} lúc {String(s.hour).padStart(2, "0")}:{String(s.minute).padStart(2, "0")} · {DETAIL_LABELS[s.detail]} ·{" "}
                        {s.format} · {s.emails.length} email · chạy tiếp: {new Date(computeNextRun(s)).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => navigate("/admin/reports/export")}>
                      Quản lý
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-700">▮▮▮</span>
      <p className="font-bold text-slate-900">Chưa có báo cáo nào được tạo</p>
      <p className="mt-1 text-xs text-slate-500">Chọn chuyên đề và bộ lọc ở trên, sau đó nhấn Tạo báo cáo để xem KPI, biểu đồ và bảng dữ liệu.</p>
    </div>
  );
}
