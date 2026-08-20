"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import DataTableCard from "@/components/shared/DataTableCard";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  EmptyTableState,
  SortableHeader,
  TableSearchBar,
  useTableSortAndFilter,
} from "@/components/shared/SortableTable";

export interface DashboardLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
}

export default function DashboardRecentLeadsClient({ leads }: { leads: DashboardLead[] }) {
  const {
    items: filteredLeads,
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDirection,
    toggleSort,
    resetFilters,
    isFiltered,
    totalCount,
    filteredCount,
  } = useTableSortAndFilter<DashboardLead>({
    data: leads,
    searchFields: ["name", "email", "phone", "status", "id"],
    initialSortKey: null,
    initialSortDirection: null,
  });

  return (
    <DataTableCard
      headerContent={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-ink">Recent Active Pipeline</h3>
              <p className="text-xs text-ink-muted">Latest customer intakes and status mutations.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-48 sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter recent leads..."
                className="input w-full py-1 text-xs"
              />
            </div>
            <Link
              href="/leads"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline shrink-0"
            >
              <span>Open Full Queue</span>
              <ChevronRight size={14} />
            </Link>
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
              label="Contact"
              columnKey="email"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Status"
              columnKey="status"
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
          {filteredLeads.length === 0 ? (
            <EmptyTableState
              title={isFiltered ? "No matching recent leads" : "No recent leads found"}
              subtitle={
                isFiltered
                  ? "Try clearing your search query."
                  : "Leads created in the system will automatically display here."
              }
              onReset={isFiltered ? resetFilters : undefined}
            />
          ) : (
            filteredLeads.map((lead) => (
              <tr key={lead.id} className="transition-colors hover:bg-surface-raised">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-hairline bg-surface-raised text-xs font-bold text-ink">
                      {lead.name ? lead.name[0]?.toUpperCase() : "?"}
                    </div>
                    <span className="font-semibold text-sm text-ink">{lead.name || "Unnamed Lead"}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">
                  {lead.email || lead.phone || "—"}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link href={`/leads/${lead.id}`} className="btn-secondary btn-sm">
                    <span>Open</span>
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
