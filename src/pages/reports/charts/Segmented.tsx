interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}

// Nút chuyển 2 chế độ nhỏ ("Theo ngày | Theo giờ", "Nhu cầu | Sử dụng", "Tất cả | Định kỳ").
export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div className="inline-flex rounded-md bg-brand-50 p-0.5 text-xs" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 font-medium ${o.value === value ? "bg-brand-200 text-brand-950" : "text-slate-500 hover:text-slate-800"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
