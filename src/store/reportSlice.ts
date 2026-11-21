import type { StateCreator } from "zustand";
import type { Report, ReportDraft, ScheduledReport } from "../types";
import { REPORT_HISTORY_LIMIT } from "../config/constants";
import { upsertById } from "../utils/collections";
import type { AppState } from "./index";

// ===== M1 sở hữu file này: báo cáo & thống kê (UC17) =====

export interface ReportSliceData {
  reports: Report[]; // báo cáo đã tạo, mới nhất đứng đầu
  activeReport: Report | null; // báo cáo đang xem ở trang kết quả
  draft: ReportDraft | null; // lựa chọn chuyên đề + bộ lọc ở trang thiết lập
  scheduledReports: ScheduledReport[];
  // Demo: bật để thấy trạng thái lỗi khi tạo / xuất báo cáo.
  reportFailureMode: boolean;
}

export interface ReportSliceActions {
  upsertReport: (r: Report) => void;
  addReport: (r: Report) => void;
  setActiveReport: (r: Report | null) => void;
  setDraft: (d: ReportDraft) => void;
  upsertSchedule: (s: ScheduledReport) => void;
  removeSchedule: (scheduleId: string) => void;
  setReportFailureMode: (on: boolean) => void;
}

export type ReportSlice = ReportSliceData & ReportSliceActions;

export function initialReportState(): ReportSliceData {
  return { reports: [], activeReport: null, draft: null, scheduledReports: [], reportFailureMode: false };
}

export const createReportSlice: StateCreator<AppState, [], [], ReportSliceActions> = (set) => ({
  upsertReport: (r) => set((s) => ({ reports: upsertById(s.reports, r, "reportId") })),
  addReport: (r) => set((s) => ({ reports: [r, ...s.reports].slice(0, REPORT_HISTORY_LIMIT) })),
  setActiveReport: (r) => set({ activeReport: r }),
  setDraft: (d) => set({ draft: d }),
  upsertSchedule: (sc) => set((s) => ({ scheduledReports: upsertById(s.scheduledReports, sc, "scheduleId") })),
  removeSchedule: (id) => set((s) => ({ scheduledReports: s.scheduledReports.filter((x) => x.scheduleId !== id) })),
  setReportFailureMode: (on) => set({ reportFailureMode: on }),
});
