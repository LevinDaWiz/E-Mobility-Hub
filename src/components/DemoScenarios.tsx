import { useState } from "react";
import { METRO_SURGE_MULTIPLIER } from "../config/constants";
import { iotSimulator } from "../engine/iotSimulator";
import { injectFault, listFaultTargets, repairFault, type FaultEntity } from "../services/faultInjection";
import { simulateOtherAdminEdit } from "../services/hubConfigService";
import { endMetroSurge, getMetroFlow, ingestMetroData, startMetroSurge } from "../services/metroService";
import { useStore } from "../store";
import { PortStatus, VehicleStatus } from "../types";
import { Button } from "./ui";

const sectionTitle = "mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500";
const selectClass = "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs";

// Kịch bản demo của M1: Metro surge (UC21), IoT (UC22), gây lỗi cổng / xe.
export function DemoScenarios() {
  const surge = useStore((s) => s.metroSurge);
  const iot = useStore((s) => s.iot);
  const setIotEnabled = useStore((s) => s.setIotEnabled);
  const setIotRandomFaults = useStore((s) => s.setIotRandomFaults);
  // Đọc để component render lại khi trạng thái thiết bị đổi (danh sách mục tiêu lỗi lấy từ store).
  const vehicles = useStore((s) => s.vehicles);
  const ports = useStore((s) => s.chargingPorts);
  const metroData = useStore((s) => s.metroData);
  const hubs = useStore((s) => s.hubs);
  const reportFailureMode = useStore((s) => s.reportFailureMode);
  const setReportFailureMode = useStore((s) => s.setReportFailureMode);

  const [entity, setEntity] = useState<FaultEntity>("port");
  const [targetId, setTargetId] = useState("");
  const [conflictHubId, setConflictHubId] = useState("");

  const targets = listFaultTargets().filter((t) => t.entity === entity);
  const selected = targets.find((t) => t.id === targetId) ?? targets[0];
  const faultyCount =
    vehicles.filter((v) => v.status === VehicleStatus.FAULTY).length +
    ports.filter((p) => p.status === PortStatus.FAULTY).length;
  const flow = metroData ? getMetroFlow() : null;

  return (
    <div className="space-y-4 border-t border-slate-100 pt-3">
      <section>
        <h3 className={sectionTitle}>Metro (UC21)</h3>
        <p className="mb-2 text-xs text-slate-600">
          Khách giờ này: <b>{flow?.current ?? 0}</b>
          {surge.active && <span className="ml-1 font-semibold text-rose-600">(surge ×{surge.multiplier})</span>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="danger" disabled={surge.active} onClick={() => void startMetroSurge()}>
            Metro surge ×{METRO_SURGE_MULTIPLIER}
          </Button>
          <Button size="sm" variant="secondary" disabled={!surge.active} onClick={() => void endMetroSurge()}>
            Kết thúc surge
          </Button>
          <Button size="sm" variant="ghost" onClick={() => ingestMetroData({ arrivals: { "không-phải-giờ": -5 } })}>
            Gửi dữ liệu sai
          </Button>
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>IoT (UC22)</h3>
        <div className="mb-2 space-y-1 text-xs text-slate-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={iot.enabled} onChange={(e) => setIotEnabled(e.target.checked)} />
            Bộ giả lập IoT (pin xe đang đi giảm dần)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={iot.randomFaults} onChange={(e) => setIotRandomFaults(e.target.checked)} />
            Lỗi thiết bị ngẫu nhiên
          </label>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Đã áp dụng {iot.applied} · Bỏ qua {iot.rejected}
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            iotSimulator.emit({
              sourceId: "demo-invalid",
              timestamp: new Date().toISOString(),
              payload: { entity: "vehicle", id: "VH-001", batteryLevel: 999 },
            })
          }
        >
          Gửi bản ghi sai
        </Button>
      </section>

      <section>
        <h3 className={sectionTitle}>Gây lỗi thiết bị ({faultyCount} đang lỗi)</h3>
        <div className="mb-2 flex gap-1.5">
          <select
            className={`${selectClass} w-24 shrink-0`}
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value as FaultEntity);
              setTargetId("");
            }}
          >
            <option value="port">Cổng sạc</option>
            <option value="vehicle">Xe</option>
          </select>
          <select className={selectClass} value={selected?.id ?? ""} onChange={(e) => setTargetId(e.target.value)}>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.faulty ? "✕ " : ""}
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="danger"
            disabled={!selected || selected.faulty}
            onClick={() => selected && injectFault(selected.entity, selected.id)}
          >
            Gây lỗi
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!selected || !selected.faulty}
            onClick={() => selected && repairFault(selected.entity, selected.id)}
          >
            Khôi phục
          </Button>
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>Báo cáo (UC17)</h3>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={reportFailureMode} onChange={(e) => setReportFailureMode(e.target.checked)} />
          Giả lập lỗi khi tạo / xuất báo cáo
        </label>
      </section>

      <section>
        <h3 className={sectionTitle}>Cấu hình Hub (UC19)</h3>
        <p className="mb-2 text-xs text-slate-500">
          Mở tab Cấu hình của Hub, bấm nút dưới rồi Lưu để thấy lỗi 409 Conflict.
        </p>
        <div className="flex gap-1.5">
          <select className={selectClass} value={conflictHubId || hubs[0]?.hubId || ""} onChange={(e) => setConflictHubId(e.target.value)}>
            {hubs.map((h) => (
              <option key={h.hubId} value={h.hubId}>
                {h.name} (v{h.version})
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => simulateOtherAdminEdit(conflictHubId || hubs[0]?.hubId || "")}>
            Admin khác sửa
          </Button>
        </div>
      </section>
    </div>
  );
}
