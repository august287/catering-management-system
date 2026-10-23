import { useEffect, useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 10;

export function usePagination<T>(items: T[], resetKey?: unknown, initialPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  const paginatedItems = useMemo(
    () => items.slice(startIndex, startIndex + pageSize),
    [items, startIndex, pageSize]
  );

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  return {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
  };
}
