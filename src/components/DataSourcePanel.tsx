import { getMetroFlow } from "../services/metroService";
import { useStore } from "../store";
import { Badge, Card } from "./ui";

// Trạng thái các nguồn dữ liệu ngoài: Metro (UC21) và IoT (UC22). Dùng ở trang Tổng quan quản trị.
export function DataSourcePanel() {
  const metroData = useStore((s) => s.metroData);
  const surge = useStore((s) => s.metroSurge);
  const iot = useStore((s) => s.iot);
  const nowMs = useStore((s) => s.clock.now);

  const { current, peak, series } = metroData ? getMetroFlow() : { current: 0, peak: 0, series: [] };
  const currentHour = new Date(Math.floor(nowMs / 3_600_000) * 3_600_000).toISOString();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card
        title="Lượng khách Metro (6 giờ tới)"
        actions={surge.active ? <Badge value="CRITICAL" label={`Surge ×${surge.multiplier}`} /> : <Badge value="AVAILABLE" label="Bình thường" />}
      >
        <div className="flex h-28 items-end gap-2">
          {series.map((p) => (
            <div key={p.at} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500">{p.count}</span>
              <div
                className={`w-full rounded-t ${surge.active ? "bg-rose-400" : p.at === currentHour ? "bg-brand-700" : "bg-brand-200"}`}
                style={{ height: `${peak === 0 ? 0 : Math.max(4, (p.count / peak) * 80)}px` }}
              />
              <span className="text-[10px] text-slate-400">{new Date(p.at).getHours()}h</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Giờ này: <b>{current}</b> lượt · Cao điểm trong khung: <b>{peak}</b> lượt
        </p>
      </Card>

      <Card title="Dữ liệu IoT" actions={<Badge value={iot.enabled ? "AVAILABLE" : "CANCELLED"} label={iot.enabled ? "Đang nhận" : "Đã tắt"} />}>
        <dl className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-slate-50 py-2">
            <dd className="text-lg font-semibold text-slate-900">{iot.applied}</dd>
            <dt className="text-slate-500">Bản ghi áp dụng</dt>
          </div>
          <div className="rounded-md bg-slate-50 py-2">
            <dd className="text-lg font-semibold text-slate-900">{iot.rejected}</dd>
            <dt className="text-slate-500">Bị bỏ qua</dt>
          </div>
          <div className="rounded-md bg-slate-50 py-2">
            <dd className="text-sm font-semibold leading-7 text-slate-900">
              {iot.lastUpdateAt ? new Date(iot.lastUpdateAt).toLocaleTimeString("vi-VN") : "—"}
            </dd>
            <dt className="text-slate-500">Cập nhật gần nhất</dt>
          </div>
        </dl>
        <p className="mt-2 text-xs text-slate-500">
          {iot.randomFaults ? "Đang bật lỗi thiết bị ngẫu nhiên. " : ""}
          Bật/tắt và gây lỗi ở nút ⚙ Demo.
        </p>
      </Card>
    </div>
  );
}
