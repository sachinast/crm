"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

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

interface UsersTableClientProps {
  users: UserRow[];
  isSuperAdmin?: boolean;
  currentUserId?: string;
}

export default function UsersTableClient({
  users,
  isSuperAdmin = false,
  currentUserId,
}: UsersTableClientProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [userList, setUserList] = useState<UserRow[]>(users);

  // Sync state if server component refreshes props
  useEffect(() => {
    setUserList(users);
  }, [users]);

  // Modal and deletion state
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    text: string;
    type: "success" | "info" | "error";
  } | null>(null);

  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    userList.forEach((u) => u.role && set.add(u.role));
    return Array.from(set).sort();
  }, [userList]);

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
    data: userList,
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

  async function handleConfirmDelete() {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data.detail || data.error || data.message || "Failed to remove user account.";
        setDeleteError(msg);
        setIsDeleting(false);
        return;
      }

      if (data.deleted) {
        // Permanently purged from DB
        setUserList((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setAlertMessage({
          text: data.message || `User '${userToDelete.name}' was permanently removed.`,
          type: "success",
        });
      } else {
        // Deactivated to preserve regulatory audit trails
        setUserList((prev) =>
          prev.map((u) => (u.id === userToDelete.id ? { ...u, is_active: false } : u))
        );
        setAlertMessage({
          text:
            data.message ||
            `User '${userToDelete.name}' has historical records and was deactivated to preserve compliance history.`,
          type: "info",
        });
      }

      setUserToDelete(null);
      router.refresh();
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "A network error occurred.";
      setDeleteError(errMessage);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Alert banner for feedback */}
      {alertMessage && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl p-3.5 text-xs font-medium border shadow-xs animate-in fade-in duration-200 ${
            alertMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : alertMessage.type === "info"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMessage.type === "success" ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <AlertTriangle size={16} className="shrink-0" />
            )}
            <span>{alertMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertMessage(null)}
            className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
              {isSuperAdmin && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-muted">
                  Actions
                </th>
              )}
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
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-right">
                      {u.id === currentUserId ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-ink-faint bg-surface-raised border border-hairline">
                          (You)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setUserToDelete(u);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition-colors shadow-2xs"
                          title="Remove user account"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableCard>

      {/* Super Admin Remove User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Remove User Account</h3>
                  <p className="text-xs text-ink-muted">Super Admin access control</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteError(null);
                }}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-raised hover:text-ink transition-colors disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3.5 text-xs">
              <p className="text-ink">
                Are you sure you want to remove{" "}
                <strong className="font-bold text-ink">{userToDelete.name}</strong>?
              </p>

              <div className="rounded-xl border border-hairline bg-surface-raised p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Email:</span>
                  <span className="font-mono font-semibold text-ink">{userToDelete.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Role:</span>
                  <span className="capitalize font-semibold text-accent">
                    {userToDelete.role.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Current Status:</span>
                  <span
                    className={`font-bold uppercase text-[11px] ${
                      userToDelete.is_active
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-ink-muted"
                    }`}
                  >
                    {userToDelete.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>Compliance & Audit Protection</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  If this user has generated bookings, leads, or regulatory audit logs, their account
                  will be permanently deactivated to preserve compliance history. Accounts without
                  history will be completely deleted.
                </p>
              </div>

              {deleteError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-600 dark:text-rose-400 flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{deleteError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-hairline">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteError(null);
                }}
                className="btn-secondary btn-sm text-xs font-semibold px-4 py-2 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Confirm Remove</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
