import { useStore } from "../store";
import { RequestStatus, type ChargingRequest } from "../types";
import { makeId } from "../utils/id";
import { simNowIso } from "../utils/time";

// ===== M3 sở hữu file này. STUB để M2 gọi sau khi trả xe (UC05); M3 thay bằng bản đầy đủ. =====

export type ChargingRequestInput = Pick<
  ChargingRequest,
  "vehicleId" | "targetBattery" | "desiredStart" | "deadline" | "hubId" | "studentId"
>;

export const ChargingService = {
  submitChargingRequest(input: ChargingRequestInput): ChargingRequest {
    const request: ChargingRequest = {
      requestId: makeId("CR"),
      ...input,
      priority: 0, // TODO(M3): ChargingScheduler.calculatePriority
      priorityReason: "",
      createdAt: simNowIso(),
      status: RequestStatus.PENDING,
    };
    useStore.getState().upsertChargingRequest(request);
    return request;
  },
};
