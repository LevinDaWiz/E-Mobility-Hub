import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DarkButton } from "../../components/layout/DarkButton";
import { Logo } from "../../components/layout/Logo";

const inputClass = "w-full rounded-lg bg-stone-50 px-5 py-4 text-base text-slate-800 outline-none ring-1 ring-transparent focus:ring-brand-700";
const labelClass = "mb-2 mt-6 block text-sm font-bold uppercase tracking-wide text-slate-600";

// Màn hình 2: form của "VNU-HCM Identity Provider" (giả lập).
export function IdpLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate("/login/verifying", { state: { username, password } });
  };

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col px-6 pt-24">
      <h1 className="text-2xl font-bold text-ink-900">VNU-HCM Identity Provider</h1>
      <p className="mt-2 text-sm text-slate-500">ĐHQG-HCM — University Identity System</p>

      <label htmlFor="username" className={`${labelClass} mt-12`}>
        Mã sinh viên / Email sinh viên
      </label>
      <input
        id="username"
        className={inputClass}
        placeholder="Nhập mã sinh viên..."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
      />

      <label htmlFor="password" className={labelClass}>
        Mật khẩu
      </label>
      <input
        id="password"
        type="password"
        className={inputClass}
        placeholder="Nhập mật khẩu..."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      <div className="my-8 flex justify-center">
        <Logo className="h-24 w-auto" />
      </div>

      <div className="mt-auto pb-8 pt-6">
        <DarkButton type="submit">Xác thực với University Identity System</DarkButton>
        <p className="mt-4 text-center text-sm text-slate-500">Dữ liệu được bảo mật theo quy định ĐHQG-HCM</p>
      </div>
    </form>
  );
}
