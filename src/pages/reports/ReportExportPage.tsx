import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Modal } from "../../components/ui";
import { TOPIC_TITLES, ReportError } from "../../services/reportEngine";
import {
  DETAIL_LABELS,
  FORMAT_LABELS,
  FREQUENCY_LABELS,
  computeNextRun,
  defaultFilters,
  deleteSchedule,
  describeSchedule,
  exportReport,
  isValidEmail,
  saveSchedule,
  todayKey,
  type ExportFile,
  type ScheduleErrors,
  type ScheduleInput,
} from "../../services/reportService";
import { useStore } from "../../store";
import { inputClass } from "../../styles/formClasses";
import type { ExportFormat, ReportDetail, ReportFrequency, ScheduledReport } from "../../types";
import { downloadBytes } from "../../utils/fileExport";
import { FilterChips } from "./FilterChips";

interface FormState {
  format: ExportFormat;
  frequency: ReportFrequency;
  hour: string;
  minute: string;
  startDate: string;
  detail: ReportDetail;
  emails: string[];
}

const emptyForm = (): FormState => ({ format: "XLSX", frequency: "DAILY", hour: "06", minute: "00", startDate: todayKey(), detail: "MONTH", emails: [] });

const toForm = (s: ScheduledReport): FormState => ({
  format: s.format,
  frequency: s.frequency,
  hour: String(s.hour).padStart(2, "0"),
  minute: String(s.minute).padStart(2, "0"),
  startDate: s.startDate,
  detail: s.detail,
  emails: s.emails,
});

type ExportJob = { format: ExportFormat; attempt: number } | null;
interface ExportResult {
  key: string;
  file?: ExportFile;
  error?: string;
}

// UC17 – xuất báo cáo: xuất ngay (3 trạng thái) và quản lý báo cáo định kỳ.
export function ReportExportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const report = useStore((s) => s.activeReport);
  const draft = useStore((s) => s.draft);
  const schedules = useStore((s) => s.scheduledReports);
  const hubs = useStore((s) => s.hubs);

  // ----- xuất ngay -----
  const [job, setJob] = useState<ExportJob>(() => {
    const format = (location.state as { autoExport?: ExportFormat } | null)?.autoExport;
    return format ? { format, attempt: 0 } : null;
  });
  const [result, setResult] = useState<ExportResult | null>(null);
  const jobKey = job ? `${job.format}-${job.attempt}` : "";

  useEffect(() => {
    if (!job || !report) return;
    let cancelled = false;
    const key = `${job.format}-${job.attempt}`;
    exportReport(report.data, job.format).then(
      (file) => !cancelled && setResult({ key, file }),
      (error: unknown) => !cancelled && setResult({ key, error: error instanceof ReportError ? error.message : "Lỗi kết nối hoặc dữ liệu không đủ." }),
    );
    return () => {
      cancelled = true;
    };
  }, [job, report]);

  // Không có báo cáo đang xem (ví dụ tải lại trang) thì không có gì để xuất.
  const exportState = !job || !report ? "idle" : result?.key !== jobKey ? "generating" : result.file ? "success" : "error";

  // ----- báo cáo định kỳ -----
  const topic = report?.data.topic ?? draft?.topic ?? "SERVICE_QUALITY";
  const scope = report?.data.filters ?? draft?.filters ?? defaultFilters();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [errors, setErrors] = useState<ScheduleErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ScheduledReport | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const hubName = scope.hubId === "ALL" ? "All Hubs" : (hubs.find((h) => h.hubId === scope.hubId)?.name ?? scope.hubId);

  const addEmail = () => {
    const email = emailInput.trim();
    if (email === "") return;
    if (!isValidEmail(email)) return setEmailError("Email không hợp lệ.");
    if (form.emails.includes(email)) return setEmailError("Email đã có trong danh sách.");
    set("emails", [...form.emails, email]);
    setEmailInput("");
    setEmailError("");
  };

  const confirm = () => {
    const input: ScheduleInput = {
      topic,
      hubId: scope.hubId,
      vehicle: scope.vehicle,
      format: form.format,
      frequency: form.frequency,
      hour: Number(form.hour),
      minute: Number(form.minute),
      startDate: form.startDate,
      detail: form.detail,
      emails: form.emails,
    };
    const saved = saveSchedule(input, editingId ?? undefined);
    if (saved.ok) {
      setErrors({});
      setEditingId(null);
      setForm(emptyForm());
    } else {
      setErrors(saved.errors);
    }
  };

  const startEdit = (s: ScheduledReport) => {
    setEditingId(s.scheduleId);
    setForm(toForm(s));
    setErrors({});
  };

  const back = report ? "/admin/reports/result" : "/admin/reports";
  const chips = report?.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-slate-500">
            <Link to="/admin/reports" className="hover:underline">
              Báo cáo &amp; Thống kê
            </Link>{" "}
            / {report ? "Kết quả" : "Báo cáo định kỳ"}
          </p>
          <h1 className="text-3xl font-bold text-brand-950">Xuất báo cáo</h1>
          {chips && (
            <div className="mt-2">
              <FilterChips data={chips} />
            </div>
          )}
        </div>
        <Button className="bg-blue-400 px-8 text-slate-900" onClick={() => navigate(back)}>
          ← Quay lại
        </Button>
      </div>

      <Card title={editingId ? "Chỉnh sửa báo cáo định kỳ" : "Báo cáo định kỳ"}>
        <div className="grid gap-4 lg:grid-cols-[10rem_1fr]">
          <div>
            <label htmlFor="schFormat" className="mb-1 block text-sm font-bold text-slate-800">
              Định dạng xuất
            </label>
            <select id="schFormat" className={inputClass()} value={form.format} onChange={(e) => set("format", e.target.value as ExportFormat)}>
              {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABELS[f]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="schFreq" className="mb-1 block text-sm font-bold text-slate-800">
                Tần suất
              </label>
              <select id="schFreq" className={inputClass()} value={form.frequency} onChange={(e) => set("frequency", e.target.value as ReportFrequency)}>
                {(Object.keys(FREQUENCY_LABELS) as ReportFrequency[]).map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1 block text-sm font-bold text-slate-800">Giờ chạy</span>
              <div className="flex items-center gap-1.5">
                <input aria-label="Giờ" className={`${inputClass(!!errors.time)} w-16 text-center`} inputMode="numeric" maxLength={2} value={form.hour} onChange={(e) => set("hour", e.target.value)} />
                <span className="text-sm">h</span>
                <input aria-label="Phút" className={`${inputClass(!!errors.time)} w-16 text-center`} inputMode="numeric" maxLength={2} value={form.minute} onChange={(e) => set("minute", e.target.value)} />
                <span className="text-sm">m</span>
              </div>
              {errors.time && <p className="mt-1 text-xs text-red-700" role="alert">{errors.time}</p>}
            </div>
            <div>
              <label htmlFor="schStart" className="mb-1 block text-sm font-bold text-slate-800">
                Kể từ ngày
              </label>
              <input id="schStart" type="date" className={inputClass(!!errors.startDate)} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              {errors.startDate && <p className="mt-1 text-xs text-red-700" role="alert">{errors.startDate}</p>}
            </div>
            <div>
              <label htmlFor="schDetail" className="mb-1 block text-sm font-bold text-slate-800">
                Chi tiết
              </label>
              <select id="schDetail" className={inputClass()} value={form.detail} onChange={(e) => set("detail", e.target.value as ReportDetail)}>
                {(Object.keys(DETAIL_LABELS) as ReportDetail[]).map((d) => (
                  <option key={d} value={d}>
                    {DETAIL_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="schEmail" className="mb-1 block text-sm font-bold text-slate-800">
            Email nhận
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {form.emails.map((email) => (
              <span key={email} className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                {email}
                <button type="button" aria-label={`Xóa ${email}`} className="text-slate-400 hover:text-red-700" onClick={() => set("emails", form.emails.filter((e) => e !== email))}>
                  ✕
                </button>
              </span>
            ))}
            <input
              id="schEmail"
              className={`${inputClass(!!emailError || !!errors.emails)} w-56`}
              placeholder="email@vi-du.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEmail()}
            />
            <Button variant="secondary" aria-label="Thêm email" className="px-3 text-lg" onClick={addEmail}>
              +
            </Button>
          </div>
          {(emailError || errors.emails) && <p className="mt-1 text-xs text-red-700" role="alert">{emailError || errors.emails}</p>}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="text-sm text-slate-600">
            <p>
              {TOPIC_TITLES[topic]} <span className="mx-1 text-slate-300">|</span> {hubName}
            </p>
            <p className="text-xs text-slate-500">
              Hỗ trợ: PDF, Excel (.xlsx), CSV. Báo cáo gồm chỉ số chính, bảng tổng hợp, heatmap và dữ liệu theo ngày của khoảng thời gian đã chọn (PDF là bản văn bản, không có biểu đồ). Gửi email là giả lập.
            </p>
          </div>
          <div className="flex gap-2">
            {editingId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm());
                  setErrors({});
                }}
              >
                Hủy chỉnh sửa
              </Button>
            )}
            <Button className="bg-brand-950 px-8" onClick={confirm}>
              Xác nhận
            </Button>
          </div>
        </div>
      </Card>

      {schedules.map((s) => (
        <section key={s.scheduleId} className="rounded-xl border border-slate-200 bg-stone-50 px-5 py-4">
          <p className="text-lg font-semibold text-slate-900">{describeSchedule(s)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span>
              <b>Tần suất</b> {FREQUENCY_LABELS[s.frequency]}
            </span>
            <span>
              <b>Giờ</b> {String(s.hour).padStart(2, "0")}h {String(s.minute).padStart(2, "0")}m
            </span>
            <span>
              <b>Kể từ ngày</b> {s.startDate.split("-").reverse().join("/")}
            </span>
            <span>
              <b>Chi tiết</b> {DETAIL_LABELS[s.detail]}
            </span>
            <span>
              <b>Định dạng</b> {FORMAT_LABELS[s.format]}
            </span>
            <label className="flex items-center gap-2">
              <b>Email nhận</b>
              <select className={`${inputClass()} w-52`} aria-label="Danh sách email nhận" defaultValue="">
                <option value="">{s.emails.length} email</option>
                {s.emails.map((e) => (
                  <option key={e} value={e} disabled>
                    {e}
                  </option>
                ))}
              </select>
            </label>
            <span className="ml-auto flex gap-2">
              <Button variant="danger" onClick={() => setDeleting(s)}>
                Xóa ⚠
              </Button>
              <Button className="bg-brand-950" onClick={() => startEdit(s)}>
                Chỉnh sửa
              </Button>
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Lần chạy tiếp theo: {new Date(computeNextRun(s)).toLocaleString("vi-VN")}</p>
        </section>
      ))}
      {schedules.length === 0 && <p className="px-1 text-sm text-slate-500">Chưa có báo cáo định kỳ nào. Điền biểu mẫu ở trên rồi bấm Xác nhận để tạo.</p>}
      <p className="px-1 text-xs text-slate-400">Nếu chọn xuất báo cáo định kỳ</p>

      {exportState === "generating" && (
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-stone-50 px-6 py-6" role="status">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
          <div>
            <p className="font-bold text-slate-900">Đang tạo báo cáo...</p>
            <p className="text-sm text-slate-500">Vui lòng chờ trong giây lát</p>
          </div>
        </div>
      )}
      {exportState === "success" && result?.file && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-5" role="status">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-xl text-white">✓</span>
            <div>
              <p className="text-lg font-bold text-emerald-800">Báo cáo đã được tạo thành công.</p>
              <p className="text-sm text-slate-700">File: {result.file.fileName}</p>
            </div>
          </div>
          <Button className="bg-emerald-700 px-8 hover:bg-emerald-800" onClick={() => result.file && downloadBytes(result.file.fileName, result.file.mime, result.file.bytes)}>
            Tải xuống
          </Button>
        </div>
      )}
      {exportState === "error" && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-5" role="alert">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-700 text-xl text-white">✕</span>
            <div>
              <p className="text-lg font-bold text-red-700">Không thể tạo báo cáo. Vui lòng thử lại.</p>
              <p className="text-sm text-slate-700">{result?.error}</p>
            </div>
          </div>
          <Button variant="danger" onClick={() => job && setJob({ ...job, attempt: job.attempt + 1 })}>
            Thử lại
          </Button>
        </div>
      )}

      <Modal
        open={deleting !== null}
        title="Xóa báo cáo định kỳ?"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleting) deleteSchedule(deleting.scheduleId);
                setDeleting(null);
              }}
            >
              Xóa
            </Button>
          </>
        }
      >
        <p>
          Báo cáo <b>{deleting ? describeSchedule(deleting) : ""}</b> sẽ không còn được tạo và gửi tự động. Các báo cáo đã tạo trước đó vẫn được giữ lại.
        </p>
      </Modal>
    </div>
  );
}
