import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, ConfirmDeleteModal, FormField } from "../../../components/ui";
import {
  deleteHub,
  getDeleteImpact,
  hubToConfigInput,
  updateHubConfig,
  type DeleteImpact,
  type FieldErrors,
  type HubConfigInput,
} from "../../../services/hubConfigService";
import { useStore } from "../../../store";
import { inputClass } from "../../../styles/formClasses";
import { HubOperationalStatus, type Hub } from "../../../types";
import { formatDateTime, formatTime } from "../../../utils/format";
import { BlockedModal, type BlockedInfo } from "./BlockedModal";

interface ConflictState {
  yourVersion: number;
  latest: Hub;
}

function ConfigForm({ hub }: { hub: Hub }) {
  const canEdit = useStore((s) => s.currentUser.role === "ADMIN");
  const [form, setForm] = useState<HubConfigInput>(() => hubToConfigInput(hub));
  // Phiên bản bản ghi lúc người dùng mở form (dùng để phát hiện xung đột khi lưu).
  const [editVersion, setEditVersion] = useState(hub.version);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [blocked, setBlocked] = useState<BlockedInfo | null>(null);
  const [deleting, setDeleting] = useState<DeleteImpact | null>(null);
  const navigate = useNavigate();

  const set = <K extends keyof HubConfigInput>(key: K, value: HubConfigInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const locked = !canEdit || conflict !== null;
  const enabled = form.operationalStatus !== HubOperationalStatus.UNAVAILABLE;

  const reload = () => {
    const latest = useStore.getState().hubs.find((h) => h.hubId === hub.hubId);
    if (!latest) return;
    setForm(hubToConfigInput(latest));
    setEditVersion(latest.version);
    setErrors({});
    setConflict(null);
  };

  const save = () => {
    const result = updateHubConfig(hub.hubId, form, editVersion);
    if (result.ok) {
      setEditVersion(result.value.version);
      setErrors({});
    } else if (result.kind === "validation") {
      setErrors(result.errors);
    } else if (result.kind === "blocked") {
      setBlocked({ resource: result.resource, reason: result.reason });
    } else {
      setConflict({ yourVersion: result.yourVersion, latest: result.latest });
    }
  };

  // Xóa Hub: còn xe / lịch / phiếu thì báo bị chặn; không thì popup cảnh báo + nhập lại mã Hub để xác nhận.
  const askDeleteHub = () => {
    const impact = getDeleteImpact("hub", hub.hubId);
    if (!impact) return;
    if (impact.blockers.length > 0) {
      setBlocked({ title: "Không thể xóa Hub", resource: impact.label, reason: impact.blockers.join(" "), reasons: impact.blockers });
    } else {
      setDeleting(impact);
    }
  };

  const confirmDeleteHub = () => {
    if (!deleting) return;
    const result = deleteHub(deleting.id);
    setDeleting(null);
    if (result.ok) {
      navigate("/admin/hubs");
    } else if (result.kind === "blocked") {
      setBlocked({ title: "Không thể xóa Hub", resource: result.resource, reason: result.reason, reasons: result.reasons });
    }
  };

  const field = (key: keyof HubConfigInput, label: string, id: string) => (
    <FormField label={label} htmlFor={id} error={errors[key]}>
      <input
        id={id}
        className={inputClass(!!errors[key])}
        value={String(form[key])}
        disabled={locked}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </FormField>
  );

  return (
    <div className="space-y-4">
      {conflict && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-red-700">409 Conflict · Cấu hình đã bị thay đổi</h2>
            <p className="mt-1 text-sm text-slate-800">
              Dữ liệu cấu hình đã bị thay đổi bởi quản trị viên khác. Vui lòng tải lại trang để lấy dữ liệu mới nhất.
            </p>
            <p className="mt-2 inline-block rounded-full bg-slate-200 px-4 py-1 text-xs font-semibold text-slate-700">
              Bản đang sửa: v{conflict.yourVersion} · Bản mới nhất: v{conflict.latest.version} · {conflict.latest.updatedBy} lúc{" "}
              {formatTime(conflict.latest.updatedAt)}
            </p>
          </div>
          <Button onClick={reload}>Tải lại dữ liệu</Button>
        </section>
      )}

      {!canEdit && (
        <p className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">Chỉ Quản trị viên được thay đổi cấu hình Hub.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Cấu hình Hub">
          <div className="space-y-4">
            {field("name", "Tên Hub", "cfgName")}
            {field("capacity", "Capacity (sức chứa tối đa)", "cfgCapacity")}
            <FormField label="Operational Status" htmlFor="cfgStatus">
              <select
                id="cfgStatus"
                className={inputClass()}
                disabled={locked}
                value={form.operationalStatus}
                onChange={(e) => set("operationalStatus", e.target.value as HubOperationalStatus)}
              >
                <option value={HubOperationalStatus.AVAILABLE}>Available</option>
                <option value={HubOperationalStatus.MAINTENANCE}>Maintenance</option>
                <option value={HubOperationalStatus.UNAVAILABLE}>Unavailable</option>
              </select>
            </FormField>
            <div>
              <p className="mb-1 text-xs text-slate-500">Bật / tắt Hub khỏi vận hành</p>
              <label className="inline-flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  role="switch"
                  className="peer sr-only"
                  checked={enabled}
                  disabled={locked}
                  onChange={(e) =>
                    set("operationalStatus", e.target.checked ? HubOperationalStatus.AVAILABLE : HubOperationalStatus.UNAVAILABLE)
                  }
                />
                <span className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-emerald-500 peer-checked:after:translate-x-5 peer-disabled:opacity-50" />
                <span className="text-sm font-semibold">{enabled ? "Đang bật" : "Đã tắt"}</span>
              </label>
            </div>
          </div>
        </Card>

        <Card title={conflict ? "Cấu hình ngưỡng (khóa chờ tải lại)" : "Cấu hình ngưỡng"}>
          <div className="space-y-4">
            {field("overload", "Overload Threshold (ngưỡng quá tải)", "cfgOverload")}
            {field("parkingWarning", "Parking Warning Threshold (ngưỡng cảnh báo chỗ đỗ)", "cfgWarning")}
            {field("minAvailableVehicles", "Minimum Available Vehicles (số xe khả dụng tối thiểu)", "cfgMinVehicles")}
            {field("chargingOverload", "Charging Overload Threshold (ngưỡng quá tải cổng sạc)", "cfgChargingOverload")}
          </div>
        </Card>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-5 py-3">
        <div className="text-sm">
          {conflict ? (
            <p className="text-slate-700">Giao dịch đã được hoàn tác. Lưu thay đổi bị khóa cho đến khi tải lại dữ liệu.</p>
          ) : (
            <>
              <p className="font-medium text-slate-800">
                Cập nhật lần cuối bởi: {hub.updatedBy} — {formatDateTime(hub.updatedAt)}
              </p>
              <p className="text-xs text-slate-500">Phiên bản bản ghi: v{editVersion} (dùng để phát hiện xung đột khi lưu)</p>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={reload} disabled={!canEdit}>
            Hủy
          </Button>
          <Button onClick={save} disabled={locked}>
            Lưu thay đổi
          </Button>
        </div>
      </section>

      {canEdit && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3">
          <div className="text-sm">
            <p className="font-semibold text-red-800">Vùng nguy hiểm</p>
            <p className="text-slate-700">
              Xóa vĩnh viễn Hub này cùng toàn bộ chỗ đỗ và cổng sạc. Chỉ xóa được khi Hub đã trống (không còn xe, lịch đặt, phiếu sự cố).
            </p>
          </div>
          <Button variant="danger" onClick={askDeleteHub}>
            Xóa Hub
          </Button>
        </section>
      )}

      {deleting && (
        <ConfirmDeleteModal
          title="Xóa Hub"
          label={deleting.label}
          confirmCode={deleting.code}
          consequences={deleting.consequences}
          retained={deleting.retained}
          onConfirm={confirmDeleteHub}
          onClose={() => setDeleting(null)}
        />
      )}
      <BlockedModal info={blocked} onClose={() => setBlocked(null)} />
    </div>
  );
}

// Tab "Cấu hình" (UC19): thông tin Hub, ngưỡng, bật/tắt, khoá lạc quan (409).
export function HubConfigTab() {
  const { hubId = "" } = useParams();
  const hub = useStore((s) => s.hubs.find((h) => h.hubId === hubId));
  if (!hub) return null;
  // key theo hubId để đổi Hub là form được khởi tạo lại.
  return <ConfigForm key={hub.hubId} hub={hub} />;
}
