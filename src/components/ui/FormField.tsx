import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

// Nhãn + ô nhập + thông báo lỗi đỏ bên dưới.
export function FormField({ label, htmlFor, error, hint, className = "", children }: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={`mb-1 block text-xs ${error ? "font-semibold text-red-700" : "text-slate-500"}`}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}
