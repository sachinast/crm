"use client";

import { Plus, Trash2, AlertTriangle } from "lucide-react";
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

export const CORE_MASTER_FIELDS: { value: MasterFieldKey; label: string }[] = [
  { value: "booking_source", label: "Booking Source" },
  { value: "transaction_type", label: "Transaction Type" },
  { value: "booking_status", label: "Booking Status" },
  { value: "call_type", label: "Call Type" },
  { value: "main_category", label: "Main Category" },
  { value: "room_type", label: "Room Type" },
  { value: "lead_tag", label: "Lead Tag" },
  { value: "leads_booking_source", label: "Leads Booking Source" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title" },
  { value: "class_of_service", label: "Class of Service" },
  { value: "airline", label: "Airline" },
  { value: "cabin_class", label: "Cabin Class" },
  { value: "vehicle_type", label: "Vehicle Type" },
  { value: "transmission", label: "Transmission" },
  { value: "car_provider", label: "Car Provider" },
  { value: "hotel_name", label: "Hotel Name" },
  { value: "fuel_policy", label: "Fuel Policy" },
  { value: "booking_platform", label: "Booking Platform" },
];

export const ADDON_FIELDS: { value: MasterFieldKey; label: string }[] = [
  { value: "add_on_services", label: "Add-on Services" },
  { value: "hk_gk", label: "HK / GK" },
  { value: "currency", label: "Currency" },
  { value: "mco_charges", label: "MCO Charges" },
  { value: "insurance_coverage", label: "Insurance / Coverage" },
  { value: "flight_ancillaries", label: "Flight Ancillaries" },
];

export interface MasterOptionsManagerProps {
  initialOptions: MasterOption[];
  optionType?: "master" | "addon";
  fields?: { value: MasterFieldKey; label: string }[];
}

export default function MasterOptionsManager({
  initialOptions,
  optionType = "master",
  fields,
}: MasterOptionsManagerProps) {
  const activeFields = fields ?? (optionType === "addon" ? ADDON_FIELDS : CORE_MASTER_FIELDS);
  const [options, setOptions] = useState(initialOptions);
  const [active, setActive] = useState<MasterFieldKey>(activeFields[0]?.value ?? "booking_source");
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
      const created = await createMasterOption(active, newValue.trim(), optionType);
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

  const currentFieldLabel = activeFields.find((f) => f.value === active)?.label ?? active;

  return (
    <div className="space-y-4">
      {/* Aligned DataTableCard Grid */}
      <DataTableCard
        headerContent={
          <div className="flex flex-col gap-3 w-full">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 py-0.5">
              {activeFields.map((f) => {
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
              placeholder={`Search ${currentFieldLabel} values...`}
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
              placeholder={`Add new ${currentFieldLabel} value...`}
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
                label="Category Key"
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
