import { REPORT_GENERATE_DELAY_MS } from "../config/constants";
import { useStore } from "../store";
import type { ExportFormat, Report, ReportData, ReportDetail, ReportFilters, ReportTopic, ScheduledReport } from "../types";
import { makeId } from "../utils/id";
import { buildCsv, buildPdf, buildXlsx, reportToSheets } from "../utils/fileExport";
import { loadPdfFonts } from "../utils/pdfFontLoader";
import { notify } from "./notificationService";
import { buildLiveFacts } from "./reportLiveData";
import { getSettings } from "./settingsService";
import {
  addDays,
  buildReport,
  dateKey,
  formatDateVi,
  parseDateKey,
  ReportError,
  TOPIC_FILE_NAMES,
  TOPIC_TITLES,
  validateFilters as validateFiltersRaw,
  type FilterErrors,
  type HubInfo,
} from "./reportEngine";

// ===== M1 sở hữu (UC17): tạo báo cáo, xuất file, báo cáo định kỳ =====

const state = () => useStore.getState();
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const todayKey = (): string => dateKey(new Date(state().clock.now));

export function defaultFilters(): ReportFilters {
  const today = todayKey();
  return { from: addDays(today, -29), to: today, hubId: "ALL", vehicle: "ALL" };
}

export function hubInfos(): HubInfo[] {
  return state().hubs.map((h) => ({
    hubId: h.hubId,
    name: h.name,
    area: h.area,
    type: h.type,
    parkingCapacity: h.parkingCapacity,
  }));
}

// Khoảng thời gian tối đa lấy từ Cài đặt (Cài đặt > Báo cáo).
export const validateFilters = (filters: ReportFilters, today: string): FilterErrors =>
  validateFiltersRaw(filters, today, getSettings().reportMaxRangeDays);
export type { FilterErrors };

// ---------- tạo báo cáo ----------

// Tạo báo cáo (có độ trễ "Đang tạo báo cáo..."). Ném ReportError nếu lỗi; thành công thì lưu vào lịch sử và đặt làm báo cáo đang xem.
export async function generateReport(topic: ReportTopic, filters: ReportFilters): Promise<Report> {
  const errors = validateFilters(filters, todayKey());
  if (errors.from || errors.to) throw new ReportError("FAILED", errors.from ?? errors.to ?? "Bộ lọc không hợp lệ.");

  await wait(REPORT_GENERATE_DELAY_MS);
  if (state().reportFailureMode) throw new ReportError("FAILED", "Lỗi kết nối hoặc dữ liệu không đủ.");

  const now = new Date(state().clock.now).toISOString();
  const today = todayKey();
  // Ngày hôm nay dùng số liệu thật từ hệ thống; các ngày trước là dữ liệu mẫu (xem reportLiveData.ts).
  const live = buildLiveFacts(today, filters.vehicle);
  const data = buildReport({ topic, filters, hubs: hubInfos(), today, generatedAt: now, live });
  const report: Report = {
    reportId: makeId("RP"),
    type: topic,
    periodFrom: filters.from,
    periodTo: filters.to,
    data,
    createdAt: now,
  };
  state().addReport(report);
  state().setActiveReport(report);
  return report;
}

// ---------- xuất file ----------

export interface ExportFile {
  fileName: string;
  mime: string;
  bytes: Uint8Array;
}

const FORMAT_INFO: Record<ExportFormat, { ext: string; mime: string }> = {
  PDF: { ext: "pdf", mime: "application/pdf" },
  XLSX: { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  CSV: { ext: "csv", mime: "text/csv;charset=utf-8" },
};

export const FORMAT_LABELS: Record<ExportFormat, string> = { PDF: "PDF", XLSX: "XLSX", CSV: "CSV" };

// BaoCao_ChatLuongDichVu_092026.pdf (tháng / năm của ngày kết thúc).
export function exportFileName(data: ReportData, format: ExportFormat): string {
  const { to } = data.filters;
  return `BaoCao_${TOPIC_FILE_NAMES[data.topic]}_${to.slice(5, 7)}${to.slice(0, 4)}.${FORMAT_INFO[format].ext}`;
}

export function buildExportFile(data: ReportData, format: ExportFormat): ExportFile {
  const bytes = format === "PDF" ? buildPdf(data) : format === "XLSX" ? buildXlsx(reportToSheets(data)) : buildCsv(reportToSheets(data));
  return { fileName: exportFileName(data, format), mime: FORMAT_INFO[format].mime, bytes };
}

// Xuất file (có độ trễ để hiện "Đang tạo báo cáo..."). Ném ReportError khi lỗi.
export async function exportReport(data: ReportData, format: ExportFormat): Promise<ExportFile> {
  await wait(REPORT_GENERATE_DELAY_MS * 0.75);
  if (state().reportFailureMode) throw new ReportError("FAILED", "Lỗi kết nối hoặc dữ liệu không đủ.");
  if (data.kpis.length === 0) throw new ReportError("FAILED", "Báo cáo không có dữ liệu.");
  // PDF cần font nhúng để có dấu tiếng Việt; nếu tải font lỗi thì vẫn xuất được bản không dấu.
  if (format === "PDF") await loadPdfFonts();
  return buildExportFile(data, format);
}

// ---------- báo cáo định kỳ ----------

export type ScheduleInput = Omit<ScheduledReport, "scheduleId" | "createdAt" | "lastRunAt">;
export type ScheduleErrors = Partial<Record<"emails" | "startDate" | "time", string>>;

export const FREQUENCY_LABELS = { DAILY: "Hằng ngày", WEEKLY: "Hằng tuần", MONTHLY: "Hằng tháng" } as const;
export const DETAIL_LABELS: Record<ReportDetail, string> = { WEEK: "1 Tuần", MONTH: "1 Tháng", QUARTER: "1 Quý" };
const DETAIL_DAYS: Record<ReportDetail, number> = { WEEK: 7, MONTH: 30, QUARTER: 90 };

export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export function validateSchedule(input: ScheduleInput): ScheduleErrors {
  const errors: ScheduleErrors = {};
  if (input.emails.length === 0 || !input.emails.every(isValidEmail)) errors.emails = "Nhập ít nhất một email hợp lệ.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) errors.startDate = "Chọn ngày bắt đầu.";
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23 || !Number.isInteger(input.minute) || input.minute < 0 || input.minute > 59) {
    errors.time = "Giờ phải từ 00:00 đến 23:59.";
  }
  return errors;
}

export type ScheduleResult = { ok: true; schedule: ScheduledReport } | { ok: false; errors: ScheduleErrors };

// Tạo mới hoặc cập nhật (truyền scheduleId). Lần chạy kế tiếp tính từ thời điểm lưu.
export function saveSchedule(input: ScheduleInput, scheduleId?: string): ScheduleResult {
  const errors = validateSchedule(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const now = new Date(state().clock.now).toISOString();
  const existing = scheduleId ? state().scheduledReports.find((s) => s.scheduleId === scheduleId) : undefined;
  const schedule: ScheduledReport = {
    ...input,
    emails: input.emails.map((e) => e.trim()),
    scheduleId: existing?.scheduleId ?? makeId("SC"),
    createdAt: existing?.createdAt ?? now,
    lastRunAt: now,
  };
  state().upsertSchedule(schedule);
  notify(state().currentUser.userId, existing ? "Đã cập nhật báo cáo định kỳ" : "Đã tạo báo cáo định kỳ", "success");
  return { ok: true, schedule };
}

export function deleteSchedule(scheduleId: string): void {
  state().removeSchedule(scheduleId);
  notify(state().currentUser.userId, "Đã xóa báo cáo định kỳ", "info");
}

// Thời điểm chạy kế tiếp (ms): mốc đầu tiên (ngày bắt đầu + giờ) sau lần chạy gần nhất.
export function computeNextRun(s: ScheduledReport): number {
  const last = new Date(s.lastRunAt).getTime();
  for (let k = 0; k < 5000; k++) {
    const d = parseDateKey(s.startDate);
    d.setHours(s.hour, s.minute, 0, 0);
    if (s.frequency === "DAILY") d.setDate(d.getDate() + k);
    else if (s.frequency === "WEEKLY") d.setDate(d.getDate() + 7 * k);
    else d.setMonth(d.getMonth() + k);
    if (d.getTime() > last) return d.getTime();
  }
  return Number.POSITIVE_INFINITY;
}

export function describeSchedule(s: ScheduledReport): string {
  const hubName = s.hubId === "ALL" ? "All Hubs" : (state().hubs.find((h) => h.hubId === s.hubId)?.name ?? s.hubId);
  return `${TOPIC_TITLES[s.topic]} | ${hubName}`;
}

// Vai trò dùng được Báo cáo & Thống kê: nhận thông báo khi báo cáo định kỳ chạy xong / lỗi.
const REPORT_ROLES = ["OPERATOR", "ADMIN", "MANAGEMENT"] as const;

const running = new Set<string>();

// Chạy các báo cáo định kỳ đã đến hạn (gọi từ tick). "Gửi email" là giả lập bằng thông báo.
export async function runDueSchedules(nowMs: number): Promise<number> {
  let ran = 0;
  for (const schedule of state().scheduledReports) {
    if (running.has(schedule.scheduleId) || computeNextRun(schedule) > nowMs) continue;
    running.add(schedule.scheduleId);
    try {
      const nowIso = new Date(nowMs).toISOString();
      const to = dateKey(new Date(nowMs));
      const filters: ReportFilters = { from: addDays(to, -(DETAIL_DAYS[schedule.detail] - 1)), to, hubId: schedule.hubId, vehicle: schedule.vehicle };
      // Cập nhật mốc trước để một lần trễ không bị chạy lặp.
      state().upsertSchedule({ ...schedule, lastRunAt: nowIso });

      if (state().reportFailureMode) throw new ReportError("FAILED", "Lỗi kết nối hoặc dữ liệu không đủ.");
      const data = buildReport({
        topic: schedule.topic,
        filters,
        hubs: hubInfos(),
        today: to,
        generatedAt: nowIso,
        live: buildLiveFacts(to, filters.vehicle),
      });
      if (schedule.format === "PDF") await loadPdfFonts();
      const file = buildExportFile(data, schedule.format);
      state().addReport({
        reportId: makeId("RP"),
        type: schedule.topic,
        periodFrom: filters.from,
        periodTo: filters.to,
        data,
        createdAt: nowIso,
        scheduleId: schedule.scheduleId,
      });
      const message = `Báo cáo định kỳ ${describeSchedule(schedule)} (${file.fileName}) đã gửi tới ${schedule.emails.join(", ")}`;
      for (const role of REPORT_ROLES) notify(`role:${role}`, message, "success");
      ran++;
    } catch {
      for (const role of REPORT_ROLES) notify(`role:${role}`, `Không thể tạo báo cáo định kỳ ${describeSchedule(schedule)}`, "error");
    } finally {
      running.delete(schedule.scheduleId);
    }
  }
  return ran;
}

export { formatDateVi };
