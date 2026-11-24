import { Navigate, useNavigate } from "react-router-dom";
import { DarkButton } from "../../components/layout/DarkButton";
import { DEFAULT_SCHOOL } from "../../config/constants";
import { ROLE_LABELS } from "../../config/roles";
import { homePathForRole } from "../../routes/paths";
import { useStore } from "../../store";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-6 last:mb-0">
      <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-bold text-ink-900">{value}</p>
    </div>
  );
}

// Màn hình 4a: xác thực thành công.
export function SuccessPage() {
  const navigate = useNavigate();
  const user = useStore((s) => s.currentUser);
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const isStudent = user.role === "STUDENT";

  return (
    <div className="flex flex-1 flex-col items-center px-6 pt-32">
      <div className="flex h-40 w-40 items-center justify-center rounded-full bg-emerald-200 text-7xl text-emerald-800">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-bold text-emerald-800">Xác thực thành công</h1>
      <p className="mt-3 text-base text-slate-500">
        {isStudent ? "Thông tin sinh viên đã được xác nhận" : "Tài khoản vận hành đã được xác nhận"}
      </p>

      <div className="mt-8 w-full rounded-2xl bg-neutral-200 p-8">
        <Field label="Họ và tên" value={user.name} />
        <Field label={isStudent ? "Mã sinh viên" : "Mã tài khoản"} value={user.userId} />
        <Field label={isStudent ? "Trường" : "Vai trò"} value={isStudent ? DEFAULT_SCHOOL : ROLE_LABELS[user.role]} />
        <p className="mt-6 rounded-xl bg-emerald-200 py-4 text-center text-base font-bold text-emerald-800">
          Đủ điều kiện sử dụng
        </p>
      </div>

      <div className="mt-auto w-full pb-16 pt-8">
        <DarkButton onClick={() => navigate(homePathForRole(user.role), { replace: true })}>
          Tiếp tục vào hệ thống →
        </DarkButton>
      </div>
    </div>
  );
}
