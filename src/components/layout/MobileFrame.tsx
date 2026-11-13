import type { ReactNode } from "react";

interface MobileFrameProps {
  children: ReactNode;
  className?: string;
}

// Khung điện thoại: trên máy tính hiện thành cột hẹp ở giữa; trên điện thoại thật chiếm toàn màn hình.
export function MobileFrame({ children, className = "" }: MobileFrameProps) {
  return (
    <div className="flex min-h-screen justify-center bg-slate-200">
      <div className={`relative flex min-h-screen w-full max-w-[430px] flex-col bg-white shadow-xl ${className}`}>
        {children}
      </div>
    </div>
  );
}
