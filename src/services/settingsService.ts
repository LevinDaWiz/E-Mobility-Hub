import { SETTING_LIMITS, type AppSettings } from "../config/settings";
import { useStore } from "../store";
import { notify } from "./notificationService";

// ===== M1 sở hữu: đọc / kiểm tra / lưu cài đặt hệ thống =====
// Mã nghiệp vụ luôn gọi getSettings() ngay lúc cần (đừng lưu vào biến module) để thấy giá trị mới nhất.

export const getSettings = (): AppSettings => useStore.getState().settings;

// Form nhập bằng chuỗi; đơn vị hiển thị: giây, phút, %, ngày.
export interface SettingsForm {
  vehicleReservationSec: string;
  parkingReservationSec: string;
  overload: string; // "90%" hoặc "90"
  parkingWarning: string;
  minAvailableVehicles: string;
  chargingOverload: string;
  maxPortPowerKw: string;
  metroSurgeMultiplier: string;
  metroPollSec: string;
  iotIntervalSec: string;
  iotDrainPctPerMin: string;
  reportMaxRangeDays: string;
  reportHistoryLimit: string;
}

export type SettingsErrors = Partial<Record<keyof SettingsForm, string>>;

export type SaveSettingsResult = { ok: true; value: AppSettings } | { ok: false; errors: SettingsErrors };

const trimNum = (v: string): string => v.trim().replace(",", ".");

function parseNumber(value: string): number | null {
  const v = trimNum(value);
  // Chỉ nhận số thập phân thường: từ chối 0x10, 1e3, Infinity... (Number() chấp nhận các dạng này).
  if (!/^-?\d+(\.\d+)?$/.test(v)) return null;
  return Number(v);
}

function parseIntStrict(value: string): number | null {
  const v = value.trim();
  return /^-?\d+$/.test(v) ? Number(v) : null;
}

// "90%" hoặc "90" → 0.9; ngoài 0..100 hoặc sai định dạng → null.
function parsePercentValue(value: string): number | null {
  const n = parseNumber(value.trim().replace(/%$/, ""));
  return n === null || n < 0 || n > 100 ? null : Math.round(n * 100) / 10000;
}

const percentText = (ratio: number): string => `${Math.round(ratio * 100)}%`;

export function settingsToForm(s: AppSettings): SettingsForm {
  return {
    vehicleReservationSec: String(Math.round(s.vehicleReservationMs / 1000)),
    parkingReservationSec: String(Math.round(s.parkingReservationMs / 1000)),
    overload: percentText(s.hubThresholds.overload),
    parkingWarning: percentText(s.hubThresholds.parkingWarning),
    minAvailableVehicles: String(s.hubThresholds.minAvailableVehicles),
    chargingOverload: percentText(s.hubThresholds.chargingOverload),
    maxPortPowerKw: String(s.maxPortPowerKw),
    metroSurgeMultiplier: String(s.metroSurgeMultiplier),
    metroPollSec: String(Math.round(s.metroPollMs / 1000)),
    iotIntervalSec: String(Math.round(s.iotIntervalMs / 1000)),
    iotDrainPctPerMin: String(s.iotDrainPctPerMin),
    reportMaxRangeDays: String(s.reportMaxRangeDays),
    reportHistoryLimit: String(s.reportHistoryLimit),
  };
}

const rangeMsg = (min: number, max: number, unit = "") => `Giá trị phải từ ${min} đến ${max}${unit}.`;

// Kiểm tra form; hợp lệ thì trả AppSettings mới, sai thì trả lỗi theo từng ô.
export function parseSettingsForm(form: SettingsForm): SaveSettingsResult {
  const errors: SettingsErrors = {};
  const L = SETTING_LIMITS;

  const intField = (key: keyof SettingsForm, min: number, max: number, unit = ""): number => {
    const n = parseIntStrict(form[key]);
    if (n === null || n < min || n > max) {
      errors[key] = rangeMsg(min, max, unit);
      return min;
    }
    return n;
  };
  const numField = (key: keyof SettingsForm, min: number, max: number, unit = ""): number => {
    const n = parseNumber(form[key]);
    if (n === null || n < min || n > max) {
      errors[key] = rangeMsg(min, max, unit);
      return min;
    }
    return n;
  };
  const percentField = (key: keyof SettingsForm): number => {
    const n = parsePercentValue(form[key]);
    if (n === null) {
      errors[key] = "Giá trị phải từ 0% đến 100%.";
      return 0;
    }
    return n;
  };

  const vehicleSec = intField("vehicleReservationSec", L.reservationSeconds.min, L.reservationSeconds.max, " giây");
  const parkingSec = intField("parkingReservationSec", L.reservationSeconds.min, L.reservationSeconds.max, " giây");

  const overload = percentField("overload");
  const parkingWarning = percentField("parkingWarning");
  if (!errors.overload && !errors.parkingWarning && parkingWarning > overload) {
    errors.parkingWarning = "Ngưỡng cảnh báo phải nhỏ hơn hoặc bằng ngưỡng quá tải.";
  }
  const chargingOverload = percentField("chargingOverload");
  const minAvailableVehicles = intField("minAvailableVehicles", L.minAvailableVehicles.min, L.minAvailableVehicles.max);

  const maxPortPowerKw = numField("maxPortPowerKw", L.maxPortPowerKw.min, L.maxPortPowerKw.max, " kW");

  const metroSurgeMultiplier = numField("metroSurgeMultiplier", L.metroSurgeMultiplier.min, L.metroSurgeMultiplier.max, " lần");
  const metroPollSec = intField("metroPollSec", L.metroPollSeconds.min, L.metroPollSeconds.max, " giây");
  const iotIntervalSec = intField("iotIntervalSec", L.iotIntervalSeconds.min, L.iotIntervalSeconds.max, " giây");
  const iotDrainPctPerMin = numField("iotDrainPctPerMin", L.iotDrainPctPerMin.min, L.iotDrainPctPerMin.max, "% mỗi phút");

  const reportMaxRangeDays = intField("reportMaxRangeDays", L.reportMaxRangeDays.min, L.reportMaxRangeDays.max, " ngày");
  const reportHistoryLimit = intField("reportHistoryLimit", L.reportHistoryLimit.min, L.reportHistoryLimit.max, " báo cáo");

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      vehicleReservationMs: vehicleSec * 1000,
      parkingReservationMs: parkingSec * 1000,
      hubThresholds: { overload, parkingWarning, minAvailableVehicles, chargingOverload },
      maxPortPowerKw,
      metroSurgeMultiplier,
      metroPollMs: metroPollSec * 1000,
      iotIntervalMs: iotIntervalSec * 1000,
      iotDrainPctPerMin,
      reportMaxRangeDays,
      reportHistoryLimit,
    },
  };
}

// Chỉ ADMIN được lưu. Trả lỗi theo ô nếu không hợp lệ.
export function saveSettings(form: SettingsForm): SaveSettingsResult {
  const { currentUser, setSettings } = useStore.getState();
  if (currentUser.role !== "ADMIN") {
    return { ok: false, errors: { vehicleReservationSec: "Chỉ Quản trị viên được thay đổi cài đặt." } };
  }
  const result = parseSettingsForm(form);
  if (!result.ok) return result;
  setSettings(result.value);
  notify("role:ADMIN", "Đã lưu cài đặt hệ thống.", "success");
  return result;
}

export function resetSettingsToDefault(): void {
  const { currentUser, resetSettings } = useStore.getState();
  if (currentUser.role !== "ADMIN") return;
  resetSettings();
  notify("role:ADMIN", "Đã khôi phục cài đặt mặc định.", "info");
}
