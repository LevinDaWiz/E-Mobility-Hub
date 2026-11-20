const pad = (n: number) => String(n).padStart(2, "0");

// "01:42"
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "14/10/2026 01:35"
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${formatTime(iso)}`;
}

// So sánh mã có số ("S2" < "S10").
export const naturalCompare = (a: string, b: string): number => a.localeCompare(b, undefined, { numeric: true });
