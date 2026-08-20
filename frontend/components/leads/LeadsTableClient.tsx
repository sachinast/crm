"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Car, Hotel, Plane, ChevronRight, Filter } from "lucide-react";

import DataTableCard from "@/components/shared/DataTableCard";
import StatusBadge from "@/components/shared/StatusBadge";
import Pagination from "@/components/shared/Pagination";
import {
  EmptyTableState,
  SortableHeader,
  TableSearchBar,
  useTableSortAndFilter,
} from "@/components/shared/SortableTable";
import { formatDate } from "@/lib/formatters";

export interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_type: string | null;
  status: string;
  is_duplicate: boolean;
  created_at: string;
}

function ServiceTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-ink-faint">—</span>;

  if (type === "car") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface-raised px-2.5 py-1 text-xs font-semibold text-ink">
        <Car size={14} className="text-accent" />
        <span>Car Rental</span>
      </span>
    );
  }

  if (type === "hotel") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface-raised px-2.5 py-1 text-xs font-semibold text-ink">
        <Hotel size={14} className="text-accent" />
        <span>Hotel</span>
      </span>
    );
  }

  if (type === "flight") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface-raised px-2.5 py-1 text-xs font-semibold text-ink">
        <Plane size={14} className="text-accent" />
        <span>Flight</span>
      </span>
    );
  }

  return <span className="text-xs font-semibold capitalize text-ink-muted">{type}</span>;
}

export default function LeadsTableClient({
  initialLeads,
  initialPage = 1,
  initialPageSize = 10,
}: {
  initialLeads: LeadRow[];
  initialPage?: number;
  initialPageSize?: number;
}) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Extract unique statuses and service types for dropdown filters
  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    initialLeads.forEach((l) => l.status && set.add(l.status));
    return Array.from(set).sort();
  }, [initialLeads]);

  const {
    items: filteredLeads,
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDirection,
    toggleSort,
    filters,
    setFilter,
    resetFilters,
    isFiltered,
    totalCount,
    filteredCount,
  } = useTableSortAndFilter<LeadRow>({
    data: initialLeads,
    searchFields: ["name", "email", "phone", "service_type", "status", "id"],
    initialSortKey: "created_at",
    initialSortDirection: "desc",
    filterFn: (lead, activeFilters) => {
      if (activeFilters.status && lead.status.toLowerCase() !== activeFilters.status.toLowerCase()) {
        return false;
      }
      if (activeFilters.service_type && (lead.service_type || "").toLowerCase() !== activeFilters.service_type.toLowerCase()) {
        return false;
      }
      if (activeFilters.duplicate === "true" && !lead.is_duplicate) {
        return false;
      }
      return true;
    },
  });

  // Client-side pagination based on filtered and sorted leads
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedLeads = filteredLeads.slice(startIndex, startIndex + pageSize);

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
          placeholder="Filter by customer name, email, phone, status..."
          totalCount={totalCount}
          filteredCount={filteredCount}
          isFiltered={isFiltered}
          onResetFilters={handleReset}
        >
          {/* Status Dropdown Filter */}
          <div className="relative">
            <select
              value={filters.status || "all"}
              onChange={(e) => {
                setFilter("status", e.target.value);
                setCurrentPage(1);
              }}
              className="select text-xs py-1.5 pl-3 pr-8 min-w-[130px] font-medium"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Service Type Dropdown Filter */}
          <div className="relative">
            <select
              value={filters.service_type || "all"}
              onChange={(e) => {
                setFilter("service_type", e.target.value);
                setCurrentPage(1);
              }}
              className="select text-xs py-1.5 pl-3 pr-8 min-w-[120px] font-medium"
            >
              <option value="all">All Services</option>
              <option value="car">Car Rental</option>
              <option value="hotel">Hotel</option>
              <option value="flight">Flight</option>
            </select>
          </div>

          {/* Duplicate Toggle Filter */}
          <button
            type="button"
            onClick={() => {
              setFilter("duplicate", filters.duplicate === "true" ? "all" : "true");
              setCurrentPage(1);
            }}
            className={`btn-sm rounded-xl px-2.5 py-1 text-xs font-semibold border transition-colors ${
              filters.duplicate === "true"
                ? "bg-rose-500/15 border-rose-500/40 text-danger"
                : "border-hairline bg-surface-raised text-ink-muted hover:text-ink hover:bg-surface"
            }`}
          >
            Duplicates Only
          </button>
        </TableSearchBar>
      }
      footerContent={
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-sm text-ink-muted">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              Showing <span className="font-semibold text-ink">{filteredCount === 0 ? 0 : startIndex + 1}</span> to{" "}
              <span className="font-semibold text-ink">{Math.min(startIndex + pageSize, filteredCount)}</span> of{" "}
              <span className="font-semibold text-ink">{filteredCount}</span> entries
            </div>

            <div className="flex items-center gap-2 border-l border-hairline pl-3">
              <span className="text-xs text-ink-faint">Per page:</span>
              <div className="flex items-center gap-1">
                {[10, 25, 50, 100].map((size) => (
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

          {/* Client-side Pagination Buttons */}
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
              label="Customer Name"
              columnKey="name"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Contact Details"
              columnKey="email"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Service Type"
              columnKey="service_type"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Workflow Status"
              columnKey="status"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Intake Date"
              columnKey="created_at"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-faint">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {pagedLeads.length === 0 ? (
            <EmptyTableState
              title={isFiltered ? "No matching leads found" : "No leads in pipeline"}
              subtitle={
                isFiltered
                  ? "Try clearing your search query or filters."
                  : "Create a new lead intake record to start tracking."
              }
              onReset={isFiltered ? handleReset : undefined}
            />
          ) : (
            pagedLeads.map((lead) => (
              <tr key={lead.id} className="transition-colors hover:bg-surface-raised">
                {/* Customer Name & Duplicate Pill */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-hairline bg-surface-raised text-sm font-bold text-ink">
                      {lead.name ? lead.name[0]?.toUpperCase() : "?"}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-ink">{lead.name || "Unnamed Lead"}</span>
                      {lead.is_duplicate && (
                        <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-danger">
                          Duplicate
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Contact Details */}
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-0.5 text-sm">
                    {lead.phone && <span className="font-mono text-sm text-ink">{lead.phone}</span>}
                    {lead.email && <span className="font-mono text-xs text-ink-muted">{lead.email}</span>}
                    {!lead.phone && !lead.email && <span className="text-ink-faint">—</span>}
                  </div>
                </td>

                {/* Service Type */}
                <td className="px-4 py-3.5">
                  <ServiceTypeBadge type={lead.service_type} />
                </td>

                {/* Workflow Status */}
                <td className="px-4 py-3.5">
                  <StatusBadge status={lead.status} />
                </td>

                {/* Created At */}
                <td className="px-4 py-3.5 font-mono text-sm text-ink-muted" suppressHydrationWarning>
                  {formatDate(lead.created_at)}
                </td>

                {/* Action Link */}
                <td className="px-4 py-3.5 text-right">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-hairline bg-surface-raised px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:border-accent hover:bg-surface"
                  >
                    <span>Workspace</span>
                    <ChevronRight size={13} />
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </DataTableCard>
  );
}
