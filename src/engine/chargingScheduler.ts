import type { ChargingSession } from "../types";

// ===== M3 sở hữu file này. STUB: M4 (UC14/UC15) gọi rescheduleOnConflict. =====

export const ChargingScheduler = {
  // TODO(M3): tìm cổng khác (cùng Hub, rồi Hub khác) cho phiên bị ảnh hưởng.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  rescheduleOnConflict(_sessionId: string): ChargingSession | null {
    return null;
  },
};
