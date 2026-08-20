"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ChevronRight, Car, Hotel, Plane, CheckCircle2 } from "lucide-react";

import DataTableCard from "@/components/shared/DataTableCard";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  EmptyTableState,
  SortableHeader,
  TableSearchBar,
  useTableSortAndFilter,
} from "@/components/shared/SortableTable";
import { formatDate } from "@/lib/formatters";

export interface AuditLeadRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_type: string | null;
  status: string;
  is_duplicate: boolean;
  created_at: string;
}

function ServiceIcon({ type }: { type: string | null }) {
  if (type === "car") return <Car size={13} className="text-accent" />;
  if (type === "hotel") return <Hotel size={13} className="text-accent" />;
  if (type === "flight") return <Plane size={13} className="text-accent" />;
  return null;
}

export default function AuditQueueClient({ leads }: { leads: AuditLeadRow[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.status && set.add(l.status));
    return Array.from(set).sort();
  }, [leads]);

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
  } = useTableSortAndFilter<AuditLeadRow>({
    data: leads,
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
      return true;
    },
  });

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
          placeholder="Filter QC records by lead name, phone, status..."
          totalCount={totalCount}
          filteredCount={filteredCount}
          isFiltered={isFiltered}
          onResetFilters={handleReset}
        >
          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={filters.status || "all"}
              onChange={(e) => {
                setFilter("status", e.target.value);
                setCurrentPage(1);
              }}
              className="select text-xs py-1.5 pl-3 pr-8 min-w-[140px] font-medium"
            >
              <option value="all">All QC Statuses</option>
              {uniqueStatuses.map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Service Dropdown */}
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
        </TableSearchBar>
      }
      footerContent={
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-sm text-ink-muted">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              Showing <span className="font-semibold text-ink">{filteredCount === 0 ? 0 : startIndex + 1}</span> to{" "}
              <span className="font-semibold text-ink">{Math.min(startIndex + pageSize, filteredCount)}</span> of{" "}
              <span className="font-semibold text-ink">{filteredCount}</span> audit records
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
              label="Lead & Customer"
              columnKey="name"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Service Modality"
              columnKey="service_type"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Contact Details"
              columnKey="phone"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Audit / QC Status"
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
              title={isFiltered ? "No matching QC records" : "No active QC records"}
              subtitle={
                isFiltered
                  ? "Try clearing your filters or search keywords."
                  : "Leads tagged to Auditor will automatically appear in this review queue."
              }
              onReset={isFiltered ? handleReset : undefined}
            />
          ) : (
            pagedLeads.map((lead) => (
              <tr key={lead.id} className="transition-colors hover:bg-surface-raised">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-hairline bg-surface-raised text-sm font-bold text-ink">
                      {lead.name ? lead.name[0]?.toUpperCase() : "?"}
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-ink">{lead.name || "Unnamed Customer"}</span>
                      <p className="font-mono text-[11px] text-ink-faint">Ref: {lead.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3.5">
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-raised px-2.5 py-1 text-xs font-semibold capitalize text-ink">
                    <ServiceIcon type={lead.service_type} />
                    <span>{lead.service_type || "General"}</span>
                  </div>
                </td>

                <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">
                  <div>{lead.phone || "—"}</div>
                  {lead.email && <div className="text-[11px] text-ink-faint">{lead.email}</div>}
                </td>

                <td className="px-4 py-3.5">
                  <StatusBadge status={lead.status} />
                </td>

                <td className="px-4 py-3.5 font-mono text-xs text-ink-muted" suppressHydrationWarning>
                  {formatDate(lead.created_at)}
                </td>

                <td className="px-4 py-3.5 text-right">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface-raised px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:border-accent hover:bg-surface"
                  >
                    <CheckCircle2 size={13} />
                    <span>Review QC</span>
                    <ChevronRight size={12} />
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
