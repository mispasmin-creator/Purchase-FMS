import { useState } from "react";

/**
 * Shared pagination state for server-side (Supabase `.range()`) paginated tables.
 * Default page size is 100; consumers can offer 100/500/1000 via PaginationControls.
 */
export function usePagination(defaultPageSize = 100) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [totalRows, setTotalRows] = useState(0);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const resetPage = () => setPage(1);

  const changePageSize = (nextSize) => {
    setPageSize(nextSize);
    setPage(1);
  };

  return {
    page,
    setPage,
    pageSize,
    setPageSize: changePageSize,
    totalRows,
    setTotalRows,
    from,
    to,
    resetPage,
  };
}
