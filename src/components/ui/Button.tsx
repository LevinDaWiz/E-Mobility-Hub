import type { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
  secondary: "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:text-slate-400",
} as const;

const SIZES = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-2 text-sm",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  );
}
