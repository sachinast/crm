"use client";

import React, { useState } from "react";
import { History, ShieldAlert, Lock, User, Globe, Clock, Layers } from "lucide-react";

import DataTableCard from "@/components/shared/DataTableCard";
import {
  EmptyTableState,
  SortableHeader,
  TableSearchBar,
  useTableSortAndFilter,
} from "@/components/shared/SortableTable";

export interface ActivityEntry {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  category: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface CombinedPiiEvent {
  kind: "revealed" | "denied";
  at: string;
  actor: string;
  detail: string;
  ip: string | null;
}

function summarize(entry: ActivityEntry): string {
  const m = entry.metadata ?? {};
  switch (entry.action) {
    case "login_success":
      return "Logged in successfully";
    case "login_failed":
      return `Failed login attempt (${m.email ?? "unknown email"})`;
    case "role_created":
      return `Created role "${m.name}"`;
    case "role_permissions_changed":
      return `Changed permissions for role "${m.name}"`;
    case "role_deleted":
      return `Deleted role "${m.name}"`;
    case "user_created":
      return `Created user ${m.email} (${m.role_name})`;
    case "user_role_changed":
      return `Changed ${m.email}'s role: ${m.old_role} → ${m.new_role}`;
    case "conversation_started":
      return `Started a ${m.is_group ? "group " : ""}conversation (${m.participant_count} participants)`;
    case "reveal_denied":
      return `Tried to reveal ${m.field} on an unauthorized lead`;
    default:
      return entry.action.replace(/_/g, " ");
  }
}

export default function ActivityHistoryClient({
  activities,
  combinedPii,
  piiForbidden,
}: {
  activities: ActivityEntry[];
  combinedPii: CombinedPiiEvent[];
  piiForbidden: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    items: filteredActivities,
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
  } = useTableSortAndFilter<ActivityEntry>({
    data: activities,
    searchFields: ["actor_name", "actor_id", "category", "action", "ip_address"],
    initialSortKey: "created_at",
    initialSortDirection: "desc",
    filterFn: (act, activeFilters) => {
      if (activeFilters.category && act.category.toLowerCase() !== activeFilters.category.toLowerCase()) {
        return false;
      }
      return true;
    },
  });

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedActivities = filteredActivities.slice(startIndex, startIndex + pageSize);

  function handleReset() {
    resetFilters();
    setCurrentPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Main Activity Grid */}
      <DataTableCard
        headerContent={
          <TableSearchBar
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            placeholder="Search activity events, actors, IP..."
            totalCount={totalCount}
            filteredCount={filteredCount}
            isFiltered={isFiltered}
            onResetFilters={handleReset}
          >
            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={filters.category || "all"}
                onChange={(e) => {
                  setFilter("category", e.target.value);
                  setCurrentPage(1);
                }}
                className="select text-xs py-1.5 pl-3 pr-8 min-w-[130px] font-medium"
              >
                <option value="all">All Categories</option>
                <option value="auth">Auth Events</option>
                <option value="admin">Admin Events</option>
                <option value="messaging">Messaging</option>
                <option value="pii">PII Security</option>
              </select>
            </div>
          </TableSearchBar>
        }
        footerContent={
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-ink-muted">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                Showing <span className="font-semibold text-ink">{filteredCount === 0 ? 0 : startIndex + 1}</span> to{" "}
                <span className="font-semibold text-ink">{Math.min(startIndex + pageSize, filteredCount)}</span> of{" "}
                <span className="font-semibold text-ink">{filteredCount}</span> events
              </div>

              <div className="flex items-center gap-1.5 border-l border-hairline pl-3">
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
                label="Timestamp"
                columnKey="created_at"
                currentSortKey={sortKey as string | null}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Actor"
                columnKey="actor_name"
                currentSortKey={sortKey as string | null}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Category"
                columnKey="category"
                currentSortKey={sortKey as string | null}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                Action / Event Details
              </th>
              <SortableHeader
                label="IP Address"
                columnKey="ip_address"
                currentSortKey={sortKey as string | null}
                sortDirection={sortDirection}
                onSort={toggleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {pagedActivities.length === 0 ? (
              <EmptyTableState
                title={isFiltered ? "No matching activity events" : "No activity events recorded"}
                subtitle="System operations, auth transitions, and audit events will display here."
                onReset={isFiltered ? handleReset : undefined}
              />
            ) : (
              pagedActivities.map((entry) => (
                <tr key={entry.id} className="transition-colors hover:bg-surface-raised">
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-semibold text-sm text-ink">
                      <User size={13} className="text-ink-muted" />
                      <span>{entry.actor_name ?? "System Actor"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg border border-hairline bg-surface-raised px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink">
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink">{summarize(entry)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-ink-muted">
                    {entry.ip_address ?? "127.0.0.1"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableCard>

      {/* Secondary Card: PII Access & Unmasking Audit */}
      {!piiForbidden && combinedPii.length > 0 && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-ink">Recent PII Unmasking & Denials</h3>
          </div>
          <div className="divide-y divide-hairline border border-hairline rounded-xl overflow-hidden">
            {combinedPii.slice(0, 5).map((p, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      p.kind === "denied"
                        ? "bg-rose-500/10 text-danger border border-rose-500/30"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {p.kind}
                  </span>
                  <span className="font-medium text-ink">{p.detail}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-ink-muted text-[11px]">
                  <span>{new Date(p.at).toLocaleString()}</span>
                  {p.ip && <span>{p.ip}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
