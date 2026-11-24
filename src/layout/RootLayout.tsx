import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { DemoPanel } from "../components/DemoPanel";
import { ToastHost } from "../components/ui";
import { registerAllTickHandlers } from "../engine/registerHandlers";
import { startTickEngine, stopTickEngine } from "../engine/tickEngine";

// Vỏ ngoài cùng cho mọi màn hình: chạy tick engine (+ việc định kỳ của các module), toast, Demo panel.
export function RootLayout() {
  useEffect(() => {
    const unregister = registerAllTickHandlers();
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
