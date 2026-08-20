"use client";

import { Plus, Trash2, Database, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createMasterOption,
  deleteMasterOption,
  type MasterFieldKey,
  type MasterOption,
} from "@/lib/master-options-api";
import DataTableCard from "@/components/shared/DataTableCard";
import {
  EmptyTableState,
  SortableHeader,
  TableSearchBar,
  useTableSortAndFilter,
} from "@/components/shared/SortableTable";

const FIELDS: { value: MasterFieldKey; label: string }[] = [
  { value: "booking_platform", label: "Booking Platform" },
  { value: "airline", label: "Airline" },
  { value: "cabin_class", label: "Cabin Class" },
  { value: "hotel_name", label: "Hotel Name" },
  { value: "room_type", label: "Room Type" },
  { value: "car_provider", label: "Car Provider" },
  { value: "vehicle_type", label: "Vehicle Type" },
  { value: "transmission", label: "Transmission" },
  { value: "fuel_policy", label: "Fuel Policy" },
];

export default function MasterOptionsManager({ initialOptions }: { initialOptions: MasterOption[] }) {
  const [options, setOptions] = useState(initialOptions);
  const [active, setActive] = useState<MasterFieldKey>("booking_platform");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeCategoryOptions = useMemo(
    () => options.filter((o) => o.field_key === active),
    [options, active],
  );

  const {
    items: visibleOptions,
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDirection,
    toggleSort,
    resetFilters,
    isFiltered,
    totalCount,
    filteredCount,
  } = useTableSortAndFilter<MasterOption>({
    data: activeCategoryOptions,
    searchFields: ["value", "field_key"],
    initialSortKey: "display_order",
    initialSortDirection: "asc",
  });

  async function handleAdd() {
    if (!newValue.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createMasterOption(active, newValue.trim());
      setOptions((prev) => [...prev, created]);
      setNewValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add option");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMasterOption(id);
      setOptions((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete option");
    }
  }

  return (
    <div className="space-y-4">
      {/* Aligned DataTableCard Grid */}
      <DataTableCard
        headerContent={
          <div className="flex flex-col gap-3 w-full">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 py-0.5">
              {FIELDS.map((f) => {
                const isActive = active === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => {
                      setActive(f.value);
                      resetFilters();
                    }}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-accent text-white font-bold shadow-xs"
                        : "bg-surface text-ink-muted border border-hairline hover:bg-surface-raised hover:text-ink"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <TableSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder={`Search ${FIELDS.find((f) => f.value === active)?.label} values...`}
              totalCount={totalCount}
              filteredCount={filteredCount}
              isFiltered={isFiltered}
              onResetFilters={resetFilters}
            />
          </div>
        }
      >
        {/* Quick Add Toolbar */}
        <div className="p-3.5 bg-surface-raised/40 border-b border-hairline">
          <div className="flex items-center gap-2 max-w-md">
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={`Add new ${FIELDS.find((f) => f.value === active)?.label} value...`}
              className="input text-xs"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newValue.trim()}
              className="btn-primary btn-sm shrink-0"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add</span>
            </button>
          </div>

          {error && (
            <p className="mt-2 alert-danger flex items-center gap-1.5">
              <AlertTriangle size={13} />
              <span>{error}</span>
            </p>
          )}
        </div>

        <table className="table-modern w-full">
          <thead>
            <tr>
              <SortableHeader
                label="Option Display Value"
                columnKey="value"
                currentSortKey={sortKey as string | null}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Category Master"
                columnKey="field_key"
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
            {visibleOptions.length === 0 ? (
              <EmptyTableState
                title={isFiltered ? "No matching options found" : "No dropdown values defined for this category"}
                subtitle={
                  isFiltered
                    ? "Try adjusting your search query."
                    : "Add new master option values using the input above."
                }
                onReset={isFiltered ? resetFilters : undefined}
              />
            ) : (
              visibleOptions.map((opt) => (
                <tr key={opt.id} className="transition-colors hover:bg-surface-raised">
                  <td className="px-4 py-3 font-semibold text-sm text-ink">
                    {opt.value}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-accent">
                    {opt.field_key}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(opt.id)}
                      className="rounded-xl p-1.5 text-ink-faint hover:bg-rose-500/10 hover:text-danger transition-colors"
                      title="Delete option"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableCard>
    </div>
  );
}
