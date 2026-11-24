import { useNavigate } from "react-router-dom";
import { DarkButton } from "../../components/layout/DarkButton";
import { Logo } from "../../components/layout/Logo";

// Màn hình 1: giới thiệu + nút đăng nhập SSO.
export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center px-6 pt-28">
      <Logo className="h-36 w-auto" />
      <h1 className="mt-8 text-3xl font-bold text-ink-900">Smart E-Mobility Hub</h1>
      <p className="mt-3 text-base text-slate-500">Sử dụng tài khoản sinh viên ĐHQG-HCM</p>

      <div className="mt-24 w-full">
        <DarkButton onClick={() => navigate("/login/idp")}>Đăng nhập qua VNU-HCM SSO</DarkButton>
        <p className="mt-4 text-center">
          <a href="#" className="text-base text-ink-900 underline">
            Liên hệ hỗ trợ ĐHQG-HCM ↗
          </a>
        </p>
      </div>
    </div>
  );
}
