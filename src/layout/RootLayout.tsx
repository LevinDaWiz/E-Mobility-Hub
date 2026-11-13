import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { DemoPanel } from "../components/DemoPanel";
import { ToastHost } from "../components/ui";
import { startTickEngine, stopTickEngine } from "../engine/tickEngine";

// Vỏ ngoài cùng cho mọi màn hình: chạy tick engine, toast, Demo panel.
export function RootLayout() {
  useEffect(() => {
    startTickEngine();
    return stopTickEngine;
  }, []);

  return (
    <>
      <Outlet />
      <ToastHost />
      <DemoPanel />
    </>
  );
}
