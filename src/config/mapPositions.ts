// Vị trí (%) của từng Hub trên bản đồ minh hoạ ở trang chủ app mobile.
// Hub có sẵn trong seed có vị trí cố định ở đây. Hub tạo thêm (UC19: form hoặc nhập tệp) KHÔNG cần khai báo:
// resolveHubPins() tự đặt vào một ô trống trên bản đồ. Muốn vị trí riêng thì thêm một dòng ở HUB_MAP_PINS.
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

// Các ô dự phòng (lưới 5 x 5, tránh dấu "Vị trí của bạn" ở giữa) dùng cho Hub chưa khai báo vị trí.
const FALLBACK_SLOTS: { x: number; y: number }[] = [10, 30, 50, 70, 90].flatMap((y) =>
  [12, 31, 50, 69, 88].map((x) => ({ x, y: Math.min(88, Math.max(12, y)) })),
);
const MIN_PIN_DISTANCE = 14; // khoảng cách tối thiểu (đơn vị %) giữa hai chấm Hub
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

// Trả vị trí cho mọi Hub: Hub đã khai báo giữ nguyên; Hub mới được xếp theo thứ tự vào ô trống đầu tiên không chồng
// lên chấm khác (xác định, cùng danh sách Hub luôn ra cùng kết quả). Hết ô trống thì chọn ô xa các chấm nhất.
export function resolveHubPins(hubs: { hubId: string; area: string; name: string }[]): Record<string, MapPin> {
  const pins: Record<string, MapPin> = {};
  const used: { x: number; y: number }[] = [{ x: 50, y: 50 }]; // dấu "Vị trí của bạn"
  for (const hub of hubs) {
    const known = HUB_MAP_PINS[hub.hubId];
    if (known) {
      pins[hub.hubId] = known;
      used.push(known);
    }
  }
  for (const hub of hubs) {
    if (pins[hub.hubId]) continue;
    const free = FALLBACK_SLOTS.find((slot) => used.every((u) => dist(slot, u) >= MIN_PIN_DISTANCE));
    const slot =
      free ??
      [...FALLBACK_SLOTS].sort(
        (a, b) => Math.min(...used.map((u) => dist(b, u))) - Math.min(...used.map((u) => dist(a, u))),
      )[0];
    pins[hub.hubId] = { x: slot.x, y: slot.y, label: hub.area || hub.name };
    used.push(slot);
  }
  return pins;
}
