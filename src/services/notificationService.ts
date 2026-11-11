import { useStore } from "../store";
import type { AppNotification, CurrentUser, NotificationLevel } from "../types";
import { makeId } from "../utils/id";
import { simNowIso } from "../utils/time";

// ===== M1 sở hữu. Dùng ở mọi nơi: notify("SV001", "Xe đã hết hạn đặt", "warning") =====
// userId: userId cụ thể, "*" (mọi người) hoặc "role:OPERATOR" (mọi người thuộc vai trò).

export function notify(
  userId: string,
  message: string,
  level: NotificationLevel = "info",
): AppNotification {
  const notification: AppNotification = {
    id: makeId("N"),
    userId,
    message,
    level,
    createdAt: simNowIso(),
    read: false,
  };
  useStore.getState().addNotification(notification);
  return notification;
}

export function isNotificationForUser(n: AppNotification, user: CurrentUser): boolean {
  return n.userId === "*" || n.userId === user.userId || n.userId === `role:${user.role}`;
}
