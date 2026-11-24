// Thêm mới hoặc thay thế phần tử theo khoá id. Không mutate mảng gốc.
export function upsertById<T, K extends keyof T>(list: T[], item: T, key: K): T[] {
  const index = list.findIndex((x) => x[key] === item[key]);
  if (index === -1) return [...list, item];
  const next = list.slice();
  next[index] = item;
  return next;
}
