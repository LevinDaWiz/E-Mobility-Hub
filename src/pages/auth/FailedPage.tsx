import { useLocation, useNavigate } from "react-router-dom";
import { DarkButton } from "../../components/layout/DarkButton";
import { Logo } from "../../components/layout/Logo";
import { AUTH_ERROR_MESSAGES, type AuthErrorCode } from "../../services/authService";

const ALL_ERRORS = Object.keys(AUTH_ERROR_MESSAGES) as AuthErrorCode[];

// Màn hình 4b: xác thực thất bại. Dòng lỗi thật sự xảy ra được nhấn mạnh.
export function FailedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const code = (location.state as { code?: AuthErrorCode } | null)?.code;

  return (
    <div className="flex flex-1 flex-col items-center px-6 pt-32">
      <div className="flex h-40 w-40 items-center justify-center rounded-full bg-red-200 text-7xl text-red-700">✕</div>
      <h1 className="mt-6 text-3xl font-bold text-red-700">Xác thực không thành công</h1>
      <p className="mt-3 text-base text-slate-500">Vui lòng kiểm tra một trong các lỗi sau</p>

      <ul className="mt-8 w-full space-y-3">
        {ALL_ERRORS.map((e) => (
          <li
            key={e}
            className={`rounded-lg bg-red-50 px-4 py-4 text-center text-base text-red-700 ${
              e === code ? "font-bold ring-2 ring-red-400" : ""
            }`}
          >
            ⚠ {AUTH_ERROR_MESSAGES[e]}
          </li>
        ))}
      </ul>

      <div className="mt-auto w-full pb-10 pt-8">
        <DarkButton onClick={() => navigate("/login/idp", { replace: true })}>↻ Thử lại</DarkButton>
        <div className="mt-4 flex items-center justify-center gap-4 rounded-lg bg-stone-100 px-4 py-4 text-sm text-slate-500">
          Liên hệ hỗ trợ ĐHQG-HCM
          <Logo className="h-8 w-auto" />
        </div>
      </div>
    </div>
  );
}
