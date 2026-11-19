import { useStore } from "../store";
import { SlotKind, SlotStatus } from "../types";

// ===== M3 sở hữu file này. STUB tối thiểu để M2 gọi từ UC06 (trả xe); M3 mở rộng/thay thế. =====
// Slot MAINTENANCE / RESERVED không được coi là trống.

export const ParkingService = {
  hasFreeSlot(hubId: string): boolean {
    return useStore.getState().parkingSlots.some((s) => s.hubId === hubId && s.status === SlotStatus.FREE);
  },

  // Chiếm một slot trống; trả slotId, hoặc null nếu Hub đầy. Truyền vehicleId (xe dùng chung) để trang
  // Hub & chỗ đỗ hiện đúng xe đang đỗ; khi đó ưu tiên slot loại SHARED.
  occupySlot(hubId: string, vehicleId?: string): string | null {
    const store = useStore.getState();
    const free = store.parkingSlots.filter((s) => s.hubId === hubId && s.status === SlotStatus.FREE);
    const slot = (vehicleId ? free.find((s) => s.kind === SlotKind.SHARED) : undefined) ?? free[0];
    if (!slot) return null;
    store.updateParkingSlot(slot.slotId, { status: SlotStatus.OCCUPIED, vehicleId: vehicleId ?? null });
    return slot.slotId;
  },

  // Giải phóng slot khi xe rời Hub: đúng slot của vehicleId nếu có, nếu không lấy slot không gắn xe.
  releaseSlot(hubId: string, vehicleId?: string): boolean {
    const store = useStore.getState();
    const occupied = store.parkingSlots.filter((s) => s.hubId === hubId && s.status === SlotStatus.OCCUPIED);
    const slot = vehicleId
      ? occupied.find((s) => s.vehicleId === vehicleId)
      : (occupied.find((s) => s.vehicleId === null) ?? occupied[0]);
    if (!slot) return false;
    store.updateParkingSlot(slot.slotId, { status: SlotStatus.FREE, vehicleId: null });
    return true;
  },
};
