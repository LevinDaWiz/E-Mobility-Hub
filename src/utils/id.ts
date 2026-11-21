// ID duy nhất cho bản ghi mới. Không dùng giờ thật (Date.now) để không lệch quy ước đồng hồ mô phỏng:
// bộ đếm tăng dần (không trùng trong một phiên) + đoạn ngẫu nhiên (không trùng giữa các phiên).
let sequence = 0;

export function makeId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
