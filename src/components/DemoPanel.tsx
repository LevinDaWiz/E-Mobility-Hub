import { useState } from "react";
import { SIM_SPEEDS } from "../config/constants";
import { useStore } from "../store";
import { Button } from "./ui";

// Panel điều khiển demo (M1 sẽ bổ sung: Metro surge, gây lỗi cổng / xe).
export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const clock = useStore((s) => s.clock);
  const setClockSpeed = useStore((s) => s.setClockSpeed);
  const setClockRunning = useStore((s) => s.setClockRunning);
  const resetAll = useStore((s) => s.resetAll);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open ? (
        <div className="w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Demo controls</h2>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
          <p className="mb-3 font-mono text-xs text-slate-600">
            Giờ mô phỏng: {new Date(clock.now).toLocaleTimeString("vi-VN")}
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SIM_SPEEDS.map((speed) => (
              <Button
                key={speed}
                size="sm"
                variant={clock.speed === speed ? "primary" : "secondary"}
                onClick={() => setClockSpeed(speed)}
              >
                ×{speed}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setClockRunning(!clock.running)}>
              {clock.running ? "Tạm dừng" : "Tiếp tục"}
            </Button>
            <Button size="sm" variant="danger" onClick={resetAll}>
              Reset dữ liệu
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          ⚙ Demo
        </Button>
      )}
    </div>
  );
}
