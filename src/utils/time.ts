import { useStore } from "../store";

// Mọi logic nghiệp vụ dùng đồng hồ MÔ PHỎNG, không dùng Date.now() trực tiếp,
// để Demo panel tua nhanh được thời gian.

export const getSimNow = (): number => useStore.getState().clock.now;
export const simNowIso = (): string => new Date(getSimNow()).toISOString();

export const addMs = (iso: string | number, ms: number): string =>
  new Date(new Date(iso).getTime() + ms).toISOString();

// Số ms còn lại tới thời điểm iso (âm = đã quá hạn).
export const msUntil = (iso: string, now: number = getSimNow()): number =>
  new Date(iso).getTime() - now;

export const isExpired = (iso: string, now: number = getSimNow()): boolean => msUntil(iso, now) <= 0;

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
