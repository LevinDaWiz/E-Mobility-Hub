import { useState } from "react";
import type { BarItem } from "../../../types";
import { Segmented } from "./Segmented";

interface HubBarsProps {
  title: string;
  subtitle: string;
  tabs: [string, string];
  first: BarItem[];
  second: BarItem[];
  unitFirst: string;
  unitSecond: string;
}

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

// Cột theo Hub, chuyển qua lại giữa hai chỉ số (theo mockup: "Nhu cầu | Sử dụng").
export function HubBars({ title, subtitle, tabs, first, second, unitFirst, unitSecond }: HubBarsProps) {
  const [tab, setTab] = useState<"first" | "second">("first");
  const items = tab === "first" ? first : second;
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-brand-950">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <Segmented
          label="Chỉ số theo Hub"
          value={tab}
          onChange={setTab}
          options={[
            { value: "first", label: tabs[0] },
            { value: "second", label: tabs[1] },
          ]}
        />
      </div>
      <div className="flex h-52 items-end gap-3" role="img" aria-label={`${title}: ${tab === "first" ? unitFirst : unitSecond}`}>
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-bold text-slate-800">{fmt(item.value)}</span>
            <div className="w-full max-w-14 rounded-t bg-brand-700" style={{ height: `${Math.max(2, (item.value / max) * 150)}px` }} />
            <span className="w-full truncate text-center text-[11px] text-slate-600" title={item.label}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-1 text-right text-[10px] text-slate-400">Đơn vị: {tab === "first" ? unitFirst : unitSecond}</p>
    </section>
  );
}
