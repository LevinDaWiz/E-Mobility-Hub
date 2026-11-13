import { Outlet } from "react-router-dom";
import { MobileFrame } from "../components/layout/MobileFrame";

// Khung cho các màn hình đăng nhập / xác thực (dạng điện thoại).
export function PublicLayout() {
  return (
    <MobileFrame>
      <Outlet />
    </MobileFrame>
  );
}
