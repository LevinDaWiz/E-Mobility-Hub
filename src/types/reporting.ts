import type { VehicleType } from "./vehicle";

// ===== UC17 – Báo cáo & Thống kê (M1) =====

export type ReportTopic = "MOVEMENT" | "ENERGY" | "PERFORMANCE" | "SERVICE_QUALITY";
export type ExportFormat = "PDF" | "XLSX" | "CSV";
export type VehicleFilter = "ALL" | VehicleType;
export type ReportFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
// Khoảng dữ liệu mà mỗi báo cáo định kỳ bao phủ ("Chi tiết": 1 tuần / 1 tháng / 1 quý).
export type ReportDetail = "WEEK" | "MONTH" | "QUARTER";

export interface ReportFilters {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  hubId: "ALL" | string;
  vehicle: VehicleFilter;
}

export interface ReportKpi {
  label: string;
  value: string;
  sub?: string;
  // 0..1: hiện thanh tiến độ dưới số liệu.
  progress?: number;
}

export interface ChartPoint {
  label: string; // nhãn trục ("25" hoặc "07")
  title: string; // nhãn tooltip ("25/09" hoặc "07h")
  value: number;
  weekend?: boolean;
}

export interface BarItem {
  label: string;
  value: number;
}

export interface HeatCell {
  text: string;
  level: 0 | 1 | 2 | 3; // Low, Medium, High, Very High
}

export interface ReportData {
  topic: ReportTopic;
  title: string;
  filters: ReportFilters;
  hubLabel: string; // "All Hubs" hoặc tên Hub
  vehicleLabel: string; // "All" / "E-bike" / "E-motorbike"
  generatedAt: string;
  // Có giá trị (YYYY-MM-DD) nếu ngày đó trong báo cáo dùng số liệu thật từ hệ thống; các ngày khác là dữ liệu mẫu.
  liveDate?: string;
  kpis: ReportKpi[];
  series: {
    title: string;
    subtitle: string;
    lineLabel: string; // chú thích đường: "Tổng yêu cầu mỗi ngày"
    unit: string;
    byDay: ChartPoint[];
    byHour: ChartPoint[];
  };
  hubBars: {
    title: string;
    subtitle: string;
    tabs: [string, string];
    first: BarItem[];
    second: BarItem[];
    unitFirst: string;
    unitSecond: string;
  };
  heatmap: {
    title: string;
    subtitle: string;
    columns: string[];
    rows: { label: string; cells: HeatCell[] }[];
  };
  table: {
    title: string;
    subtitle: string;
    columns: string[];
    rows: string[][];
    total: string[];
  };
}

export interface ScheduledReport {
  scheduleId: string;
  topic: ReportTopic;
  hubId: "ALL" | string;
  vehicle: VehicleFilter;
  format: ExportFormat;
  frequency: ReportFrequency;
  hour: number;
  minute: number;
  startDate: string; // YYYY-MM-DD
  detail: ReportDetail;
  emails: string[];
  createdAt: string;
  // Lần chạy gần nhất (hoặc lúc tạo) – lần chạy kế tiếp tính từ mốc này.
  lastRunAt: string;
}

// Bản nháp lựa chọn ở trang thiết lập (giữ lại khi chuyển trang).
export interface ReportDraft {
  topic: ReportTopic;
  filters: ReportFilters;
}
