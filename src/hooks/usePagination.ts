import { useState } from "react";
import { TABLE_PAGE_SIZE } from "../config/constants";

// Phân trang phía client. Gọi setPage(1) khi đổi bộ lọc; trang tự được kéo về hợp lệ nếu dữ liệu giảm.
export function usePagination<T>(items: T[], pageSize: number = TABLE_PAGE_SIZE) {
  const [requested, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requested, pageCount);
  const start = (page - 1) * pageSize;
  return {
    page,
    setPage,
    pageCount,
    pageItems: items.slice(start, start + pageSize),
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(items.length, start + pageSize),
    total: items.length,
  };
}
