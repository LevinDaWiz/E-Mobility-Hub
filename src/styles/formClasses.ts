// Class Tailwind cho ô nhập; có lỗi thì viền và nền đỏ (theo mockup UC19).
export function inputClass(hasError = false): string {
  return `w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
    hasError
      ? "border-2 border-red-700 bg-red-50 text-slate-900"
      : "border-slate-300 bg-white text-slate-900 focus:border-brand-700"
  }`;
}
