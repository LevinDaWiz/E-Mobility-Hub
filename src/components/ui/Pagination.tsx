interface PaginationProps {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  noun: string; // "Hub", "chỗ đỗ", "cổng sạc"
  onChange: (page: number) => void;
}

// Chân bảng: "Hiển thị 1–6 trên 80 chỗ đỗ" và nút trang trước / sau.
export function Pagination({ page, pageCount, from, to, total, noun, onChange }: PaginationProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <span>{total === 0 ? `Không có ${noun}` : `Hiển thị ${from}–${to} trên ${total} ${noun}`}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          ‹ Trước
        </button>
        Trang {page} / {Math.max(1, pageCount)}
        <button
          type="button"
          className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          Sau ›
        </button>
      </span>
    </div>
  );
}
