import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { HomePage } from "../pages/home/HomePage";
import { NotFound } from "../pages/NotFound";
import { appModules } from "./modules";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      ...appModules.flatMap((m) => m.routes),
      { path: "*", element: <NotFound /> },
    ],
  },
]);
