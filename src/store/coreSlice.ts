import type { StateCreator } from "zustand";
import type { SeedData } from "../data/seed";
import type {
  AppNotification,
  ChargingPort,
  CurrentUser,
  Hub,
  MetroData,
  Operator,
  ParkingSlot,
  Role,
  Student,
  Vehicle,
} from "../types";
import type { AppState } from "./index";

// ===== M1 sở hữu file này =====

export interface ClockState {
  now: number; // thời điểm mô phỏng (ms epoch)
  speed: number; // hệ số tăng tốc
  running: boolean;
}

// Trạng thái Metro surge (UC21): đang bật thì dữ liệu Metro nhân với multiplier và Hub Metro đầy dần.
export interface MetroSurgeState {
  active: boolean;
  multiplier: number;
  startedAt: string | null;
}

// Trạng thái bộ giả lập IoT (UC22) để hiện trên giao diện.
export interface IotStatus {
  enabled: boolean;
  randomFaults: boolean;
  lastUpdateAt: string | null;
  applied: number;
  rejected: number;
}

export interface CoreSliceData {
  hubs: Hub[];
  parkingSlots: ParkingSlot[];
  chargingPorts: ChargingPort[];
  vehicles: Vehicle[];
  students: Student[];
  operators: Operator[];
  accounts: CurrentUser[];
  currentUser: CurrentUser;
  // Đã đăng nhập qua màn hình SSO giả lập (UC20) hay chưa.
  isAuthenticated: boolean;
  clock: ClockState;
  notifications: AppNotification[];
  metroData: MetroData;
  metroSurge: MetroSurgeState;
  iot: IotStatus;
}

export interface CoreSliceActions {
  // Đăng nhập (đặt người dùng hiện tại + isAuthenticated) / đăng xuất.
  login: (userId: string) => void;
  logout: () => void;

  // Đổi vai trò (chọn tài khoản đầu tiên của vai trò đó) / đổi tài khoản.
  switchRole: (role: Role) => void;
  setCurrentUser: (userId: string) => void;

  updateHub: (hubId: string, patch: Partial<Hub>) => void;
  updateVehicle: (vehicleId: string, patch: Partial<Vehicle>) => void;
  updateParkingSlot: (slotId: string, patch: Partial<ParkingSlot>) => void;
  updateChargingPort: (portId: string, patch: Partial<ChargingPort>) => void;
  addParkingSlot: (slot: ParkingSlot) => void;
  addChargingPort: (port: ChargingPort) => void;

  addNotification: (n: AppNotification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  setMetroData: (data: MetroData) => void;
  setMetroSurge: (state: MetroSurgeState) => void;

  setIotEnabled: (enabled: boolean) => void;
  setIotRandomFaults: (enabled: boolean) => void;
  // Ghi nhận kết quả xử lý một StateUpdate (áp dụng hoặc bị bỏ qua).
  recordIotResult: (applied: boolean, at: string) => void;

  setClockSpeed: (speed: number) => void;
  setClockRunning: (running: boolean) => void;
  advanceClock: (ms: number) => void;
}

export type CoreSlice = CoreSliceData & CoreSliceActions;

export function initialCoreState(seed: SeedData): CoreSliceData {
  return {
    hubs: seed.hubs,
    parkingSlots: seed.parkingSlots,
    chargingPorts: seed.chargingPorts,
    vehicles: seed.vehicles,
    students: seed.students,
    operators: seed.operators,
    accounts: seed.accounts,
    currentUser: seed.accounts.find((a) => a.role === "STUDENT") ?? seed.accounts[0],
    isAuthenticated: false,
    clock: { now: Date.now(), speed: 1, running: true },
    notifications: [],
    metroData: seed.metroData,
    metroSurge: { active: false, multiplier: 1, startedAt: null },
    iot: { enabled: true, randomFaults: false, lastUpdateAt: null, applied: 0, rejected: 0 },
  };
}

export const createCoreSlice: StateCreator<AppState, [], [], CoreSliceActions> = (set) => ({
  login: (userId) =>
    set((s) => {
      const account = s.accounts.find((a) => a.userId === userId);
      return account ? { currentUser: account, isAuthenticated: true } : {};
    }),

  logout: () => set({ isAuthenticated: false }),

  switchRole: (role) =>
    set((s) => {
      if (s.currentUser.role === role) return {};
      const account = s.accounts.find((a) => a.role === role);
      return account ? { currentUser: account } : {};
    }),

  setCurrentUser: (userId) =>
    set((s) => {
      const account = s.accounts.find((a) => a.userId === userId);
      return account ? { currentUser: account } : {};
    }),

  updateHub: (hubId, patch) =>
    set((s) => ({ hubs: s.hubs.map((h) => (h.hubId === hubId ? { ...h, ...patch } : h)) })),

  updateVehicle: (vehicleId, patch) =>
    set((s) => ({
      vehicles: s.vehicles.map((v) => (v.vehicleId === vehicleId ? { ...v, ...patch } : v)),
    })),

  updateParkingSlot: (slotId, patch) =>
    set((s) => ({
      parkingSlots: s.parkingSlots.map((p) => (p.slotId === slotId ? { ...p, ...patch } : p)),
    })),

  updateChargingPort: (portId, patch) =>
    set((s) => ({
      chargingPorts: s.chargingPorts.map((p) => (p.portId === portId ? { ...p, ...patch } : p)),
    })),

  addParkingSlot: (slot) => set((s) => ({ parkingSlots: [...s.parkingSlots, slot] })),
  addChargingPort: (port) => set((s) => ({ chargingPorts: [...s.chargingPorts, port] })),

  addNotification: (n) => set((s) => ({ notifications: [...s.notifications, n] })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllNotificationsRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  setMetroData: (data) => set({ metroData: data }),
  setMetroSurge: (state) => set({ metroSurge: state }),

  setIotEnabled: (enabled) => set((s) => ({ iot: { ...s.iot, enabled } })),
  setIotRandomFaults: (enabled) => set((s) => ({ iot: { ...s.iot, randomFaults: enabled } })),
  recordIotResult: (applied, at) =>
    set((s) => ({
      iot: {
        ...s.iot,
        lastUpdateAt: at,
        applied: s.iot.applied + (applied ? 1 : 0),
        rejected: s.iot.rejected + (applied ? 0 : 1),
      },
    })),

  setClockSpeed: (speed) => set((s) => ({ clock: { ...s.clock, speed } })),
  setClockRunning: (running) => set((s) => ({ clock: { ...s.clock, running } })),
  advanceClock: (ms) => set((s) => ({ clock: { ...s.clock, now: s.clock.now + ms } })),
});
