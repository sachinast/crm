"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, X } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

export interface UseTableSortAndFilterOptions<T> {
  data: T[];
  searchFields?: (keyof T | ((item: T) => string | number | boolean | null | undefined))[];
  initialSortKey?: keyof T | string | null;
  initialSortDirection?: SortDirection;
  filterFn?: (item: T, filters: Record<string, string>) => boolean;
}

export function useTableSortAndFilter<T>({
  data,
  searchFields,
  initialSortKey = null,
  initialSortDirection = null,
  filterFn,
}: UseTableSortAndFilterOptions<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | string | null>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [filters, setFilters] = useState<Record<string, string>>({});

  function toggleSort(key: keyof T | string) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else if (sortDirection === "desc") {
      setSortKey(null);
      setSortDirection(null);
    } else {
      setSortDirection("asc");
    }
  }

  function setFilter(key: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      if (!value || value === "all") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }

  function resetFilters() {
    setSearchQuery("");
    setFilters({});
    setSortKey(initialSortKey);
    setSortDirection(initialSortDirection);
  }

  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Filter by Search Query
    const query = searchQuery.trim().toLowerCase();
    if (query && searchFields && searchFields.length > 0) {
      result = result.filter((item) => {
        return searchFields.some((field) => {
          let val: unknown;
          if (typeof field === "function") {
            val = field(item);
          } else {
            val = item[field];
          }
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        });
      });
    }

    // 2. Custom Key-Value Filters
    if (filterFn && Object.keys(filters).length > 0) {
      result = result.filter((item) => filterFn(item, filters));
    }

    // 3. Sorting
    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        const valA = (a as Record<string, unknown>)[sortKey as string];
        const valB = (b as Record<string, unknown>)[sortKey as string];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        // Number comparison
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        // Date / String comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        // Check if string is a valid ISO date
        const dateA = Date.parse(String(valA));
        const dateB = Date.parse(String(valB));
        if (!isNaN(dateA) && !isNaN(dateB) && (strA.includes("-") || strA.includes("/"))) {
          return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        }

        const cmp = strA.localeCompare(strB);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, searchQuery, searchFields, filters, filterFn, sortKey, sortDirection]);

  const isFiltered = searchQuery.trim().length > 0 || Object.keys(filters).length > 0 || sortKey !== null;

  return {
    items: processedData,
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDirection,
    toggleSort,
    filters,
    setFilter,
    resetFilters,
    isFiltered,
    totalCount: data.length,
    filteredCount: processedData.length,
  };
}

export interface SortableHeaderProps {
  label: string;
  columnKey: string;
  currentSortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
  align?: "left" | "center" | "right";
  className?: string;
}

export function SortableHeader({
  label,
  columnKey,
  currentSortKey,
  sortDirection,
  onSort,
  align = "left",
  className = "",
}: SortableHeaderProps) {
  const isActive = currentSortKey === columnKey && sortDirection !== null;

  const alignClass =
    align === "right" ? "justify-end text-right" : align === "center" ? "justify-center text-center" : "justify-start text-left";

  return (
    <th
      className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-faint select-none ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`group flex items-center gap-1.5 font-bold transition-colors w-full ${alignClass} ${
          isActive ? "text-accent" : "hover:text-ink text-ink-muted"
        }`}
        title={`Sort by ${label} (${isActive ? (sortDirection === "asc" ? "Ascending" : "Descending") : "Click to sort"})`}
      >
        <span>{label}</span>
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors ${
            isActive ? "text-accent bg-accent-soft" : "text-ink-faint opacity-50 group-hover:opacity-100"
          }`}
        >
          {isActive ? (
            sortDirection === "asc" ? (
              <ChevronUp size={13} className="stroke-[2.5]" />
            ) : (
              <ChevronDown size={13} className="stroke-[2.5]" />
            )
          ) : (
            <ChevronsUpDown size={12} />
          )}
        </span>
      </button>
    </th>
  );
}

export interface TableSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  totalCount: number;
  filteredCount: number;
  isFiltered?: boolean;
  onResetFilters?: () => void;
  children?: React.ReactNode;
}

export function TableSearchBar({
  searchQuery,
  onSearchChange,
  placeholder = "Search records...",
  totalCount,
  filteredCount,
  isFiltered,
  onResetFilters,
  children,
}: TableSearchBarProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      {/* Left side: Search bar & optional filters */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="input w-full pl-9 pr-8 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Injected Filter Controls */}
        {children}

        {/* Reset All Filters Button */}
        {isFiltered && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="btn-ghost btn-sm text-xs font-semibold text-danger hover:bg-rose-500/10 flex items-center gap-1"
          >
            <X size={13} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Right side: Dynamic Records Count badge */}
      <div className="flex items-center gap-2 text-xs text-ink-muted font-medium shrink-0">
        <span className="rounded-full bg-surface-raised border border-hairline px-2.5 py-1 font-mono font-bold text-ink">
          {filteredCount} {filteredCount === 1 ? "match" : "matches"}
          {totalCount !== filteredCount && (
            <span className="text-ink-faint font-normal"> / {totalCount} total</span>
          )}
        </span>
      </div>
    </div>
  );
}

export function EmptyTableState({
  title = "No matching records found",
  subtitle = "Try adjusting your search criteria or clear your active filters.",
  onReset,
}: {
  title?: string;
  subtitle?: string;
  onReset?: () => void;
}) {
  return (
    <tr>
      <td colSpan={100} className="py-14 text-center">
        <div className="mx-auto flex max-w-xs flex-col items-center justify-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-hairline bg-surface-raised text-ink-muted">
            <Search size={20} />
          </div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="mt-3.5 btn-secondary btn-sm text-xs"
            >
              Clear Search & Filters
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
