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
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400">
      {/* Left: Dynamic Entries Count & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          Showing <span className="font-semibold text-slate-200">{startItem}</span> to{" "}
          <span className="font-semibold text-slate-200">{endItem}</span> of{" "}
          <span className="font-semibold text-slate-200">{totalItems}</span> entries
        </div>

        {pageSizeOptions && pageSizeOptions.length > 0 && (
          <div className="flex items-center gap-1.5 border-l border-[#232e47] pl-3">
            <span className="text-[11px] text-slate-400">Per page:</span>
            <div className="flex items-center gap-1">
              {pageSizeOptions.map((size) => {
                const isActive = size === pageSize;
                return (
                  <Link
                    key={size}
                    href={createPageSizeUrl(size)}
                    className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                      isActive
                        ? "bg-[#d3ab5e] text-slate-950 font-bold shadow-xs"
                        : "bg-[#182136] text-slate-400 hover:bg-[#232e47] hover:text-white"
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
            className="inline-flex items-center gap-1 rounded-lg border border-[#2a3652] bg-[#182136] px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-[#d3ab5e] hover:text-white"
          >
            <ChevronLeft size={13} />
            <span>Prev</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1 text-xs font-semibold text-slate-600 cursor-not-allowed">
            <ChevronLeft size={13} />
            <span>Prev</span>
          </span>
        )}

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {startPage > 1 && (
            <>
              <Link
                href={createPageUrl(1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#2a3652] bg-[#131a2b] text-xs font-semibold text-slate-300 transition-colors hover:border-[#d3ab5e] hover:text-white"
              >
                1
              </Link>
              {startPage > 2 && <span className="px-1 text-slate-600">…</span>}
            </>
          )}

          {visiblePages.map((p) => {
            const isActive = p === currentPage;
            return isActive ? (
              <span
                key={p}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#d3ab5e] text-xs font-bold text-slate-950 shadow-sm"
              >
                {p}
              </span>
            ) : (
              <Link
                key={p}
                href={createPageUrl(p)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#2a3652] bg-[#131a2b] text-xs font-semibold text-slate-300 transition-colors hover:border-[#d3ab5e] hover:text-white"
              >
                {p}
              </Link>
            );
          })}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-1 text-slate-600">…</span>}
              <Link
                href={createPageUrl(totalPages)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#2a3652] bg-[#131a2b] text-xs font-semibold text-slate-300 transition-colors hover:border-[#d3ab5e] hover:text-white"
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
            className="inline-flex items-center gap-1 rounded-lg border border-[#2a3652] bg-[#182136] px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-[#d3ab5e] hover:text-white"
          >
            <span>Next</span>
            <ChevronRight size={13} />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1 text-xs font-semibold text-slate-600 cursor-not-allowed">
            <span>Next</span>
            <ChevronRight size={13} />
          </span>
        )}
      </div>
    </div>
  );
}
