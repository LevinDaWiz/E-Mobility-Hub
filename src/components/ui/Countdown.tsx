import { useEffect } from "react";
import { useStore } from "../../store";
import { formatCountdown, msUntil } from "../../utils/time";

interface CountdownProps {
  // Thời điểm hết hạn (ISO). Đếm theo đồng hồ mô phỏng.
  expiresAt: string;
  // Gọi khi hết hạn. Nên bọc useCallback hoặc xử lý idempotent (có thể bị gọi lại khi render).
  onExpire?: () => void;
}

export function Countdown({ expiresAt, onExpire }: CountdownProps) {
  const now = useStore((s) => s.clock.now);
  const remaining = msUntil(expiresAt, now);
  const expired = remaining <= 0;

  useEffect(() => {
    if (expired) onExpire?.();
  }, [expired, onExpire]);

  return (
    <span
      className={`font-mono text-sm font-semibold ${expired ? "text-slate-400" : remaining < 10_000 ? "text-rose-600" : "text-slate-800"}`}
    >
      {expired ? "Hết hạn" : formatCountdown(remaining)}
    </span>
  );
}
