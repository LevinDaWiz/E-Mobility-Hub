import { useStore } from "../store";
import { SlotStatus } from "../types";

// ===== M3 sở hữu file này. STUB tối thiểu để M2 gọi từ UC06 (trả xe); M3 mở rộng/thay thế. =====

export const ParkingService = {
  hasFreeSlot(hubId: string): boolean {
    return useStore.getState().parkingSlots.some((s) => s.hubId === hubId && s.status === SlotStatus.FREE);
  },

  // Chiếm một slot trống; trả slotId, hoặc null nếu Hub đầy.
  occupySlot(hubId: string): string | null {
    const store = useStore.getState();
    const slot = store.parkingSlots.find((s) => s.hubId === hubId && s.status === SlotStatus.FREE);
    if (!slot) return null;
    store.updateParkingSlot(slot.slotId, { status: SlotStatus.OCCUPIED });
    return slot.slotId;
  },

  // Giải phóng một slot đang OCCUPIED của Hub (khi xe rời Hub).
  releaseSlot(hubId: string): boolean {
    const store = useStore.getState();
    const slot = store.parkingSlots.find((s) => s.hubId === hubId && s.status === SlotStatus.OCCUPIED);
    if (!slot) return false;
    store.updateParkingSlot(slot.slotId, { status: SlotStatus.FREE });
    return true;
  },
};
