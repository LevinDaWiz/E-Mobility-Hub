import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { DemoPanel } from "../components/DemoPanel";
import { ToastHost } from "../components/ui";
import { registerM1TickHandlers } from "../engine/m1Handlers";
import { startTickEngine, stopTickEngine } from "../engine/tickEngine";

// Vỏ ngoài cùng cho mọi màn hình: chạy tick engine (+ việc định kỳ của M1), toast, Demo panel.
export function RootLayout() {
  useEffect(() => {
    const unregister = registerM1TickHandlers();
    startTickEngine();
    return () => {
      stopTickEngine();
      unregister();
    };
  }, []);

  return (
    <>
      <Outlet />
      <ToastHost />
      <DemoPanel />
    </>
  );
}
