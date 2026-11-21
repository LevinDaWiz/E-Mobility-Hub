import { useState } from "react";
import type { ChartPoint } from "../../../types";
import { Segmented } from "./Segmented";

interface DailyChartProps {
  title: string;
  subtitle: string;
  lineLabel: string;
  unit: string;
  byDay: ChartPoint[];
  byHour: ChartPoint[];
}

const W = 640;
const H = 250;
const PAD = { left: 38, right: 8, top: 14, bottom: 26 };

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 1.5, 2, 3, 4, 5, 6, 8, 10]) if (max <= m * pow) return m * pow;
  return 10 * pow;
}

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

// Biểu đồ đường theo ngày / giờ; cột xanh đậm là cuối tuần (theo mockup).
export function DailyChart({ title, subtitle, lineLabel, unit, byDay, byHour }: DailyChartProps) {
  const [mode, setMode] = useState<"day" | "hour">("day");
  const [hover, setHover] = useState<number | null>(null);
  const points = mode === "day" ? byDay : byHour;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const step = plotW / Math.max(1, points.length);
  const x = (i: number) => PAD.left + (i + 0.5) * step;
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  const hovered = hover !== null ? points[hover] : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-brand-950">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <Segmented
          label="Chế độ biểu đồ"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setHover(null);
          }}
          options={[
            { value: "day", label: "Theo ngày" },
            { value: "hour", label: "Theo giờ" },
          ]}
        />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}, ${points.length} điểm dữ liệu`}>
        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="#c5d7f7" rx="2" />
        {mode === "day" &&
          points.map((p, i) =>
            p.weekend ? <rect key={`w${p.title}`} x={PAD.left + i * step} y={PAD.top} width={step} height={plotH} fill="#6b9cf0" /> : null,
          )}
        {[0, 1 / 3, 2 / 3, 1].map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(max * t)} y2={y(max * t)} stroke="#ffffff" strokeOpacity="0.6" />
            <text x={PAD.left - 5} y={y(max * t) + 3} textAnchor="end" fontSize="9" fill="#475569">
              {fmt(max * t)}
            </text>
          </g>
        ))}
        <polyline fill="none" stroke="#0f766e" strokeWidth="1.8" points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} />
        {points.map((p, i) => (
          <g key={p.title}>
            <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 4 : 2.2} fill="#ffffff" stroke="#0f766e" strokeWidth="1.4" />
            {i % labelEvery === 0 && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#475569">
                {p.label}
              </text>
            )}
            <rect
              x={PAD.left + i * step}
              y={PAD.top}
              width={step}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${p.title} · ${fmt(p.value)} ${unit}`}</title>
            </rect>
          </g>
        ))}
        {hovered && hover !== null && (
          <g pointerEvents="none">
            <rect x={Math.min(W - 92, Math.max(PAD.left, x(hover) - 40))} y={Math.max(2, y(hovered.value) - 26)} width="84" height="18" rx="4" fill="#102d5e" />
            <text x={Math.min(W - 92, Math.max(PAD.left, x(hover) - 40)) + 42} y={Math.max(2, y(hovered.value) - 26) + 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff">
              {`${hovered.title} · ${fmt(hovered.value)}`}
            </text>
          </g>
        )}
      </svg>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-8 bg-teal-700" /> {lineLabel}
        </span>
        {mode === "day" && (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-8 rounded bg-[#6b9cf0]" /> Cuối tuần
          </span>
        )}
      </div>
    </section>
  );
}
