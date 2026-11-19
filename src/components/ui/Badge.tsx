import { statusClass } from "../../styles/statusColors";

interface BadgeProps {
  // Giá trị enum (VehicleStatus, PortStatus, AlertSeverity...) quyết định màu.
  value: string;
  label?: string;
  // Ghi đè màu mặc định (dùng cho bảng chỗ đỗ / cổng sạc theo bảng màu riêng).
  className?: string;
}

export function Badge({ value, label, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className ?? statusClass(value)}`}
    >
      {label ?? value}
    </span>
  );
}
