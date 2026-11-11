import { useStore } from "../store";
import type { Vehicle } from "../types";

// ===== M2 sở hữu file này. Mới có getVehicleStatus (đã chạy được); M2 bổ sung UC01-UC02. =====

export const VehicleService = {
  getVehicleStatus(vehicleId: string): Vehicle | undefined {
    return useStore.getState().vehicles.find((v) => v.vehicleId === vehicleId);
  },
};
