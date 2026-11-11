import type { StateCreator } from "zustand";
import type { Report } from "../types";
import { upsertById } from "../utils/collections";
import type { AppState } from "./index";

// ===== M1 sở hữu file này: báo cáo (UC17) =====

export interface ReportSliceData {
  reports: Report[];
}

export interface ReportSliceActions {
  upsertReport: (r: Report) => void;
}

export type ReportSlice = ReportSliceData & ReportSliceActions;

export function initialReportState(): ReportSliceData {
  return { reports: [] };
}

export const createReportSlice: StateCreator<AppState, [], [], ReportSliceActions> = (set) => ({
  upsertReport: (r) => set((s) => ({ reports: upsertById(s.reports, r, "reportId") })),
});
