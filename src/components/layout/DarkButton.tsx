import type { ButtonHTMLAttributes } from "react";

// Nút nền tối bo góc dùng ở các màn hình đăng nhập / xác thực (theo mockup).
export function DarkButton({ className = "", type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`w-full rounded-lg bg-ink-900 px-4 py-4 text-lg font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
}
