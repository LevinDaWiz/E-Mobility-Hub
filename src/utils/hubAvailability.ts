import { useStore } from "../store";
import { HubOperationalStatus } from "../types";

// ===== M1 sở hữu: Hub có đang nhận / giao xe được không? Dùng chung cho M2, M3, M4 =====
// Trả về lý do chặn (tiếng Việt, hiện thẳng cho người dùng) hoặc null nếu được phép.

// Hub phải đang AVAILABLE (không bảo trì / ngưng hoạt động). Dùng khi đặt xe đang đỗ tại Hub.
export function getHubPickupBlocker(hubId: string): string | null {
  const hub = useStore.getState().hubs.find((h) => h.hubId === hubId);
  if (!hub) return "Hub không tồn tại.";
  if (hub.operationalStatus === HubOperationalStatus.MAINTENANCE) return `Hub ${hub.name} đang bảo trì.`;
  if (hub.operationalStatus === HubOperationalStatus.UNAVAILABLE) return `Hub ${hub.name} đang ngưng hoạt động.`;
  return null;
}

// Hub đang nhận xe mới không: ngoài điều kiện trên còn phải không bị "tạm khóa cổng tiếp nhận" (UC15).
// Dùng khi trả xe (M2) và đặt chỗ đỗ trước (M3). Xe LẤY ra khỏi Hub quá tải thì không bị chặn.
export function getHubIntakeBlocker(hubId: string): string | null {
  const blocker = getHubPickupBlocker(hubId);
  if (blocker) return blocker;
  const { intakeLocks, hubs, clock } = useStore.getState();
  const lock = intakeLocks.find((l) => l.hubId === hubId && l.until > clock.now);
  if (!lock) return null;
  const name = hubs.find((h) => h.hubId === hubId)?.name ?? hubId;
  const minutes = Math.max(1, Math.ceil((lock.until - clock.now) / 60_000));
  return `Hub ${name} tạm ngưng nhận xe mới do quá tải (còn khoảng ${minutes} phút). Vui lòng chọn Hub khác.`;
}
