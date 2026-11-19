import { METRO_HOURLY_BASELINE } from "../data/metroBaseline";
import { METRO_SURGE_MULTIPLIER } from "../config/constants";
import { useStore } from "../store";
import { AlertSeverity, HubType, SlotStatus, type MetroAdapter, type MetroData } from "../types";
import { getSimNow, simNowIso } from "../utils/time";
import { OperationsService } from "./operationsService";
import { notify } from "./notificationService";

// ===== M1 sở hữu (UC21): dữ liệu Metro + Metro surge =====

const HOUR_MS = 3_600_000;
const HOURS_AHEAD = 6;

// Adapter giả lập: lượng khách theo giờ hard-code, nhân hệ số khi đang surge.
// Thay bằng adapter gọi API Metro thật khi có.
export const mockMetroAdapter: MetroAdapter = {
  async fetchMetroData(): Promise<MetroData> {
    const { metroSurge } = useStore.getState();
    const multiplier = metroSurge.active ? metroSurge.multiplier : 1;
    const hourStart = Math.floor(getSimNow() / HOUR_MS) * HOUR_MS;

    const arrivals: Record<string, number> = {};
    for (let i = 0; i < HOURS_AHEAD; i++) {
      const at = hourStart + i * HOUR_MS;
      arrivals[new Date(at).toISOString()] = Math.round(METRO_HOURLY_BASELINE[new Date(at).getHours()] * multiplier);
    }
    return { arrivals };
  },
};

// Kiểm tra dữ liệu Metro; trả về lý do lỗi, hoặc null nếu hợp lệ.
export function validateMetroData(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return "không phải đối tượng";
  const arrivals = (data as { arrivals?: unknown }).arrivals;
  if (typeof arrivals !== "object" || arrivals === null || Array.isArray(arrivals)) return "thiếu trường arrivals";

  const entries = Object.entries(arrivals as Record<string, unknown>);
  if (entries.length === 0) return "arrivals rỗng";
  for (const [time, count] of entries) {
    if (Number.isNaN(new Date(time).getTime())) return `thời điểm không hợp lệ (${time})`;
    if (typeof count !== "number" || !Number.isFinite(count) || count < 0) return `số lượt đến không hợp lệ tại ${time}`;
  }
  return null;
}

// Nhận dữ liệu Metro: hợp lệ thì ghi vào store, sai thì bỏ qua và cảnh báo vận hành.
export function ingestMetroData(data: unknown): boolean {
  const error = validateMetroData(data);
  if (error) {
    console.warn("[metro] dữ liệu không hợp lệ:", error);
    notify("role:OPERATOR", `Dữ liệu Metro không hợp lệ (${error}) – đã bỏ qua`, "warning");
    return false;
  }
  useStore.getState().setMetroData(data as MetroData);
  return true;
}

export async function refreshMetroData(): Promise<boolean> {
  return ingestMetroData(await mockMetroAdapter.fetchMetroData());
}

export interface MetroFlowSummary {
  current: number; // lượt đến trong giờ hiện tại
  peak: number;
  series: { at: string; count: number }[];
}

export function getMetroFlow(): MetroFlowSummary {
  const { metroData, clock } = useStore.getState();
  const hourStart = Math.floor(clock.now / HOUR_MS) * HOUR_MS;
  const series = Object.entries(metroData.arrivals)
    .map(([at, count]) => ({ at, count }))
    .sort((a, b) => a.at.localeCompare(b.at));
  const current = metroData.arrivals[new Date(hourStart).toISOString()] ?? 0;
  return { current, peak: series.reduce((max, p) => Math.max(max, p.count), 0), series };
}

function metroHubs() {
  return useStore.getState().hubs.filter((h) => h.type === HubType.METRO);
}

// Bật Metro surge: dữ liệu Metro ×multiplier, Hub Metro đầy dần (xem engine/m1Handlers), cảnh báo vận hành.
export async function startMetroSurge(multiplier: number = METRO_SURGE_MULTIPLIER): Promise<boolean> {
  const store = useStore.getState();
  if (store.metroSurge.active) return false;

  store.setMetroSurge({ active: true, multiplier, startedAt: simNowIso() });
  await refreshMetroData();

  for (const hub of metroHubs()) {
    OperationsService.raiseAlert(hub.hubId, "METRO_SURGE", AlertSeverity.WARNING);
  }
  notify("role:OPERATOR", `Metro surge: lượng khách tăng ×${multiplier}, các Hub Metro đang đông dần`, "warning");
  notify("role:STUDENT", "Ga Metro đang rất đông, chỗ đỗ tại Hub Metro có thể hết chỗ", "info");
  return true;
}

export async function endMetroSurge(): Promise<boolean> {
  const store = useStore.getState();
  if (!store.metroSurge.active) return false;

  store.setMetroSurge({ active: false, multiplier: 1, startedAt: null });
  await refreshMetroData();
  notify("role:OPERATOR", "Metro surge đã kết thúc, lượng khách trở lại bình thường", "success");
  return true;
}

// Mỗi chu kỳ surge: mỗi Hub Metro có thêm một chỗ đỗ bị xe của khách Metro chiếm.
export function fillMetroHubsOneSlot(): number {
  const { hubs, parkingSlots, updateParkingSlot } = useStore.getState();
  let filled = 0;
  for (const hub of hubs.filter((h) => h.type === HubType.METRO)) {
    const slot = parkingSlots.find((s) => s.hubId === hub.hubId && s.status === SlotStatus.FREE);
    if (slot) {
      updateParkingSlot(slot.slotId, { status: SlotStatus.OCCUPIED });
      filled++;
    }
  }
  return filled;
}
