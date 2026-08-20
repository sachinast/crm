"use client";

import React, { useState } from "react";
import DataTableCard from "@/components/shared/DataTableCard";
import {
  EmptyTableState,
  SortableHeader,
  TableSearchBar,
  useTableSortAndFilter,
} from "@/components/shared/SortableTable";
import EmbedSnippetButton from "@/app/(dashboard)/admin/integrations/EmbedSnippetButton";
import RevokeButton from "@/app/(dashboard)/admin/integrations/RevokeButton";
import ToggleWidgetButton from "@/app/(dashboard)/admin/integrations/ToggleWidgetButton";

export interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  assigned_agent_id: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface EmbedWidgetRow {
  id: string;
  name: string;
  widget_key: string;
  assigned_agent_id: string;
  is_active: boolean;
  submission_count: number;
  created_at: string;
}

export interface AgentOption {
  id: string;
  name: string;
  email: string;
}

export function ApiKeysTableClient({
  keys,
  agents,
}: {
  keys: ApiKeyRow[];
  agents: AgentOption[];
}) {
  const agentById = new Map(agents.map((a) => [a.id, a]));

  const {
    items: filteredKeys,
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDirection,
    toggleSort,
    resetFilters,
    isFiltered,
    totalCount,
    filteredCount,
  } = useTableSortAndFilter<ApiKeyRow>({
    data: keys,
    searchFields: ["name", "key_prefix", "assigned_agent_id"],
    initialSortKey: "created_at",
    initialSortDirection: "desc",
  });

  return (
    <DataTableCard
      headerContent={
        <TableSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Filter API keys..."
          totalCount={totalCount}
          filteredCount={filteredCount}
          isFiltered={isFiltered}
          onResetFilters={resetFilters}
        />
      }
    >
      <table className="table-modern w-full">
        <thead>
          <tr>
            <SortableHeader
              label="Name"
              columnKey="name"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Key Prefix"
              columnKey="key_prefix"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Lead Owner"
              columnKey="assigned_agent_id"
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
            />
            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-faint">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {filteredKeys.length === 0 ? (
            <EmptyTableState
              title={isFiltered ? "No matching API keys" : "No integration keys generated"}
              subtitle="Generate integration keys to connect Zapier, Make, and external webhooks."
              onReset={isFiltered ? resetFilters : undefined}
            />
          ) : (
            filteredKeys.map((k) => (
              <tr key={k.id} className="transition-colors hover:bg-surface-raised">
                <td className="px-4 py-3 font-semibold text-sm text-ink">{k.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-accent font-semibold">
                  {k.key_prefix}...
                </td>
                <td className="px-4 py-3 text-sm text-ink">
                  {agentById.get(k.assigned_agent_id)?.name ?? k.assigned_agent_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
                      k.is_active
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-surface-raised text-ink-muted border-hairline"
                    }`}
                  >
                    {k.is_active ? "Active" : "Revoked"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <RevokeButton keyId={k.id} isActive={k.is_active} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </DataTableCard>
  );
}

export function EmbedWidgetsTableClient({
  widgets,
  agents,
}: {
  widgets: EmbedWidgetRow[];
  agents: AgentOption[];
}) {
  const agentById = new Map(agents.map((a) => [a.id, a]));

  const {
    items: filteredWidgets,
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDirection,
    toggleSort,
    resetFilters,
    isFiltered,
    totalCount,
    filteredCount,
  } = useTableSortAndFilter<EmbedWidgetRow>({
    data: widgets,
    searchFields: ["name", "widget_key", "assigned_agent_id"],
    initialSortKey: "created_at",
    initialSortDirection: "desc",
  });

  return (
    <DataTableCard
      headerContent={
        <TableSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Filter web widgets..."
          totalCount={totalCount}
          filteredCount={filteredCount}
          isFiltered={isFiltered}
          onResetFilters={resetFilters}
        />
      }
    >
      <table className="table-modern w-full">
        <thead>
          <tr>
            <SortableHeader
              label="Widget Name"
              columnKey="name"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Assigned Agent"
              columnKey="assigned_agent_id"
              currentSortKey={sortKey as string | null}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <SortableHeader
              label="Leads Captured"
              columnKey="submission_count"
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
            />
            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-faint">
              Code / Embed
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {filteredWidgets.length === 0 ? (
            <EmptyTableState
              title={isFiltered ? "No matching web widgets" : "No web widgets created"}
              subtitle="Deploy dynamic booking intake widgets for landing pages."
              onReset={isFiltered ? resetFilters : undefined}
            />
          ) : (
            filteredWidgets.map((w) => (
              <tr key={w.id} className="transition-colors hover:bg-surface-raised">
                <td className="px-4 py-3 font-semibold text-sm text-ink">{w.name}</td>
                <td className="px-4 py-3 text-sm text-ink">
                  {agentById.get(w.assigned_agent_id)?.name ?? w.assigned_agent_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-accent">
                  {w.submission_count}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
                      w.is_active
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-surface-raised text-ink-muted border-hairline"
                    }`}
                  >
                    {w.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <EmbedSnippetButton widgetKey={w.widget_key} />
                    <ToggleWidgetButton widgetId={w.id} isActive={w.is_active} />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </DataTableCard>
  );
}
