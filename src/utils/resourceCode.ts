// Mã hiển thị của slot / cổng sạc: bỏ tiền tố Hub ("HUB-DORM-01-S01" → "S01").
export function resourceCode(id: string, hubId: string): string {
  return id.startsWith(`${hubId}-`) ? id.slice(hubId.length + 1) : id;
}
