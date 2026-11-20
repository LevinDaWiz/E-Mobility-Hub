interface StatCardProps {
  label: string;
  value: string | number;
  // danger: số đỏ (ví dụ "Lỗi").
  tone?: "default" | "danger";
}

export function StatCard({ label, value, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-stone-50 px-4 py-3">
      <p className="text-sm text-slate-600">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone === "danger" ? "text-red-700" : "text-brand-900"}`}>{value}</p>
    </div>
  );
}
