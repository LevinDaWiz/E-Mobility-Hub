import { useState } from "react";
import { Button, Card, FormField, Modal } from "../../../components/ui";
import { SETTING_LIMITS } from "../../../config/settings";
import {
  resetSettingsToDefault,
  saveSettings,
  settingsToForm,
  type SettingsErrors,
  type SettingsForm,
} from "../../../services/settingsService";
import { useStore } from "../../../store";
import { inputClass } from "../../../styles/formClasses";

interface FieldDef {
  key: keyof SettingsForm;
  label: string;
  hint?: string;
}

const L = SETTING_LIMITS;
const range = (min: number, max: number, unit: string) => `Từ ${min} đến ${max} ${unit}`;

const SECTIONS: { title: string; note?: string; fields: FieldDef[] }[] = [
  {
    title: "Giữ chỗ",
    note: "Áp dụng cho các lượt đặt MỚI. Lượt đang giữ vẫn hết hạn theo thời hạn lúc đặt. Thời gian tính theo đồng hồ mô phỏng.",
    fields: [
      { key: "vehicleReservationSec", label: "Thời hạn giữ xe (giây)", hint: range(L.reservationSeconds.min, L.reservationSeconds.max, "giây") },
      { key: "parkingReservationSec", label: "Thời hạn giữ chỗ đỗ (giây)", hint: range(L.reservationSeconds.min, L.reservationSeconds.max, "giây") },
    ],
  },
  {
    title: "Ngưỡng mặc định cho Hub mới",
    note: "Chỉ áp dụng khi tạo Hub mới. Hub đã có giữ ngưỡng riêng (chỉnh ở tab Cấu hình của từng Hub).",
    fields: [
      { key: "overload", label: "Ngưỡng quá tải chỗ đỗ", hint: "Từ 0% đến 100%" },
      { key: "parkingWarning", label: "Ngưỡng cảnh báo chỗ đỗ", hint: "Không lớn hơn ngưỡng quá tải" },
      { key: "minAvailableVehicles", label: "Số xe khả dụng tối thiểu", hint: range(L.minAvailableVehicles.min, L.minAvailableVehicles.max, "xe") },
      { key: "chargingOverload", label: "Ngưỡng quá tải cổng sạc", hint: "Từ 0% đến 100%" },
    ],
  },
  {
    title: "Cổng sạc",
    note: "Áp dụng khi thêm hoặc sửa cổng sạc; cổng đã có không bị thay đổi.",
    fields: [{ key: "maxPortPowerKw", label: "Công suất tối đa cho phép (kW)", hint: range(L.maxPortPowerKw.min, L.maxPortPowerKw.max, "kW") }],
  },
  {
    title: "Dữ liệu ngoài (mô phỏng)",
    note: "Hệ số Metro surge chỉ dùng cho lần bật surge kế tiếp. Các chu kỳ tính theo giờ mô phỏng.",
    fields: [
      { key: "metroSurgeMultiplier", label: "Hệ số Metro surge (lần)", hint: range(L.metroSurgeMultiplier.min, L.metroSurgeMultiplier.max, "lần") },
      { key: "metroPollSec", label: "Chu kỳ lấy dữ liệu Metro (giây)", hint: range(L.metroPollSeconds.min, L.metroPollSeconds.max, "giây") },
      { key: "iotIntervalSec", label: "Chu kỳ IoT phát dữ liệu (giây)", hint: range(L.iotIntervalSeconds.min, L.iotIntervalSeconds.max, "giây") },
      { key: "iotDrainPctPerMin", label: "Tốc độ giảm pin xe đang đi (% / phút)", hint: range(L.iotDrainPctPerMin.min, L.iotDrainPctPerMin.max, "% mỗi phút") },
    ],
  },
  {
    title: "Báo cáo",
    fields: [
      { key: "reportMaxRangeDays", label: "Khoảng thời gian tối đa (ngày)", hint: range(L.reportMaxRangeDays.min, L.reportMaxRangeDays.max, "ngày") },
      { key: "reportHistoryLimit", label: "Số báo cáo lưu lại", hint: range(L.reportHistoryLimit.min, L.reportHistoryLimit.max, "báo cáo") },
    ],
  },
];

// Cài đặt hệ thống chung (ADMIN chỉnh, vai trò khác chỉ xem). Giá trị lưu ở store (settings) và được mã nghiệp vụ
// đọc qua getSettings() nên có hiệu lực ngay cho các thao tác mới.
export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const canEdit = useStore((s) => s.currentUser.role === "ADMIN");

  const [form, setForm] = useState<SettingsForm>(() => settingsToForm(settings));
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const set = (key: keyof SettingsForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    const result = saveSettings(form);
    if (result.ok) {
      setErrors({});
      setForm(settingsToForm(result.value));
      setSaved(true);
    } else {
      setErrors(result.errors);
      setSaved(false);
    }
  };

  const discard = () => {
    setForm(settingsToForm(useStore.getState().settings));
    setErrors({});
    setSaved(false);
  };

  const reset = () => {
    resetSettingsToDefault();
    setForm(settingsToForm(useStore.getState().settings));
    setErrors({});
    setSaved(false);
    setConfirmReset(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-brand-950">Cài đặt</h1>
        <p className="mt-1 text-sm text-slate-500">Tuỳ chọn hệ thống dùng chung cho các module.</p>
      </div>

      {!canEdit && (
        <p className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">Chỉ Quản trị viên được thay đổi cài đặt hệ thống.</p>
      )}
      {saved && (
        <p role="status" className="rounded-md bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
          Đã lưu cài đặt.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={section.title} title={section.title}>
            {section.note && <p className="mb-3 text-xs text-slate-500">{section.note}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((f) => (
                <FormField key={f.key} label={f.label} htmlFor={`set-${f.key}`} error={errors[f.key]} hint={f.hint}>
                  <input
                    id={`set-${f.key}`}
                    className={inputClass(!!errors[f.key])}
                    value={form[f.key]}
                    disabled={!canEdit}
                    inputMode="decimal"
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                </FormField>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save}>Lưu cài đặt</Button>
          <Button variant="secondary" onClick={discard}>
            Hủy thay đổi
          </Button>
          <Button variant="ghost" onClick={() => setConfirmReset(true)}>
            Khôi phục mặc định
          </Button>
        </div>
      )}

      <Modal
        open={confirmReset}
        title="Khôi phục cài đặt mặc định?"
        onClose={() => setConfirmReset(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Quay lại
            </Button>
            <Button variant="danger" onClick={reset}>
              Khôi phục
            </Button>
          </>
        }
      >
        Mọi giá trị trong trang này sẽ trở về mặc định. Dữ liệu Hub, xe và lượt đặt không bị ảnh hưởng.
      </Modal>
    </div>
  );
}
