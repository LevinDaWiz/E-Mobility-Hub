import { IOT_RANDOM_FAULT_PROB } from "../config/constants";
import { useStore } from "../store";
import {
  PortStatus,
  VehicleStatus,
  type IoTDataAdapter,
  type StateListener,
  type StateUpdate,
} from "../types";

// ===== M1 sở hữu (UC22): bộ giả lập dữ liệu IoT =====
// Phát StateUpdate định kỳ (pin xe đang đi giảm dần, tuỳ chọn lỗi ngẫu nhiên). Xe đang CHARGING
// do M3 (ChargingService) cập nhật pin theo phiên sạc nên bộ giả lập không đụng tới.

const SOURCE_ID = "iot-simulator";

class IoTSimulator implements IoTDataAdapter {
  private listeners = new Set<StateListener>();
  private lastEmitAt: number | null = null;

  subscribe(listener: StateListener): void {
    this.listeners.add(listener);
  }

  unsubscribe(listener: StateListener): void {
    this.listeners.delete(listener);
  }

  // Gửi một bản ghi tới mọi listener (dùng cho gây lỗi thủ công / bản ghi sai khi demo).
  emit(update: StateUpdate): void {
    this.listeners.forEach((l) => l.onStateUpdate(update));
  }

  // Tính các cập nhật phát sinh từ lần phát trước tới thời điểm mô phỏng hiện tại.
  async fetchLatestState(): Promise<StateUpdate[]> {
    const { vehicles, chargingPorts, clock, iot, settings } = useStore.getState();
    const now = clock.now;
    const elapsedMin = this.lastEmitAt === null ? 0 : Math.max(0, now - this.lastEmitAt) / 60_000;
    this.lastEmitAt = now;
    const timestamp = new Date(now).toISOString();
    const updates: StateUpdate[] = [];

    for (const v of vehicles) {
      if (v.status === VehicleStatus.IN_USE && elapsedMin > 0 && v.batteryLevel > 0) {
        const next = Math.max(0, Math.round((v.batteryLevel - settings.iotDrainPctPerMin * elapsedMin) * 100) / 100);
        updates.push({ sourceId: SOURCE_ID, timestamp, payload: { entity: "vehicle", id: v.vehicleId, batteryLevel: next } });
      }
      if (iot.randomFaults && v.status === VehicleStatus.AVAILABLE && Math.random() < IOT_RANDOM_FAULT_PROB) {
        updates.push({ sourceId: SOURCE_ID, timestamp, payload: { entity: "vehicle", id: v.vehicleId, status: VehicleStatus.FAULTY } });
      }
    }
    if (iot.randomFaults) {
      for (const p of chargingPorts) {
        if (p.status === PortStatus.FREE && Math.random() < IOT_RANDOM_FAULT_PROB) {
          updates.push({ sourceId: SOURCE_ID, timestamp, payload: { entity: "port", id: p.portId, status: PortStatus.FAULTY } });
        }
      }
    }
    return updates;
  }

  // Một chu kỳ: lấy cập nhật mới và phát cho listener.
  async step(): Promise<number> {
    const updates = await this.fetchLatestState();
    updates.forEach((u) => this.emit(u));
    return updates.length;
  }

  // Đặt lại mốc thời gian (khi bật lại hoặc reset) để không bị trừ pin dồn một lần.
  resetClock(): void {
    this.lastEmitAt = null;
  }
}

export const iotSimulator = new IoTSimulator();
export const IOT_SOURCE_ID = SOURCE_ID;
