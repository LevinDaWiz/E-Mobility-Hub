import type { VehicleType } from "./vehicle";

export interface SearchCriteria {
  hubId: string;
  minBattery: number;
  type: VehicleType;
  nearLocation: string;
}
