export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  // Người nhận: userId cụ thể, "*" (tất cả) hoặc "role:OPERATOR" (theo vai trò).
  userId: string;
  message: string;
  level: NotificationLevel;
  createdAt: string;
  read: boolean;
}
