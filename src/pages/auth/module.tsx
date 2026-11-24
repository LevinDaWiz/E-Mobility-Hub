import type { AppModule } from "../../routes/types";
import { FailedPage } from "./FailedPage";
import { IdpLoginPage } from "./IdpLoginPage";
import { LandingPage } from "./LandingPage";
import { SuccessPage } from "./SuccessPage";
import { VerifyingPage } from "./VerifyingPage";

// M1: UC20 – đăng nhập SSO giả lập (5 màn hình theo mockup).
export const authModule: AppModule = {
  id: "auth",
  owner: "M1",
  area: "public",
  routes: [
    { path: "/login", element: <LandingPage /> },
    { path: "/login/idp", element: <IdpLoginPage /> },
    { path: "/login/verifying", element: <VerifyingPage /> },
    { path: "/login/success", element: <SuccessPage /> },
    { path: "/login/failed", element: <FailedPage /> },
  ],
};
