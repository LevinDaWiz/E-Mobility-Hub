import { useMemo, useState } from "react";

export interface ChipItem {
  id: string;
  code: string; // mã hiển thị trên chip
  hubName: string;
}

interface Props {
  label: string;
  searchPlaceholder: string;
  items: ChipItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}

const MAX_VISIBLE = 30;

// Trường chọn tài nguyên (mockup): ô tìm kiếm theo mã hoặc tên Hub + chip ☑ / ☐ bấm để chọn hoặc gỡ.
export function ResourceChipField({ label, searchPlaceholder, items, selected, onChange, error }: Props) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = items.filter(
      (i) =>
        q === "" ||
        i.code.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.hubName.toLowerCase().includes(q),
    );
    // Chip đã chọn luôn nằm trước để dễ gỡ bỏ.
    return [...matches].sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)));
  }, [items, query, selected]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div>
      <p className={`mb-1 text-sm font-semibold ${error ? "text-red-700" : "text-slate-800"}`}>{label}</p>
      <input
        type="search"
        aria-label={searchPlaceholder}
        placeholder={`⌕ ${searchPlaceholder}`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-700"
      />
      <div className="flex flex-wrap gap-2">
        {visible.slice(0, MAX_VISIBLE).map((item) => {
          const checked = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => toggle(item.id)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                checked
                  ? "border-blue-200 bg-blue-50 font-medium text-blue-800"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {checked ? "☑" : "☐"} {item.code}
            </button>
          );
        })}
        {visible.length === 0 && <span className="text-xs text-slate-400">Không có kết quả phù hợp.</span>}
      </div>
      <p className="mt-2 text-[11px] italic text-slate-400">
        Chip hiển thị tài nguyên đã chọn, có thể gỡ bỏ. Tìm kiếm hỗ trợ theo mã hoặc tên Hub.
        {visible.length > MAX_VISIBLE && ` Đang hiện ${MAX_VISIBLE}/${visible.length}, hãy gõ để thu hẹp.`}
      </p>
      {error && (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
