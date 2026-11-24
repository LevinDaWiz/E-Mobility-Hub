import { useState } from "react";
import { isNotificationForUser } from "../services/notificationService";
import { useStore } from "../store";
import { TOAST_CLASSES } from "../styles/statusColors";

interface NotificationBellProps {
  // Có label → nút dạng chữ như mockup mobile ("Thông báo" + chấm đỏ); không có → chuông + số.
  label?: string;
}

export function NotificationBell({ label }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const user = useStore((s) => s.currentUser);
  const notifications = useStore((s) => s.notifications);
  const markAllRead = useStore((s) => s.markAllNotificationsRead);

  const mine = notifications.filter((n) => isNotificationForUser(n, user)).reverse();
  const unread = mine.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          label
            ? "relative rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800"
            : "relative rounded-md p-2 text-slate-600 hover:bg-slate-100"
        }
        aria-label="Thông báo"
      >
        {label ?? <span aria-hidden="true">🔔</span>}
        {unread > 0 &&
          (label ? (
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600" />
          ) : (
            <span className="absolute -right-0.5 -top-0.5 rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
              {unread}
            </span>
          ))}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm font-semibold">
            Thông báo
            <button type="button" onClick={markAllRead} className="text-xs font-normal text-brand-700">
              Đánh dấu đã đọc
            </button>
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {mine.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-400">Không có thông báo</li>}
            {mine.map((n) => (
              <li key={n.id} className={`px-3 py-2 text-sm ${n.read ? "opacity-60" : ""}`}>
                <span className={`mr-2 inline-block rounded border px-1.5 text-[10px] ${TOAST_CLASSES[n.level]}`}>
                  {n.level}
                </span>
                {n.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
