import { OVERLOAD_THRESHOLD, WARNING_THRESHOLD } from "../config/constants";

// ===== M1 sở hữu: bảng màu trạng thái dùng chung =====
// Các chuỗi class viết đầy đủ để Tailwind quét được. Đừng ghép class động.

const NEUTRAL = "bg-slate-100 text-slate-700 ring-slate-300";
const GREEN = "bg-emerald-100 text-emerald-800 ring-emerald-300";
const YELLOW = "bg-amber-100 text-amber-800 ring-amber-300";
const BLUE = "bg-sky-100 text-sky-800 ring-sky-300";
const PURPLE = "bg-violet-100 text-violet-800 ring-violet-300";
const RED = "bg-rose-100 text-rose-800 ring-rose-300";

// Khoá = giá trị enum (dạng chuỗi). Các enum trùng tên dùng chung một màu.
const STATUS_CLASSES: Record<string, string> = {
  // Vehicle / Port / Slot
  AVAILABLE: GREEN,
  FREE: GREEN,
  RESERVED: YELLOW,
  OCCUPIED: BLUE,
  IN_USE: BLUE,
  CHARGING: PURPLE,
  FAULTY: RED,
  // Reservation / Request / Session
  ACTIVE: GREEN,
  CONFIRMED: BLUE,
  EXPIRED: NEUTRAL,
  CANCELLED: NEUTRAL,
  PENDING: YELLOW,
  SCHEDULED: BLUE,
  COMPLETED: GREEN,
  INTERRUPTED: RED,
  REJECTED: RED,
  // Trip / Dispatch / Ticket / Simulation
  ONGOING: BLUE,
  PROPOSED: YELLOW,
  APPROVED: BLUE,
  IN_PROGRESS: PURPLE,
  DONE: GREEN,
  OPEN: RED,
  ASSIGNED: YELLOW,
  CLOSED: NEUTRAL,
  CREATED: NEUTRAL,
  RUNNING: PURPLE,
  FAILED: RED,
  // Alert severity
  INFO: BLUE,
  WARNING: YELLOW,
  CRITICAL: RED,
};

export function statusClass(value: string): string {
  return STATUS_CLASSES[value] ?? NEUTRAL;
}

// Màu thanh utilization: xanh < 70%, vàng 70-85%, đỏ > 85%.
export function utilizationBarClass(utilization: number): string {
  if (utilization > OVERLOAD_THRESHOLD) return "bg-rose-500";
  if (utilization >= WARNING_THRESHOLD) return "bg-amber-500";
  return "bg-emerald-500";
}

export const TOAST_CLASSES = {
  info: "border-sky-300 bg-sky-50 text-sky-900",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  error: "border-rose-300 bg-rose-50 text-rose-900",
} as const;
