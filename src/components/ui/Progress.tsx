interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  // Class màu thanh (vd "bg-emerald-500"); mặc định indigo.
  barClassName?: string;
}

export function Progress({ value, max = 100, label, barClassName = "bg-indigo-500" }: ProgressProps) {
  const percent = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span>{Math.round(percent)}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full transition-all ${barClassName}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
