// Vị trí (%) của từng Hub trên bản đồ minh hoạ ở trang chủ app mobile.
// Thêm Hub mới: thêm một dòng; Hub chưa khai báo sẽ không hiện trên bản đồ.
export interface MapPin {
  x: number; // 0..100 từ trái sang
  y: number; // 0..100 từ trên xuống
  label: string;
}

export const HUB_MAP_PINS: Record<string, MapPin> = {
  "HUB-METRO-01": { x: 16, y: 62, label: "Ga Metro" },
  "HUB-DORM-01": { x: 76, y: 14, label: "KTX Khu A" },
  "HUB-DORM-02": { x: 82, y: 66, label: "KTX Khu B" },
  "HUB-CAMPUS-01": { x: 30, y: 22, label: "ĐH Bách Khoa" },
  "HUB-CAMPUS-02": { x: 54, y: 80, label: "ĐH KHTN" },
  "HUB-SERVICE-01": { x: 60, y: 42, label: "Trạm DV" },
};
