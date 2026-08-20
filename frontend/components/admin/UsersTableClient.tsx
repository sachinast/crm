"use client";

import React, { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import DataTableCard from "@/components/shared/DataTableCard";
import {
  EmptyTableState,
  SortableHeader,
  TableSearchBar,
  useTableSortAndFilter,
} from "@/components/shared/SortableTable";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  ip_whitelist_enabled: boolean;
}

export default function UsersTableClient({ users }: { users: UserRow[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => u.role && set.add(u.role));
    return Array.from(set).sort();
  }, [users]);

  const {
    items: filteredUsers,
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
  } = useTableSortAndFilter<UserRow>({
    data: users,
    searchFields: ["name", "email", "role"],
    initialSortKey: "name",
    initialSortDirection: "asc",
    filterFn: (user, activeFilters) => {
      if (activeFilters.role && user.role.toLowerCase() !== activeFilters.role.toLowerCase()) {
        return false;
      }
      if (activeFilters.status === "active" && !user.is_active) {
        return false;
      }
      if (activeFilters.status === "inactive" && user.is_active) {
        return false;
      }
      return true;
    },
  });

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

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
          placeholder="Filter by name, email..."
          totalCount={totalCount}
          filteredCount={filteredCount}
          isFiltered={isFiltered}
          onResetFilters={handleReset}
        >
          {/* Role Filter Dropdown */}
          <div className="relative">
            <select
              value={filters.role || "all"}
              onChange={(e) => {
                setFilter("role", e.target.value);
                setCurrentPage(1);
              }}
              className="select text-xs py-1.5 pl-3 pr-8 min-w-[130px] font-medium"
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative">
            <select
              value={filters.status || "all"}
              onChange={(e) => {
                setFilter("status", e.target.value);
                setCurrentPage(1);
              }}
              className="select text-xs py-1.5 pl-3 pr-8 min-w-[110px] font-medium"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
              <span className="font-semibold text-ink">{filteredCount}</span> accounts
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
              label="User Name"
              columnKey="name"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Email Address"
              columnKey="email"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Assigned Role"
              columnKey="role"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Status"
              columnKey="is_active"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
              align="right"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {pagedUsers.length === 0 ? (
            <EmptyTableState
              title={isFiltered ? "No matching accounts found" : "No user accounts found"}
              subtitle={
                isFiltered
                  ? "Try clearing your search query or filters."
                  : "Provision accounts using the creation form."
              }
              onReset={isFiltered ? handleReset : undefined}
            />
          ) : (
            pagedUsers.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-surface-raised">
                <td className="px-4 py-3 font-semibold text-sm text-ink">{u.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{u.email}</td>
                <td className="px-4 py-3 capitalize text-sm text-ink">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-raised px-2.5 py-0.5 text-xs font-medium">
                    <ShieldCheck size={13} className="text-accent" />
                    <span>{u.role.replace(/_/g, " ")}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
                      u.is_active
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-surface-raised text-ink-muted border-hairline"
                    }`}
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </DataTableCard>
  );
}
