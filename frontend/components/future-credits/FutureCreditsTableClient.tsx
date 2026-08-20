"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import DataTableCard from "@/components/shared/DataTableCard";
import {
  EmptyTableState,
  SortableHeader,
  TableSearchBar,
  useTableSortAndFilter,
} from "@/components/shared/SortableTable";
import { formatDate } from "@/lib/formatters";

export interface FutureCreditEntry {
  id: string;
  source_lead_id: string;
  voucher_amount: number;
  number_of_vouchers: number;
  validity_date: string;
  created_by: string;
  created_at: string;
}

export default function FutureCreditsTableClient({ credits }: { credits: FutureCreditEntry[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    items: filteredCredits,
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDirection,
    toggleSort,
    resetFilters,
    isFiltered,
    totalCount,
    filteredCount,
  } = useTableSortAndFilter<FutureCreditEntry>({
    data: credits,
    searchFields: ["source_lead_id", "validity_date", "created_by", "id"],
    initialSortKey: "created_at",
    initialSortDirection: "desc",
  });

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedCredits = filteredCredits.slice(startIndex, startIndex + pageSize);

  function handleReset() {
    resetFilters();
    setCurrentPage(1);
  }

  return (
    <DataTableCard
      headerContent={
        <TableSearchBar
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          placeholder="Search by source lead ID, validity date..."
          totalCount={totalCount}
          filteredCount={filteredCount}
          isFiltered={isFiltered}
          onResetFilters={handleReset}
        />
      }
      footerContent={
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-sm text-ink-muted">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              Showing <span className="font-semibold text-ink">{filteredCount === 0 ? 0 : startIndex + 1}</span> to{" "}
              <span className="font-semibold text-ink">{Math.min(startIndex + pageSize, filteredCount)}</span> of{" "}
              <span className="font-semibold text-ink">{filteredCount}</span> voucher records
            </div>

            <div className="flex items-center gap-2 border-l border-hairline pl-3">
              <span className="text-xs text-ink-faint">Per page:</span>
              <div className="flex items-center gap-1">
                {[10, 25, 50].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`rounded-lg px-2 py-0.5 font-mono text-xs font-semibold transition-colors ${
                      size === pageSize
                        ? "bg-accent text-white font-bold shadow-xs"
                        : "bg-surface-raised text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="btn-secondary btn-sm text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-2 font-mono text-xs font-semibold text-ink">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="btn-secondary btn-sm text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      }
    >
      <table className="table-modern w-full">
        <thead>
          <tr>
            <SortableHeader
              label="Source Lead"
              columnKey="source_lead_id"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Voucher Amount"
              columnKey="voucher_amount"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Vouchers"
              columnKey="number_of_vouchers"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Validity Date"
              columnKey="validity_date"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Created"
              columnKey="created_at"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
              align="right"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {pagedCredits.length === 0 ? (
            <EmptyTableState
              title={isFiltered ? "No matching vouchers found" : "No future credits issued yet"}
              subtitle={
                isFiltered
                  ? "Try adjusting your search criteria."
                  : "Issue compensation vouchers using the form to start tracking."
              }
              onReset={isFiltered ? handleReset : undefined}
            />
          ) : (
            pagedCredits.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-surface-raised">
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${c.source_lead_id}`}
                    className="inline-flex items-center gap-1 font-mono text-xs text-accent font-bold hover:underline"
                  >
                    <span>{c.source_lead_id.slice(0, 8)}...</span>
                    <ChevronRight size={11} />
                  </Link>
                </td>
                <td className="px-4 py-3 font-bold text-sm text-ink">
                  ${c.voucher_amount.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-ink">
                  <span className="inline-flex items-center rounded-lg border border-hairline bg-surface-raised px-2.5 py-0.5 font-mono text-xs font-semibold text-ink">
                    {c.number_of_vouchers}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                  {c.validity_date}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-ink-muted" suppressHydrationWarning>
                  {formatDate(c.created_at)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </DataTableCard>
  );
}
