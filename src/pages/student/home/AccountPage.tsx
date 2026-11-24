import { useNavigate } from "react-router-dom";
import { Button, Card } from "../../../components/ui";
import { DEFAULT_SCHOOL } from "../../../config/constants";
import { LOGIN_PATH } from "../../../routes/paths";
import { useStore } from "../../../store";

// Tab "Tài khoản".
export function AccountPage() {
  const navigate = useNavigate();
  const user = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-950">Tài khoản</h1>
      <Card>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-bold uppercase text-slate-500">Họ và tên</dt>
            <dd className="font-semibold text-slate-900">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-500">Mã sinh viên</dt>
            <dd className="font-semibold text-slate-900">{user.userId}</dd>
          </div>
          {user.email && (
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">Email</dt>
              <dd className="font-semibold text-slate-900">{user.email}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-bold uppercase text-slate-500">Trường</dt>
            <dd className="font-semibold text-slate-900">{DEFAULT_SCHOOL}</dd>
          </div>
        </dl>
      </Card>
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          logout();
          navigate(LOGIN_PATH);
        }}
      >
        Đăng xuất
      </Button>
    </div>
  );
}
