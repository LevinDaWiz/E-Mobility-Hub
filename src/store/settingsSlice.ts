import type { StateCreator } from "zustand";
import { DEFAULT_SETTINGS, type AppSettings } from "../config/settings";
import type { AppState } from "./index";

// ===== M1 sở hữu file này: cài đặt hệ thống (xem config/settings.ts) =====

export interface SettingsSliceData {
  settings: AppSettings;
}

export interface SettingsSliceActions {
  setSettings: (settings: AppSettings) => void;
  resetSettings: () => void;
}

export type SettingsSlice = SettingsSliceData & SettingsSliceActions;

export function initialSettingsState(): SettingsSliceData {
  return { settings: { ...DEFAULT_SETTINGS, hubThresholds: { ...DEFAULT_SETTINGS.hubThresholds } } };
}

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSliceActions> = (set) => ({
  setSettings: (settings) => set({ settings }),
  resetSettings: () => set(initialSettingsState()),
});
