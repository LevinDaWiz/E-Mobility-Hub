import { create } from "zustand";
import { createSeed } from "../data/seed";
import { createCoreSlice, initialCoreState, type CoreSlice } from "./coreSlice";
import {
  createParkingChargingSlice,
  initialParkingChargingState,
  type ParkingChargingSlice,
} from "./parkingChargingSlice";
import { createOpsSlice, initialOpsState, type OpsSlice } from "./opsSlice";
import { createReportSlice, initialReportState, type ReportSlice } from "./reportSlice";
import { createSettingsSlice, initialSettingsState, type SettingsSlice } from "./settingsSlice";
import { createVehicleSlice, initialVehicleState, type VehicleSlice } from "./vehicleSlice";

// ===== M1 sở hữu file này (chỉ gộp slice). Mỗi người sửa slice của mình. =====

export type AppState = CoreSlice &
  VehicleSlice &
  ParkingChargingSlice &
  OpsSlice &
  ReportSlice &
  SettingsSlice & {
    // Đưa toàn bộ dữ liệu về seed ban đầu (nút Reset ở Demo panel).
    resetAll: () => void;
  };

function buildInitialData() {
  const seed = createSeed();
  const core = initialCoreState(seed);
  return {
    ...core,
    ...initialVehicleState(seed),
    ...initialParkingChargingState(seed),
    ...initialOpsState(core.clock.now),
    ...initialReportState(),
    ...initialSettingsState(),
  };
}

export const useStore = create<AppState>()((set, get, api) => ({
  ...buildInitialData(),
  ...createCoreSlice(set, get, api),
  ...createVehicleSlice(set, get, api),
  ...createParkingChargingSlice(set, get, api),
  ...createOpsSlice(set, get, api),
  ...createReportSlice(set, get, api),
  ...createSettingsSlice(set, get, api),
  // Reset dữ liệu nhưng giữ nguyên phiên đăng nhập và cài đặt hệ thống (cài đặt có nút "Khôi phục mặc định" riêng).
  resetAll: () =>
    set({
      ...buildInitialData(),
      currentUser: get().currentUser,
      isAuthenticated: get().isAuthenticated,
      settings: get().settings,
    }),
}));
