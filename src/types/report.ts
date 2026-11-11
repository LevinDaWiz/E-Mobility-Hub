export interface Report {
  reportId: string;
  type: string;
  periodFrom: string;
  periodTo: string;
  // Dữ liệu đã tổng hợp để UC17 hiển thị / xuất CSV.
  data: Record<string, unknown>;
}
