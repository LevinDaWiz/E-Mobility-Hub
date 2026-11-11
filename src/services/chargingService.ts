import { useStore } from "../store";
import { RequestStatus, type ChargingRequest } from "../types";
import { makeId } from "../utils/id";

// ===== M3 sở hữu file này. STUB để M2 gọi sau khi trả xe (UC05); M3 thay bằng bản đầy đủ. =====

export const ChargingService = {
  submitChargingRequest(
    input: Pick<ChargingRequest, "vehicleId" | "targetBattery" | "desiredStart" | "deadline">,
  ): ChargingRequest {
    const request: ChargingRequest = {
      requestId: makeId("CR"),
      ...input,
      priority: 0, // TODO(M3): ChargingScheduler.calculatePriority
      status: RequestStatus.PENDING,
    };
    useStore.getState().upsertChargingRequest(request);
    return request;
  },
};
