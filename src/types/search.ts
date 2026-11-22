import type { VehicleType } from "./vehicle";

export interface SearchCriteria {
  hubId: string;
  minBattery: number;
  type: VehicleType;
  nearLocation: string;
}

export type HubNeed = "PARKING" | "CHARGING" | "BOTH";
export type HubSortKey = "DISTANCE" | "FREE_SLOTS" | "CHARGE_WAIT";

export interface HubSearchCriteria {
  need: HubNeed;
  arriveAt: string;
  fromArea: string | null; // Hub.area; null = vị trí hiện tại
  sortBy: HubSortKey;
}
