import { useEffect, useState } from "react";
import { isNotificationForUser } from "../../services/notificationService";
import { useStore } from "../../store";
import { TOAST_CLASSES } from "../../styles/statusColors";

const TOAST_DURATION_MS = 5000;

// Hiện thông báo MỚI (sau khi trang mở) dành cho người dùng hiện tại, tự tắt sau 5 giây.
export function ToastHost() {
  const user = useStore((s) => s.currentUser);
  const notifications = useStore((s) => s.notifications);
  const [baseline] = useState(() => new Set(notifications.map((n) => n.id)));
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const visible = notifications.filter(
    (n) => !baseline.has(n.id) && !dismissed.has(n.id) && isNotificationForUser(n, user),
  );
  const visibleKey = visible.map((n) => n.id).join(",");

  useEffect(() => {
    if (visibleKey === "") return;
    const ids = visibleKey.split(",");
    const timer = setTimeout(
      () => setDismissed((prev) => new Set([...prev, ...ids])),
      TOAST_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [visibleKey]);

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {visible.map((n) => (
        <div
          key={n.id}
          className={`pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-md ${TOAST_CLASSES[n.level]}`}
          role="status"
        >
          {n.message}
        </div>
      ))}
    </div>
  );
}
