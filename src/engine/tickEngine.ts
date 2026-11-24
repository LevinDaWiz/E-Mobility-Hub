import { TICK_INTERVAL_MS } from "../config/constants";
import { useStore } from "../store";

// ===== M1 sở hữu: vòng lặp tick duy nhất của ứng dụng =====
// Mỗi 1 giây thật, đồng hồ mô phỏng tiến TICK_INTERVAL_MS * speed, rồi gọi mọi handler.
// Dùng: registerTickHandler("expireVehicleReservations", (now) => { ... });
// Đăng ký trùng tên sẽ ghi đè (an toàn khi hot reload). Handler phải chạy nhanh và idempotent.

export type TickHandler = (now: number) => void;

const handlers = new Map<string, TickHandler>();
let timer: ReturnType<typeof setInterval> | null = null;

export function registerTickHandler(name: string, handler: TickHandler): () => void {
  handlers.set(name, handler);
  return () => {
    if (handlers.get(name) === handler) handlers.delete(name);
  };
}

export function unregisterTickHandler(name: string): void {
  handlers.delete(name);
}

function tick(): void {
  const { clock, advanceClock } = useStore.getState();
  if (!clock.running) return;

  advanceClock(TICK_INTERVAL_MS * clock.speed);
  const now = useStore.getState().clock.now;

  for (const [name, handler] of handlers) {
    try {
      handler(now);
    } catch (error) {
      // Một handler lỗi không được làm hỏng các handler khác.
      console.error(`[tickEngine] handler "${name}" lỗi:`, error);
    }
  }
}

export function startTickEngine(): void {
  if (timer !== null) return;
  timer = setInterval(tick, TICK_INTERVAL_MS);
}

export function stopTickEngine(): void {
  if (timer === null) return;
  clearInterval(timer);
  timer = null;
}
