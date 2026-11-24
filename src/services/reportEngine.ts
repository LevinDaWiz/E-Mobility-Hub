import { REPORT_HISTORY_DAYS, REPORT_MAX_RANGE_DAYS } from "../config/constants";
import {
  HubType,
  VehicleType,
  type BarItem,
  type ChartPoint,
  type HeatCell,
  type ReportData,
  type ReportFilters,
  type ReportKpi,
  type ReportTopic,
} from "../types";

// ===== M1 sở hữu (UC17): bộ tạo dữ liệu báo cáo =====
// Hàm thuần (không đụng store): nhận danh sách Hub + bộ lọc, trả ReportData. Dữ liệu lịch sử là DỮ LIỆU MẪU
// sinh xác định (cùng Hub + cùng ngày luôn ra cùng số) theo quy mô Hub, thay cho cơ sở dữ liệu thật.
// Riêng NGÀY HÔM NAY (giờ mô phỏng) có thể được ghi đè bằng số liệu thật từ store qua input.live
// (xem services/reportLiveData.ts); engine này vẫn không tự đọc store.

export interface HubInfo {
  hubId: string;
  name: string;
  area: string;
  type: HubType;
  parkingCapacity: number;
}

export type ReportErrorCode = "INSUFFICIENT_DATA" | "NO_HUB" | "FAILED";

export class ReportError extends Error {
  code: ReportErrorCode;
  constructor(code: ReportErrorCode, message: string) {
    super(message);
    this.name = "ReportError";
    this.code = code;
  }
}

export const TOPIC_TITLES: Record<ReportTopic, string> = {
  MOVEMENT: "Ma trận di chuyển",
  ENERGY: "Điện năng & chu kỳ pin",
  PERFORMANCE: "Hiệu suất chỗ đỗ & cổng sạc",
  SERVICE_QUALITY: "Chất lượng dịch vụ",
};

export const TOPIC_DESCRIPTIONS: Record<ReportTopic, string> = {
  MOVEMENT: "Di chuyển giữa các trường, KTX và Metro",
  ENERGY: "Điện năng tiêu thụ, phiên sạc và mức pin",
  PERFORMANCE: "Mức lấp đầy chỗ đỗ, hàng chờ và công suất cổng sạc",
  SERVICE_QUALITY: "Tỷ lệ đáp ứng, thời gian chờ và nhu cầu chưa được phục vụ",
};

// Tên không dấu dùng cho tên file: BaoCao_ChatLuongDichVu_092026.pdf
export const TOPIC_FILE_NAMES: Record<ReportTopic, string> = {
  MOVEMENT: "MaTranDiChuyen",
  ENERGY: "DienNangChuKyPin",
  PERFORMANCE: "HieuSuatChoDoCongSac",
  SERVICE_QUALITY: "ChatLuongDichVu",
};

export const VEHICLE_LABELS: Record<string, string> = {
  ALL: "All",
  [VehicleType.E_BIKE]: "E-bike",
  [VehicleType.E_MOTORBIKE]: "E-motorbike",
};

export const LEVEL_LABELS = ["Low", "Medium", "High", "Very High"] as const;

// ---------- ngày tháng (theo giờ địa phương) ----------

const pad = (n: number) => String(n).padStart(2, "0");

export const dateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

// Số ngày giữa hai mốc (b - a).
export const diffDays = (a: string, b: string): number =>
  Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000);

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

export const formatDayMonth = (key: string): string => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
export const formatDateVi = (key: string): string => `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;

// ---------- kiểm tra bộ lọc ----------

export interface FilterErrors {
  from?: string;
  to?: string;
}

export function validateFilters(
  filters: ReportFilters,
  today: string,
  maxRangeDays: number = REPORT_MAX_RANGE_DAYS,
): FilterErrors {
  const errors: FilterErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.from)) errors.from = "Chọn ngày bắt đầu.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.to)) errors.to = "Chọn ngày kết thúc.";
  if (errors.from || errors.to) return errors;

  if (filters.from > filters.to) errors.from = "Ngày bắt đầu phải trước ngày kết thúc.";
  else if (diffDays(filters.from, filters.to) + 1 > maxRangeDays) {
    errors.to = `Khoảng thời gian tối đa ${maxRangeDays} ngày.`;
  }
  if (!errors.to && filters.to > today) errors.to = "Không thể chọn ngày trong tương lai.";
  return errors;
}

// ---------- số ngẫu nhiên xác định ----------

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (r: number) => `${(r * 100).toFixed(1)}%`;

// ---------- mô hình dữ liệu mẫu ----------

const TYPE_FACTOR: Record<HubType, number> = {
  [HubType.METRO]: 12,
  [HubType.DORM]: 8,
  [HubType.CAMPUS]: 9,
  [HubType.SERVICE]: 2,
};
const TYPE_OCCUPANCY_BIAS: Record<HubType, number> = {
  [HubType.METRO]: 0.18,
  [HubType.DORM]: 0.05,
  [HubType.CAMPUS]: 0.03,
  [HubType.SERVICE]: -0.2,
};
const DOW_FACTOR = [0.62, 1.05, 1.1, 1.08, 1.12, 1.0, 0.65]; // CN..T7
const VEHICLE_SHARE: Record<string, number> = { ALL: 1, [VehicleType.E_BIKE]: 0.6, [VehicleType.E_MOTORBIKE]: 0.4 };

export interface Fact {
  date: string;
  weekend: boolean;
  requests: number;
  booking: number;
  bookingOk: number;
  charge: number;
  chargeOk: number;
  waitMin: number;
  trips: number;
  energyKwh: number;
  sessions: number;
  startBatt: number;
  endBatt: number;
  chargeMin: number;
  occupancy: number; // 0..1
  portUtil: number; // 0..1
  overloads: number;
  portFaults: number;
}

function makeFact(hub: HubInfo, date: string, vehicle: string): Fact {
  const d = parseDateKey(date);
  const r = mulberry32(hashString(`${hub.hubId}|${date}`));
  const load = DOW_FACTOR[d.getDay()] * (0.82 + r() * 0.36);

  const requests = Math.round(hub.parkingCapacity * TYPE_FACTOR[hub.type] * load * VEHICLE_SHARE[vehicle]);
  const occupancy = clamp(0.25 + 0.42 * load + TYPE_OCCUPANCY_BIAS[hub.type] + (r() - 0.5) * 0.06, 0.15, 1);
  const portUtil = clamp(occupancy * 0.85 + (r() - 0.5) * 0.1, 0.1, 1);

  const booking = Math.round(requests * 0.7);
  const charge = requests - booking;
  const bookingRate = clamp(0.985 - (0.12 * Math.max(0, occupancy - 0.65)) / 0.35 - r() * 0.02, 0.8, 0.995);
  const chargeRate = clamp(0.97 - (0.14 * Math.max(0, portUtil - 0.55)) / 0.45 - r() * 0.03, 0.75, 0.99);
  const chargeOk = Math.round(charge * chargeRate);

  const bikeShare = vehicle === VehicleType.E_BIKE ? 1 : vehicle === VehicleType.E_MOTORBIKE ? 0 : 0.6;
  const kwhPerSession = 1.1 * bikeShare + 2.4 * (1 - bikeShare);

  return {
    date,
    weekend: d.getDay() === 0 || d.getDay() === 6,
    requests,
    booking,
    bookingOk: Math.round(booking * bookingRate),
    charge,
    chargeOk,
    waitMin: round1(2 + 6 * occupancy * occupancy + r() * 1.2),
    trips: Math.round(requests * 0.55),
    energyKwh: chargeOk * kwhPerSession * (0.9 + r() * 0.2),
    sessions: chargeOk,
    startBatt: 22 + r() * 10,
    endBatt: 90 + r() * 8,
    chargeMin: Math.round(38 + 26 * r()),
    occupancy,
    portUtil,
    overloads: occupancy > 0.9 ? 1 + Math.floor(r() * 3) : 0,
    portFaults: r() < 0.05 ? 1 : 0,
  };
}

// Phân bố nhu cầu theo giờ (chuẩn hoá tổng = 1), điều chỉnh theo loại Hub.
const HOUR_CURVE = [0.5, 0.3, 0.2, 0.2, 0.4, 1.2, 3.5, 7.5, 8, 5, 3.8, 4.5, 5.5, 4.5, 3.8, 4.2, 5.8, 8.2, 7, 4.5, 3, 2, 1.2, 0.8];

function hourWeights(type: HubType): number[] {
  const boost = (hour: number): number => {
    if (type === HubType.METRO) return (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1.3 : 1;
    if (type === HubType.DORM) return hour >= 17 && hour <= 21 ? 1.3 : hour <= 7 ? 1.1 : 1;
    if (type === HubType.CAMPUS) return hour >= 7 && hour <= 13 ? 1.25 : 1;
    return 1;
  };
  const raw = HOUR_CURVE.map((w, h) => w * boost(h));
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / total);
}

const BANDS: { label: string; from: number; to: number }[] = [
  { label: "07–09h", from: 7, to: 9 },
  { label: "11–13h", from: 11, to: 13 },
  { label: "17–19h", from: 17, to: 19 },
];

const bandShare = (type: HubType, from: number, to: number): number =>
  hourWeights(type).slice(from, to).reduce((a, b) => a + b, 0);

// ---------- tiện ích dựng biểu đồ ----------

interface HubFacts {
  hub: HubInfo;
  facts: Fact[];
}

const sum = (rows: HubFacts[], pick: (f: Fact) => number): number =>
  rows.reduce((total, row) => total + row.facts.reduce((s, f) => s + pick(f), 0), 0);

const avg = (rows: HubFacts[], pick: (f: Fact) => number): number => {
  const count = rows.reduce((n, row) => n + row.facts.length, 0);
  return count === 0 ? 0 : sum(rows, pick) / count;
};

const hubLabel = (hub: HubInfo) => hub.area;

function periodLabel(filters: ReportFilters): string {
  const sameMonth = filters.from.slice(0, 7) === filters.to.slice(0, 7);
  return sameMonth
    ? `Tháng ${filters.from.slice(5, 7)}/${filters.from.slice(0, 4)}`
    : `${formatDateVi(filters.from)} – ${formatDateVi(filters.to)}`;
}

// "sum": cộng các Hub theo ngày; "avg": trung bình các Hub (cho tỷ lệ).
function buildSeries(
  rows: HubFacts[],
  dates: string[],
  pick: (f: Fact, hub: HubInfo) => number,
  mode: "sum" | "avg",
): { byDay: ChartPoint[]; byHour: ChartPoint[] } {
  const byDay: ChartPoint[] = dates.map((date, i) => {
    const values = rows.map((r) => pick(r.facts[i], r.hub));
    const total = values.reduce((a, b) => a + b, 0);
    return {
      label: date.slice(8, 10),
      title: formatDayMonth(date),
      value: mode === "sum" ? Math.round(total) : round1((total / Math.max(1, values.length)) * 100) / 1,
      weekend: rows[0]?.facts[i].weekend ?? false,
    };
  });

  const byHour: ChartPoint[] = Array.from({ length: 24 }, (_, hour) => {
    let value = 0;
    if (mode === "sum") {
      for (const row of rows) {
        const w = hourWeights(row.hub.type)[hour];
        value += row.facts.reduce((s, f) => s + pick(f, row.hub) * w, 0) / Math.max(1, dates.length);
      }
      value = Math.round(value);
    } else {
      // Tỷ lệ theo giờ: giữ trung bình bằng mức trung bình ngày, hình dạng theo đường cong nhu cầu.
      const meanDay = rows.length === 0 ? 0 : (rows.reduce((s, r) => s + r.facts.reduce((a, f) => a + pick(f, r.hub), 0) / Math.max(1, r.facts.length), 0) / rows.length);
      const curve = HOUR_CURVE.map((w) => 0.35 + (0.65 * w) / 8.2);
      const meanCurve = curve.reduce((a, b) => a + b, 0) / 24;
      value = round1(clamp((meanDay * curve[hour]) / meanCurve, 0, 1) * 100);
    }
    return { label: String(hour).padStart(2, "0"), title: `${String(hour).padStart(2, "0")}h`, value };
  });

  return { byDay, byHour };
}

// Mức 0..3 theo tứ phân vị của toàn bộ ô.
function levelsFor(values: number[]): (v: number) => 0 | 1 | 2 | 3 {
  const sorted = [...values].sort((a, b) => a - b);
  return (v) => {
    if (sorted.length <= 1) return 1;
    const rank = sorted.filter((x) => x < v).length / (sorted.length - 1);
    return Math.min(3, Math.floor(rank * 4)) as 0 | 1 | 2 | 3;
  };
}

function buildBandHeatmap(
  rows: HubFacts[],
  bandValue: (row: HubFacts, share: number) => number,
  text: (value: number, level: 0 | 1 | 2 | 3) => string,
): { columns: string[]; rows: { label: string; cells: HeatCell[] }[] } {
  const matrix = BANDS.map((band) => rows.map((row) => bandValue(row, bandShare(row.hub.type, band.from, band.to))));
  const level = levelsFor(matrix.flat());
  return {
    columns: rows.map((r) => hubLabel(r.hub)),
    rows: BANDS.map((band, i) => ({
      label: band.label,
      cells: matrix[i].map((v) => {
        const l = level(v);
        return { text: text(v, l), level: l };
      }),
    })),
  };
}

const bars = (rows: HubFacts[], value: (row: HubFacts) => number): BarItem[] =>
  rows.map((row) => ({ label: hubLabel(row.hub), value: round1(value(row)) }));

const weightedAvg = (row: HubFacts, pick: (f: Fact) => number, weight: (f: Fact) => number): number => {
  const w = row.facts.reduce((s, f) => s + weight(f), 0);
  return w === 0 ? 0 : row.facts.reduce((s, f) => s + pick(f) * weight(f), 0) / w;
};

// ---------- 4 chuyên đề ----------

interface Context {
  rows: HubFacts[];
  all: HubFacts[]; // mọi Hub (dùng cho ma trận di chuyển)
  dates: string[];
  filters: ReportFilters;
  scopeHub: HubInfo | null;
}

function serviceQuality(c: Context) {
  const { rows } = c;
  const requests = sum(rows, (f) => f.requests);
  const booking = sum(rows, (f) => f.booking);
  const charge = sum(rows, (f) => f.charge);
  const bookingRate = booking === 0 ? 0 : sum(rows, (f) => f.bookingOk) / booking;
  const chargeRate = charge === 0 ? 0 : sum(rows, (f) => f.chargeOk) / charge;
  const wait = requests === 0 ? 0 : sum(rows, (f) => f.waitMin * f.requests) / requests;
  const unmetOf = (r: HubFacts) => sum([r], (f) => f.requests - f.bookingOk - f.chargeOk);

  const kpis: ReportKpi[] = [
    { label: "Tổng yêu cầu", value: fmt(requests), sub: "Trong kỳ báo cáo" },
    { label: "Tỷ lệ đáp ứng đặt xe", value: pct(bookingRate), progress: bookingRate },
    { label: "Tỷ lệ đáp ứng sạc", value: pct(chargeRate), progress: chargeRate },
    { label: "Thời gian chờ trung bình", value: `${wait.toFixed(1)} phút`, sub: "Trong kỳ báo cáo" },
  ];
  const { byDay, byHour } = buildSeries(rows, c.dates, (f) => f.requests, "sum");

  return {
    kpis,
    series: { title: "Yêu cầu dịch vụ theo ngày", lineLabel: "Tổng yêu cầu mỗi ngày", unit: "yêu cầu", byDay, byHour },
    hubBars: {
      title: "Nhu cầu theo Hub",
      subtitle: "Số yêu cầu trong kỳ",
      tabs: ["Nhu cầu", "Sử dụng"] as [string, string],
      first: bars(rows, (r) => sum([r], (f) => f.requests)),
      second: bars(rows, (r) => avg([r], (f) => f.occupancy) * 100),
      unitFirst: "yêu cầu",
      unitSecond: "% chỗ đỗ",
    },
    heatmap: {
      title: "Heatmap: Hub × khung giờ",
      subtitle: `Mức độ nhu cầu trong ${periodLabel(c.filters).toLowerCase()}`,
      ...buildBandHeatmap(rows, (r, share) => sum([r], (f) => f.requests) * share, (_v, l) => LEVEL_LABELS[l]),
    },
    table: {
      title: "Tổng hợp theo Hub",
      subtitle: "Đặt xe và Sạc: tỷ lệ đáp ứng · Chờ TB: phút",
      columns: ["Hub", "Yêu cầu", "Đặt xe", "Sạc", "Chờ TB", "Chưa đáp ứng"],
      rows: rows.map((r) => {
        const b = sum([r], (f) => f.booking);
        const ch = sum([r], (f) => f.charge);
        return [
          hubLabel(r.hub),
          fmt(sum([r], (f) => f.requests)),
          pct(b === 0 ? 0 : sum([r], (f) => f.bookingOk) / b),
          pct(ch === 0 ? 0 : sum([r], (f) => f.chargeOk) / ch),
          weightedAvg(r, (f) => f.waitMin, (f) => f.requests).toFixed(1),
          fmt(unmetOf(r)),
        ];
      }),
      total: ["Tổng", fmt(requests), pct(bookingRate), pct(chargeRate), wait.toFixed(1), fmt(rows.reduce((s, r) => s + unmetOf(r), 0))],
    },
  };
}

function energy(c: Context) {
  const { rows } = c;
  const kwh = sum(rows, (f) => f.energyKwh);
  const sessions = sum(rows, (f) => f.sessions);
  const startBatt = sessions === 0 ? 0 : sum(rows, (f) => f.startBatt * f.sessions) / sessions;
  const endBatt = sessions === 0 ? 0 : sum(rows, (f) => f.endBatt * f.sessions) / sessions;
  const minutes = sessions === 0 ? 0 : sum(rows, (f) => f.chargeMin * f.sessions) / sessions;
  const { byDay, byHour } = buildSeries(rows, c.dates, (f) => f.energyKwh, "sum");

  return {
    kpis: [
      { label: "Điện năng tiêu thụ", value: `${fmt(kwh)} kWh`, sub: "Trong kỳ báo cáo" },
      { label: "Số phiên sạc", value: fmt(sessions), sub: `${fmt(sessions / Math.max(1, c.dates.length))} phiên / ngày` },
      { label: "Pin trung bình khi bắt đầu sạc", value: `${startBatt.toFixed(0)}%`, sub: `Khi kết thúc: ${endBatt.toFixed(0)}%`, progress: startBatt / 100 },
      { label: "Thời gian sạc trung bình", value: `${minutes.toFixed(0)} phút`, sub: "Mỗi phiên sạc" },
    ] as ReportKpi[],
    series: { title: "Điện năng tiêu thụ theo ngày", lineLabel: "kWh mỗi ngày", unit: "kWh", byDay, byHour },
    hubBars: {
      title: "Điện năng theo Hub",
      subtitle: "kWh trong kỳ",
      tabs: ["Điện năng", "Phiên sạc"] as [string, string],
      first: bars(rows, (r) => sum([r], (f) => f.energyKwh)),
      second: bars(rows, (r) => sum([r], (f) => f.sessions)),
      unitFirst: "kWh",
      unitSecond: "phiên",
    },
    heatmap: {
      title: "Heatmap: Hub × khung giờ",
      subtitle: `Mức điện năng tiêu thụ trong ${periodLabel(c.filters).toLowerCase()}`,
      ...buildBandHeatmap(rows, (r, share) => sum([r], (f) => f.energyKwh) * share, (_v, l) => LEVEL_LABELS[l]),
    },
    table: {
      title: "Tổng hợp theo Hub",
      subtitle: "Pin: phần trăm trung bình theo phiên · TG sạc: phút",
      columns: ["Hub", "Điện năng (kWh)", "Phiên sạc", "Pin đầu", "Pin cuối", "TG sạc TB"],
      rows: rows.map((r) => [
        hubLabel(r.hub),
        fmt(sum([r], (f) => f.energyKwh)),
        fmt(sum([r], (f) => f.sessions)),
        `${weightedAvg(r, (f) => f.startBatt, (f) => f.sessions).toFixed(0)}%`,
        `${weightedAvg(r, (f) => f.endBatt, (f) => f.sessions).toFixed(0)}%`,
        weightedAvg(r, (f) => f.chargeMin, (f) => f.sessions).toFixed(0),
      ]),
      total: ["Tổng", fmt(kwh), fmt(sessions), `${startBatt.toFixed(0)}%`, `${endBatt.toFixed(0)}%`, minutes.toFixed(0)],
    },
  };
}

function performance(c: Context) {
  const { rows } = c;
  const occ = avg(rows, (f) => f.occupancy);
  const port = avg(rows, (f) => f.portUtil);
  const requests = sum(rows, (f) => f.requests);
  const wait = requests === 0 ? 0 : sum(rows, (f) => f.waitMin * f.requests) / requests;
  const overloads = sum(rows, (f) => f.overloads);
  const { byDay, byHour } = buildSeries(rows, c.dates, (f) => f.occupancy, "avg");

  return {
    kpis: [
      { label: "Mức lấp đầy chỗ đỗ trung bình", value: pct(occ), progress: occ },
      { label: "Công suất sử dụng cổng sạc", value: pct(port), progress: port },
      { label: "Thời gian chờ trung bình", value: `${wait.toFixed(1)} phút`, sub: "Trong kỳ báo cáo" },
      { label: "Số lần quá tải", value: fmt(overloads), sub: "Hub-ngày có mức lấp đầy > 90%" },
    ] as ReportKpi[],
    series: { title: "Mức lấp đầy chỗ đỗ theo ngày", lineLabel: "Lấp đầy trung bình (%)", unit: "%", byDay, byHour },
    hubBars: {
      title: "Hiệu suất theo Hub",
      subtitle: "Mức sử dụng trung bình trong kỳ",
      tabs: ["Chỗ đỗ", "Cổng sạc"] as [string, string],
      first: bars(rows, (r) => avg([r], (f) => f.occupancy) * 100),
      second: bars(rows, (r) => avg([r], (f) => f.portUtil) * 100),
      unitFirst: "%",
      unitSecond: "%",
    },
    heatmap: {
      title: "Heatmap: Hub × khung giờ",
      subtitle: `Mức lấp đầy chỗ đỗ trong ${periodLabel(c.filters).toLowerCase()}`,
      ...buildBandHeatmap(
        rows,
        (r, share) => clamp(avg([r], (f) => f.occupancy) * (0.6 + 2.4 * share), 0, 1),
        (v) => `${Math.round(v * 100)}%`,
      ),
    },
    table: {
      title: "Tổng hợp theo Hub",
      subtitle: "Lấp đầy và sử dụng: trung bình kỳ · Chờ TB: phút",
      columns: ["Hub", "Chỗ đỗ", "Cổng sạc", "Chờ TB", "Quá tải", "Lỗi cổng"],
      rows: rows.map((r) => [
        hubLabel(r.hub),
        pct(avg([r], (f) => f.occupancy)),
        pct(avg([r], (f) => f.portUtil)),
        weightedAvg(r, (f) => f.waitMin, (f) => f.requests).toFixed(1),
        fmt(sum([r], (f) => f.overloads)),
        fmt(sum([r], (f) => f.portFaults)),
      ]),
      total: ["Tổng", pct(occ), pct(port), wait.toFixed(1), fmt(overloads), fmt(sum(rows, (f) => f.portFaults))],
    },
  };
}

// Ma trận O–D: chuyến xuất phát từ mỗi Hub chia cho các Hub đích theo trọng số (loại Hub + quy mô).
const AFFINITY = (a: HubType, b: HubType): number => {
  if (a === HubType.SERVICE || b === HubType.SERVICE) return 0.3;
  if (a === b) return 0.7;
  const pair = [a, b].sort().join("+");
  return pair === `${HubType.DORM}+${HubType.METRO}` ? 1.5 : pair === `${HubType.CAMPUS}+${HubType.METRO}` ? 1.3 : 1.4;
};

// Chia `total` (số nguyên) theo trọng số thành các số nguyên có tổng đúng bằng `total` (phần dư chia cho phần lẻ lớn nhất).
// Làm tròn từng ô riêng sẽ làm mất chuyến khi số chuyến nhỏ (1 chuyến chia nhiều Hub đích → mọi ô thành 0).
function allocate(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || weightSum === 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / weightSum);
  const base = exact.map(Math.floor);
  const remainder = total - base.reduce((a, b) => a + b, 0);
  exact
    .map((value, index) => ({ index, fraction: value - base[index] }))
    .sort((a, b) => b.fraction - a.fraction)
    .slice(0, remainder)
    .forEach(({ index }) => (base[index] += 1));
  return base;
}

function movement(c: Context) {
  const hubs = c.all.map((r) => r.hub);
  const departuresAll = c.all.map((r) => sum([r], (f) => f.trips));
  const flow: number[][] = hubs.map((from, i) => {
    const weights = hubs.map((to, j) => (i === j ? 0 : to.parkingCapacity * AFFINITY(from.type, to.type)));
    return allocate(departuresAll[i], weights);
  });

  // Chỉ giữ các tuyến liên quan tới Hub được chọn (nếu có).
  const scopeIndex = c.scopeHub ? hubs.findIndex((h) => h.hubId === c.scopeHub?.hubId) : -1;
  const keep = (i: number, j: number) => scopeIndex === -1 || i === scopeIndex || j === scopeIndex;
  const shown = flow.map((row, i) => row.map((v, j) => (keep(i, j) ? v : 0)));

  const departures = shown.map((row) => row.reduce((a, b) => a + b, 0));
  const arrivals = hubs.map((_, j) => shown.reduce((s, row) => s + row[j], 0));
  const total = departures.reduce((a, b) => a + b, 0);

  let best = { i: 0, j: 0, v: -1 };
  shown.forEach((row, i) => row.forEach((v, j) => v > best.v && (best = { i, j, v })));
  const busiest = departures.indexOf(Math.max(...departures));

  const level = levelsFor(shown.flat().filter((v) => v > 0));
  const rowsOut = hubs.map((from, i) => ({
    label: hubLabel(from),
    cells: hubs.map((_, j): HeatCell => {
      const v = shown[i][j];
      return i === j || v === 0 ? { text: "—", level: 0 } : { text: fmt(v), level: level(v) };
    }),
  }));

  // Chuỗi theo ngày / giờ: chuyến xuất phát của các Hub trong phạm vi lọc.
  const { byDay, byHour } = buildSeries(c.rows, c.dates, (f) => f.trips, "sum");

  return {
    kpis: [
      { label: "Tổng chuyến đi", value: fmt(total), sub: "Giữa các Hub trong kỳ" },
      { label: "Tuyến phổ biến nhất", value: best.v > 0 ? `${hubLabel(hubs[best.i])} → ${hubLabel(hubs[best.j])}` : "—", sub: best.v > 0 ? `${fmt(best.v)} chuyến` : undefined },
      { label: "Chuyến đi trung bình mỗi ngày", value: fmt(total / Math.max(1, c.dates.length)), sub: "Trong kỳ báo cáo" },
      { label: "Hub xuất phát nhiều nhất", value: total > 0 ? hubLabel(hubs[busiest]) : "—", sub: total > 0 ? `${fmt(departures[busiest])} chuyến` : undefined },
    ] as ReportKpi[],
    series: { title: "Chuyến đi theo ngày", lineLabel: "Chuyến đi mỗi ngày", unit: "chuyến", byDay, byHour },
    hubBars: {
      title: "Chuyến đi theo Hub",
      subtitle: "Số chuyến trong kỳ",
      tabs: ["Xuất phát", "Điểm đến"] as [string, string],
      first: hubs.map((h, i) => ({ label: hubLabel(h), value: departures[i] })),
      second: hubs.map((h, i) => ({ label: hubLabel(h), value: arrivals[i] })),
      unitFirst: "chuyến đi",
      unitSecond: "chuyến đến",
    },
    heatmap: {
      title: "Ma trận O–D: Hub xuất phát × Hub đến",
      subtitle: `Số chuyến trong ${periodLabel(c.filters).toLowerCase()} (hàng: xuất phát, cột: điểm đến)`,
      columns: hubs.map(hubLabel),
      rows: rowsOut,
    },
    table: {
      title: "Tổng hợp theo Hub",
      subtitle: "Chênh lệch = điểm đến − xuất phát (dương: Hub nhận nhiều xe hơn)",
      columns: ["Hub", "Xuất phát", "Điểm đến", "Chênh lệch", "Tuyến chính"],
      rows: hubs.map((h, i) => {
        const top = shown[i].indexOf(Math.max(...shown[i]));
        return [
          hubLabel(h),
          fmt(departures[i]),
          fmt(arrivals[i]),
          `${arrivals[i] - departures[i] > 0 ? "+" : ""}${fmt(arrivals[i] - departures[i])}`,
          departures[i] > 0 ? `→ ${hubLabel(hubs[top])}` : "—",
        ];
      }),
      total: ["Tổng", fmt(total), fmt(total), "0", "—"],
    },
  };
}

const BUILDERS: Record<ReportTopic, (c: Context) => Omit<ReportData, "topic" | "title" | "filters" | "hubLabel" | "vehicleLabel" | "generatedAt">> = {
  SERVICE_QUALITY: (c) => {
    const r = serviceQuality(c);
    return { ...r, series: { ...r.series, subtitle: `${periodLabel(c.filters)} · ${c.scopeHub?.name ?? "All Hubs"}` } };
  },
  ENERGY: (c) => {
    const r = energy(c);
    return { ...r, series: { ...r.series, subtitle: `${periodLabel(c.filters)} · ${c.scopeHub?.name ?? "All Hubs"}` } };
  },
  PERFORMANCE: (c) => {
    const r = performance(c);
    return { ...r, series: { ...r.series, subtitle: `${periodLabel(c.filters)} · ${c.scopeHub?.name ?? "All Hubs"}` } };
  },
  MOVEMENT: (c) => {
    const r = movement(c);
    return { ...r, series: { ...r.series, subtitle: `${periodLabel(c.filters)} · ${c.scopeHub?.name ?? "All Hubs"}` } };
  },
};

export interface BuildReportInput {
  topic: ReportTopic;
  filters: ReportFilters;
  hubs: HubInfo[];
  today: string; // YYYY-MM-DD (ngày mô phỏng)
  generatedAt: string;
  // Số liệu thật của ngày hôm nay theo hubId; trường nào có thì thay giá trị mẫu của ngày đó.
  live?: Record<string, Partial<Fact>>;
}

// Ném ReportError nếu dữ liệu lịch sử không đủ hoặc không có Hub phù hợp.
export function buildReport(input: BuildReportInput): ReportData {
  const { topic, filters, hubs, today, live } = input;

  if (filters.from < addDays(today, -REPORT_HISTORY_DAYS)) {
    throw new ReportError("INSUFFICIENT_DATA", "Dữ liệu lịch sử không đủ cho khoảng thời gian đã chọn.");
  }
  const scopeHub = filters.hubId === "ALL" ? null : (hubs.find((h) => h.hubId === filters.hubId) ?? null);
  if (hubs.length === 0 || (filters.hubId !== "ALL" && !scopeHub)) {
    throw new ReportError("NO_HUB", "Không tìm thấy Hub phù hợp với bộ lọc.");
  }

  const dates = eachDay(filters.from, filters.to);
  const usesLive = !!live && dates.includes(today);
  const toRows = (list: HubInfo[]): HubFacts[] =>
    list.map((hub) => ({
      hub,
      facts: dates.map((d) => {
        const sample = makeFact(hub, d, filters.vehicle);
        const real = d === today ? live?.[hub.hubId] : undefined;
        return real ? { ...sample, ...real } : sample;
      }),
    }));
  const all = toRows(hubs);
  const rows = scopeHub ? all.filter((r) => r.hub.hubId === scopeHub.hubId) : all;

  const body = BUILDERS[topic]({ rows, all, dates, filters, scopeHub });
  return {
    topic,
    title: TOPIC_TITLES[topic],
    filters,
    hubLabel: scopeHub ? scopeHub.name : "All Hubs",
    vehicleLabel: VEHICLE_LABELS[filters.vehicle],
    generatedAt: input.generatedAt,
    liveDate: usesLive ? today : undefined,
    ...body,
  };
}
