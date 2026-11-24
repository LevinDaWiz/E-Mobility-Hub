import { useShallow } from "zustand/react/shallow";
import { useStore } from "../store";
import { computeHubStats, type HubStats } from "../utils/hubStats";

// Hook thống kê Hub. useShallow bắt buộc vì selector trả về object mới mỗi lần
// (không dùng sẽ gây render lặp vô hạn với Zustand v5).
export function useHubStats(hubId: string): HubStats {
  return useStore(useShallow((s) => computeHubStats(s, hubId)));
}
