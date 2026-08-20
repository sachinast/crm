import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
  extraParams?: Record<string, string | number | undefined | null>;
  pageSizeOptions?: number[];
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  basePath,
  extraParams = {},
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  function createPageUrl(pageNumber: number): string {
    const params = new URLSearchParams();
    params.set("page", String(pageNumber));
    params.set("page_size", String(pageSize));

    Object.entries(extraParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "" && key !== "page" && key !== "page_size") {
        params.set(key, String(val));
      }
    });

    return `${basePath}?${params.toString()}`;
  }

  function createPageSizeUrl(size: number): string {
    const params = new URLSearchParams();
    params.set("page", "1"); // Reset to page 1 when changing page size
    params.set("page_size", String(size));

    Object.entries(extraParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "" && key !== "page" && key !== "page_size") {
        params.set(key, String(val));
      }
    });

    return `${basePath}?${params.toString()}`;
  }

  // Generate visible page numbers (e.g. 1, 2, 3...)
  const visiblePages: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  for (let p = startPage; p <= endPage; p++) {
    visiblePages.push(p);
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-sm text-[var(--ink-muted)]">
      {/* Left: Dynamic Entries Count & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          Showing <span className="font-semibold text-[var(--ink)]">{startItem}</span> to{" "}
          <span className="font-semibold text-[var(--ink)]">{endItem}</span> of{" "}
          <span className="font-semibold text-[var(--ink)]">{totalItems}</span> entries
        </div>

        {pageSizeOptions && pageSizeOptions.length > 0 && (
          <div className="flex items-center gap-2 border-l border-[var(--hairline)] pl-3">
            <span className="text-xs text-[var(--ink-faint)]">Per page:</span>
            <div className="flex items-center gap-1">
              {pageSizeOptions.map((size) => {
                const isActive = size === pageSize;
                return (
                  <Link
                    key={size}
                    href={createPageSizeUrl(size)}
                    className={`rounded-lg px-2 py-0.5 font-mono text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-accent text-white font-bold shadow-xs"
                        : "bg-surface-raised text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    {size}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right: Pagination Controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        {currentPage > 1 ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-xl border border-transparent px-3 py-1.5 text-xs font-semibold text-ink-faint opacity-50 cursor-not-allowed">
            <ChevronLeft size={14} />
            <span>Prev</span>
          </span>
        )}

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {startPage > 1 && (
            <>
              <Link
                href={createPageUrl(1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-hairline bg-surface text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
              >
                1
              </Link>
              {startPage > 2 && <span className="px-1 text-ink-faint">…</span>}
            </>
          )}

          {visiblePages.map((p) => {
            const isActive = p === currentPage;
            return isActive ? (
              <span
                key={p}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-xs font-bold text-white shadow-xs"
              >
                {p}
              </span>
            ) : (
              <Link
                key={p}
                href={createPageUrl(p)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-hairline bg-surface text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
              >
                {p}
              </Link>
            );
          })}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-1 text-[var(--ink-faint)]">…</span>}
              <Link
                href={createPageUrl(totalPages)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--hairline)] bg-[var(--surface)] text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {totalPages}
              </Link>
            </>
          )}
        </div>

        {/* Next Button */}
        {currentPage < totalPages ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-xl border border-transparent px-3 py-1.5 text-xs font-semibold text-[var(--ink-faint)] opacity-50 cursor-not-allowed">
            <span>Next</span>
            <ChevronRight size={14} />
          </span>
        )}
      </div>
    </div>
  );
}
