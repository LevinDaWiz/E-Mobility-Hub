import { IOT_INTERVAL_MS, METRO_POLL_INTERVAL_MS, METRO_SURGE_FILL_EVERY_MS } from "../config/constants";
import { applyStateUpdate } from "../services/stateUpdateService";
import { fillMetroHubsOneSlot, refreshMetroData } from "../services/metroService";
import { notify } from "../services/notificationService";
import { useStore } from "../store";
import type { StateListener } from "../types";
import { iotSimulator } from "./iotSimulator";
import { registerTickHandler } from "./tickEngine";

// ===== M1 sở hữu: đăng ký các việc định kỳ của M1 (UC21, UC22) =====
// Gọi một lần khi ứng dụng khởi động (RootLayout). Trả về hàm huỷ đăng ký.

// Mọi StateUpdate từ IoT đi qua đây: kiểm tra → ghi store; sai thì bỏ qua và cảnh báo vận hành.
const pipelineListener: StateListener = {
  onStateUpdate(update) {
    const applied = applyStateUpdate(update);
    useStore.getState().recordIotResult(applied, update.timestamp);
    if (!applied) {
      notify("role:OPERATOR", `Bản ghi IoT không hợp lệ từ "${update.sourceId}" đã bị bỏ qua`, "warning");
    }
  },
};

export function registerM1TickHandlers(): () => void {
  iotSimulator.subscribe(pipelineListener);
  iotSimulator.resetClock();
  void refreshMetroData();

  let lastMetroPoll = useStore.getState().clock.now;
  let lastFill = lastMetroPoll;
  let lastIot = lastMetroPoll;

  const stops = [
    // UC21: lấy dữ liệu Metro định kỳ (đã gồm hệ số surge nếu đang bật).
    registerTickHandler("m1.metroPoll", (now) => {
      if (now - lastMetroPoll < METRO_POLL_INTERVAL_MS) return;
      lastMetroPoll = now;
      void refreshMetroData();
    }),

    // UC21: khi surge, Hub Metro đầy dần.
    registerTickHandler("m1.metroSurgeFill", (now) => {
      if (!useStore.getState().metroSurge.active) return;
      if (now - lastFill < METRO_SURGE_FILL_EVERY_MS) return;
      lastFill = now;
      fillMetroHubsOneSlot();
    }),

    // UC22 + NIFR-02: phát StateUpdate định kỳ khi bộ giả lập đang bật.
    registerTickHandler("m1.iotSimulator", (now) => {
      if (!useStore.getState().iot.enabled) {
        lastIot = now;
        iotSimulator.resetClock();
        return;
      }
      if (now - lastIot < IOT_INTERVAL_MS) return;
      lastIot = now;
      void iotSimulator.step();
    }),
  ];

  return () => {
    stops.forEach((stop) => stop());
    iotSimulator.unsubscribe(pipelineListener);
  };
}
