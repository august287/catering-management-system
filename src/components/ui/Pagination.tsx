import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

function getPageNumbers(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) pages.push('ellipsis');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);

  return pages;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className,
}: PaginationProps) {
  if (total === 0) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border px-6 py-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <p className="text-xs text-text-muted">
          Showing <span className="font-semibold text-text">{startIndex + 1}</span>–
          <span className="font-semibold text-text">{endIndex}</span> of{' '}
          <span className="font-semibold text-text">{total}</span>
        </p>

        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="hidden sm:inline">Rows</span>
            <select
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-border bg-white px-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-gold/40"
              aria-label="Rows per page"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:bg-cream hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, index) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-8 w-8 items-center justify-center text-xs text-text-muted"
            >
              …
            </span>
          ) : (
            <button
              type="button"
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors',
                p === page
                  ? 'border-gold bg-gold text-white'
                  : 'border-border text-text-muted hover:bg-cream hover:text-ink'
              )}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:bg-cream hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
