import type { ReportData } from "../../types";

// "Tổng hợp theo Hub": bảng có dòng tổng in đậm.
export function SummaryTable({ table }: { table: ReportData["table"] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-stone-50 p-4">
      <h2 className="text-xl font-bold text-brand-950">{table.title}</h2>
      <p className="mb-3 text-xs text-slate-500">{table.subtitle}</p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-200 text-xs font-semibold text-slate-700">
              {table.columns.map((c, i) => (
                <th key={c} className={`px-3 py-2 ${i === 0 ? "rounded-l text-left" : "text-right"} ${i === table.columns.length - 1 ? "rounded-r" : ""}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row[0]} className="border-b border-slate-100">
                {row.map((cell, i) => (
                  <td key={`${row[0]}-${table.columns[i]}`} className={`px-3 py-2 ${i === 0 ? "font-bold text-slate-900" : "text-right text-slate-700"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-slate-200 font-bold text-slate-900">
              {table.total.map((cell, i) => (
                <td key={table.columns[i]} className={`px-3 py-2 ${i === 0 ? "rounded-l" : "text-right"} ${i === table.total.length - 1 ? "rounded-r" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
