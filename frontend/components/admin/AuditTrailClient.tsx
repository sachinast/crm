"use client";

import React, { useState } from "react";
import Link from "next/link";

import DataTableCard from "@/components/shared/DataTableCard";
import {
  EmptyTableState,
  SortableHeader,
  TableSearchBar,
  useTableSortAndFilter,
} from "@/components/shared/SortableTable";

export interface ProcessLogEntry {
  id: string;
  lead_id: string;
  actor_id: string;
  action: string;
  field_changed: string | null;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
}

export interface PiiRevealEntry {
  id: string;
  lead_id: string;
  agent_id: string;
  field_revealed: string;
  reason: string;
  ip_address: string;
  revealed_at: string;
}

export interface AccessLogEntry {
  id: string;
  lead_id: string;
  opened_by: string;
  opened_at: string;
}

export default function AuditTrailClient({
  processLogs,
  piiReveals,
  accessLogs,
  initialTab = "process",
}: {
  processLogs: ProcessLogEntry[];
  piiReveals: PiiRevealEntry[];
  accessLogs: AccessLogEntry[];
  initialTab?: string;
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Process logs sort & filter
  const processState = useTableSortAndFilter<ProcessLogEntry>({
    data: processLogs,
    searchFields: ["action", "lead_id", "actor_id", "field_changed"],
    initialSortKey: "created_at",
    initialSortDirection: "desc",
  });

  // PII unmasking sort & filter
  const piiState = useTableSortAndFilter<PiiRevealEntry>({
    data: piiReveals,
    searchFields: ["field_revealed", "reason", "lead_id", "agent_id", "ip_address"],
    initialSortKey: "revealed_at",
    initialSortDirection: "desc",
  });

  // Record access sort & filter
  const accessState = useTableSortAndFilter<AccessLogEntry>({
    data: accessLogs,
    searchFields: ["lead_id", "opened_by"],
    initialSortKey: "opened_at",
    initialSortDirection: "desc",
  });

  const activeState =
    activeTab === "pii" ? piiState : activeTab === "access" ? accessState : processState;

  const totalPages = Math.max(1, Math.ceil(activeState.filteredCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;

  const pagedProcess = processState.items.slice(startIndex, startIndex + pageSize);
  const pagedPii = piiState.items.slice(startIndex, startIndex + pageSize);
  const pagedAccess = accessState.items.slice(startIndex, startIndex + pageSize);

  const TABS = [
    { id: "process", label: "Booking Process Log", count: processLogs.length },
    { id: "pii", label: "PII Unmasking Log", count: piiReveals.length },
    { id: "access", label: "Record Access Log", count: accessLogs.length },
  ];

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id);
                setCurrentPage(1);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-accent text-white font-bold shadow-xs"
                  : "bg-surface text-ink-muted border border-hairline hover:bg-surface-raised hover:text-ink"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  isActive ? "bg-white/20 text-white font-bold" : "bg-surface-raised text-ink-faint"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <DataTableCard
        headerContent={
          <TableSearchBar
            searchQuery={activeState.searchQuery}
            onSearchChange={(q) => {
              activeState.setSearchQuery(q);
              setCurrentPage(1);
            }}
            placeholder={`Filter ${activeTab} audit logs...`}
            totalCount={activeState.totalCount}
            filteredCount={activeState.filteredCount}
            isFiltered={activeState.isFiltered}
            onResetFilters={() => {
              activeState.resetFilters();
              setCurrentPage(1);
            }}
          />
        }
        footerContent={
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-ink-muted">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                Showing <span className="font-semibold text-ink">{activeState.filteredCount === 0 ? 0 : startIndex + 1}</span> to{" "}
                <span className="font-semibold text-ink">{Math.min(startIndex + pageSize, activeState.filteredCount)}</span> of{" "}
                <span className="font-semibold text-ink">{activeState.filteredCount}</span> entries
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
        {/* Booking Process Log Table */}
        {activeTab === "process" && (
          <table className="table-modern w-full">
            <thead>
              <tr>
                <SortableHeader
                  label="Timestamp"
                  columnKey="created_at"
                  currentSortKey={processState.sortKey as string | null}
                  sortDirection={processState.sortDirection}
                  onSort={processState.toggleSort}
                />
                <SortableHeader
                  label="Action / Mutation"
                  columnKey="action"
                  currentSortKey={processState.sortKey as string | null}
                  sortDirection={processState.sortDirection}
                  onSort={processState.toggleSort}
                />
                <SortableHeader
                  label="Target Lead"
                  columnKey="lead_id"
                  currentSortKey={processState.sortKey as string | null}
                  sortDirection={processState.sortDirection}
                  onSort={processState.toggleSort}
                />
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                  Attribute Changes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {pagedProcess.length === 0 ? (
                <EmptyTableState
                  title={processState.isFiltered ? "No matching process logs" : "No process logs found"}
                  subtitle="Booking pipeline status transitions and edits are logged here."
                  onReset={processState.isFiltered ? () => processState.resetFilters() : undefined}
                />
              ) : (
                pagedProcess.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-surface-raised">
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-sm text-ink">{r.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-accent">
                      <Link href={`/leads/${r.lead_id}`} className="hover:underline">
                        {r.lead_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {r.field_changed ? (
                        <span>
                          <span className="font-semibold text-ink">{r.field_changed}</span>:{" "}
                          {JSON.stringify(r.old_value)} → {JSON.stringify(r.new_value)}
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* PII Unmasking Log Table */}
        {activeTab === "pii" && (
          <table className="table-modern w-full">
            <thead>
              <tr>
                <SortableHeader
                  label="Timestamp"
                  columnKey="revealed_at"
                  currentSortKey={piiState.sortKey as string | null}
                  sortDirection={piiState.sortDirection}
                  onSort={piiState.toggleSort}
                />
                <SortableHeader
                  label="Field Revealed"
                  columnKey="field_revealed"
                  currentSortKey={piiState.sortKey as string | null}
                  sortDirection={piiState.sortDirection}
                  onSort={piiState.toggleSort}
                />
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                  Reason & Agent
                </th>
                <SortableHeader
                  label="IP Address"
                  columnKey="ip_address"
                  currentSortKey={piiState.sortKey as string | null}
                  sortDirection={piiState.sortDirection}
                  onSort={piiState.toggleSort}
                  align="right"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {pagedPii.length === 0 ? (
                <EmptyTableState
                  title={piiState.isFiltered ? "No matching PII access records" : "No PII unmasking events"}
                  subtitle="Explicit customer data unmasking reasons are logged here."
                  onReset={piiState.isFiltered ? () => piiState.resetFilters() : undefined}
                />
              ) : (
                pagedPii.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-surface-raised">
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {new Date(r.revealed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {r.field_revealed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      &ldquo;{r.reason}&rdquo; · agent{" "}
                      <span className="font-mono text-ink">{r.agent_id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-ink-muted">
                      {r.ip_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Record Access Log Table */}
        {activeTab === "access" && (
          <table className="table-modern w-full">
            <thead>
              <tr>
                <SortableHeader
                  label="Opened Timestamp"
                  columnKey="opened_at"
                  currentSortKey={accessState.sortKey as string | null}
                  sortDirection={accessState.sortDirection}
                  onSort={accessState.toggleSort}
                />
                <SortableHeader
                  label="Target Lead"
                  columnKey="lead_id"
                  currentSortKey={accessState.sortKey as string | null}
                  sortDirection={accessState.sortDirection}
                  onSort={accessState.toggleSort}
                />
                <SortableHeader
                  label="Agent ID"
                  columnKey="opened_by"
                  currentSortKey={accessState.sortKey as string | null}
                  sortDirection={accessState.sortDirection}
                  onSort={accessState.toggleSort}
                  align="right"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {pagedAccess.length === 0 ? (
                <EmptyTableState
                  title={accessState.isFiltered ? "No matching access logs" : "No record access events"}
                  subtitle="Lead workspace views and accesses are recorded here."
                  onReset={accessState.isFiltered ? () => accessState.resetFilters() : undefined}
                />
              ) : (
                pagedAccess.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-surface-raised">
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {new Date(r.opened_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-accent">
                      <Link href={`/leads/${r.lead_id}`} className="hover:underline">
                        {r.lead_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-ink-muted">
                      {r.opened_by}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </DataTableCard>
    </div>
  );
}
