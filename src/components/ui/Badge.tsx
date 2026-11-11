import { statusClass } from "../../styles/statusColors";

interface BadgeProps {
  // Giá trị enum (VehicleStatus, PortStatus, AlertSeverity...) quyết định màu.
  value: string;
  label?: string;
}

export function Badge({ value, label }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClass(value)}`}
    >
      {label ?? value}
    </span>
  );
}
