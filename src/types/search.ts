import type { VehicleType } from "./vehicle";

export interface SearchCriteria {
  hubId: string;
  minBattery: number;
  type: VehicleType;
  nearLocation: string;
}

// UC07: tìm Hub có chỗ đỗ / cổng sạc (ParkingService.findHubsWithCapacity).
export type HubNeed = "PARKING" | "CHARGING" | "BOTH";
export type HubSortKey = "DISTANCE" | "FREE_SLOTS" | "CHARGE_WAIT";

export interface HubSearchCriteria {
  need: HubNeed;
  arriveAt: string; // giờ dự kiến đến Hub (giờ mô phỏng)
  // Khu vực xuất phát (Hub.area) khi không có quyền vị trí (UC07 A1); null = vị trí hiện tại.
  fromArea: string | null;
  sortBy: HubSortKey;
}
