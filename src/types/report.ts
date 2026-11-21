import type { ReportData } from "./reporting";

export interface Report {
  reportId: string;
  type: string; // ReportTopic
  periodFrom: string;
  periodTo: string;
  // Dữ liệu đã tổng hợp để UC17 hiển thị / xuất file.
  data: ReportData;
  createdAt: string;
  // Có giá trị nếu báo cáo do lịch định kỳ tạo ra.
  scheduleId?: string;
}
