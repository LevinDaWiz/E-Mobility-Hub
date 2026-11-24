import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthError, signIn, type AuthErrorCode } from "../../services/authService";
import { useStore } from "../../store";

interface VerifyState {
  username: string;
  password: string;
}

// Màn hình 3: "Đang xác thực..." gọi signIn rồi chuyển sang thành công / thất bại.
export function VerifyingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useStore((s) => s.login);
  const creds = location.state as VerifyState | null;

  useEffect(() => {
    if (!creds) return;
    let cancelled = false;

    signIn(creds.username, creds.password)
      .then((account) => {
        if (cancelled) return;
        login(account.userId);
        navigate("/login/success", { replace: true });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const code: AuthErrorCode = error instanceof AuthError ? error.code : "IDENTITY_UNAVAILABLE";
        navigate("/login/failed", { replace: true, state: { code } });
      });

    return () => {
      cancelled = true;
    };
  }, [creds, login, navigate]);

  if (!creds) return <Navigate to="/login" replace />;

  return (
    <div className="flex flex-1 flex-col items-center px-6 pt-52">
      <div className="h-28 w-28 animate-spin rounded-full border-[14px] border-amber-100 border-t-amber-700" />
      <h1 className="mt-24 text-3xl font-bold text-ink-900">Đang xác thực...</h1>
      <p className="mt-3 text-sm text-slate-500">Đang kết nối với University Identity System</p>
      <div className="mt-6 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-stone-100">
        <div className="auth-progress h-full rounded-full bg-amber-700" />
      </div>
      <p className="mt-8 text-base text-slate-500">Vui lòng không đóng cửa sổ này</p>

      <div className="mt-auto w-full pb-24">
        <p className="rounded-lg bg-slate-200 px-4 py-5 text-center text-lg font-semibold text-ink-900">
          🔒 Phiên xác thực an toàn qua SSO
        </p>
      </div>
    </div>
  );
}
