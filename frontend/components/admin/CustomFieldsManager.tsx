"use client";

import { AlertTriangle, Plus, Trash2, Check, X, Shield } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createCustomField,
  deleteCustomField,
  updateCustomField,
  type CustomFieldDef,
  type EntityType,
  type FieldType,
} from "@/lib/custom-fields-api";
import DataTableCard from "@/components/shared/DataTableCard";
import {
  EmptyTableState,
  SortableHeader,
  TableSearchBar,
  useTableSortAndFilter,
} from "@/components/shared/SortableTable";

const ENTITY_TABS: { value: EntityType; label: string }[] = [
  { value: "lead", label: "Leads" },
  { value: "car_booking", label: "Car Bookings" },
  { value: "hotel_booking", label: "Hotel Bookings" },
  { value: "flight_booking", label: "Flight Bookings" },
];

const FIELD_TYPES: FieldType[] = ["text", "number", "date", "select", "checkbox"];

export default function CustomFieldsManager({ initialFields }: { initialFields: CustomFieldDef[] }) {
  const [fields, setFields] = useState(initialFields);
  const [activeEntity, setActiveEntity] = useState<EntityType>("lead");
  const [showNew, setShowNew] = useState(false);
  const [newField, setNewField] = useState({
    key: "",
    label: "",
    field_type: "text" as FieldType,
    options: "",
    is_required: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const entityFilteredFields = useMemo(
    () => fields.filter((f) => f.entity_type === activeEntity),
    [fields, activeEntity],
  );

  const {
    items: visibleFields,
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDirection,
    toggleSort,
    resetFilters,
    isFiltered,
    totalCount,
    filteredCount,
  } = useTableSortAndFilter<CustomFieldDef>({
    data: entityFilteredFields,
    searchFields: ["label", "key", "field_type"],
    initialSortKey: "display_order",
    initialSortDirection: "asc",
  });

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const created = await createCustomField({
        entity_type: activeEntity,
        key: newField.key.trim(),
        label: newField.label.trim(),
        field_type: newField.field_type,
        options: newField.field_type === "select" ? newField.options.split(",").map((o) => o.trim()).filter(Boolean) : null,
        is_required: newField.is_required,
      });
      setFields((prev) => [...prev, created]);
      setShowNew(false);
      setNewField({ key: "", label: "", field_type: "text", options: "", is_required: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create custom field");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRequired(field: CustomFieldDef) {
    try {
      const updated = await updateCustomField(field.id, { is_required: !field.is_required });
      setFields((prev) => prev.map((f) => (f.id === field.id ? updated : f)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update custom field");
    }
  }

  async function handleDelete(field: CustomFieldDef) {
    try {
      await deleteCustomField(field.id);
      setFields((prev) => prev.filter((f) => f.id !== field.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete custom field");
    }
  }

  return (
    <div className="space-y-4">
      {/* Create New Field Modal / Drawer Card */}
      {showNew && (
        <div className="rounded-2xl border border-[var(--accent)] bg-[var(--surface-raised)] p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3">
            <h2 className="text-sm font-bold text-[var(--ink)]">
              Add New Custom Field for {ENTITY_TABS.find((t) => t.value === activeEntity)?.label}
            </h2>
            <button
              onClick={() => setShowNew(false)}
              className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-800/50 bg-rose-950/40 p-3 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-muted)]">
                Field Label (UI Display)
              </label>
              <input
                value={newField.label}
                onChange={(e) =>
                  setNewField((prev) => ({
                    ...prev,
                    label: e.target.value,
                    key: prev.key || e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"),
                  }))
                }
                placeholder="e.g. Flight PNR or Hotel Voucher"
                className="input mt-1 w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ink-muted)]">
                Field Key (DB Identifier)
              </label>
              <input
                value={newField.key}
                onChange={(e) => setNewField((prev) => ({ ...prev, key: e.target.value }))}
                placeholder="e.g. flight_pnr"
                className="input mt-1 w-full font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ink-muted)]">
                Data Type
              </label>
              <select
                value={newField.field_type}
                onChange={(e) =>
                  setNewField((prev) => ({ ...prev, field_type: e.target.value as FieldType }))
                }
                className="select mt-1 w-full text-sm"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {newField.field_type === "select" && (
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-muted)]">
                  Dropdown Options (comma-separated)
                </label>
                <input
                  value={newField.options}
                  onChange={(e) => setNewField((prev) => ({ ...prev, options: e.target.value }))}
                  placeholder="Option 1, Option 2, Option 3"
                  className="input mt-1 w-full text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--ink-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={newField.is_required}
                onChange={(e) =>
                  setNewField((prev) => ({ ...prev, is_required: e.target.checked }))
                }
                className="h-4 w-4 rounded accent-[var(--accent)]"
              />
              <span>Mark field as required on intake & updates</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNew(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newField.key.trim() || !newField.label.trim()}
                className="btn-primary"
              >
                {saving ? "Saving..." : "Create Field"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Aligned DataTableCard Grid */}
      <DataTableCard
        headerContent={
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {ENTITY_TABS.map((tab) => {
                  const isActive = activeEntity === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => {
                        setActiveEntity(tab.value);
                        resetFilters();
                      }}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-accent text-white font-bold shadow-xs"
                          : "bg-surface text-ink-muted border border-hairline hover:bg-surface-raised hover:text-ink"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowNew(true)}
                  className="btn-primary"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>New Field</span>
                </button>
              </div>
            </div>

            <TableSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search custom fields by label or key..."
              totalCount={totalCount}
              filteredCount={filteredCount}
              isFiltered={isFiltered}
              onResetFilters={resetFilters}
            />
          </div>
        }
      >
        <table className="table-modern w-full">
          <thead>
            <tr>
              <SortableHeader
                label="Display Label"
                columnKey="label"
                currentSortKey={sortKey as string | null}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Database Key"
                columnKey="key"
                currentSortKey={sortKey as string | null}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Field Type"
                columnKey="field_type"
                currentSortKey={sortKey as string | null}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Required"
                columnKey="is_required"
                currentSortKey={sortKey as string | null}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-faint">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {visibleFields.length === 0 ? (
              <EmptyTableState
                title={isFiltered ? "No matching custom fields" : `No custom fields defined for ${ENTITY_TABS.find((t) => t.value === activeEntity)?.label}`}
                subtitle={
                  isFiltered
                    ? "Try adjusting your search query."
                    : "Add new custom fields to capture specialized booking requirements."
                }
                onReset={isFiltered ? resetFilters : undefined}
              />
            ) : (
              visibleFields.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-surface-raised">
                  <td className="px-4 py-3.5 font-semibold text-sm text-ink">
                    {f.label}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-sm text-accent font-semibold">
                    {f.key}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-muted">
                    <span className="inline-flex items-center rounded-lg border border-hairline bg-surface-raised px-2.5 py-0.5 font-mono text-xs uppercase font-semibold text-ink">
                      {f.field_type}
                    </span>
                    {f.field_type === "select" && f.options && (
                      <span className="ml-2 text-xs text-ink-faint">
                        ({f.options.join(", ")})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleToggleRequired(f)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
                        f.is_required
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-surface-raised text-ink-muted border-hairline"
                      }`}
                    >
                      {f.is_required ? "Required" : "Optional"}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(f)}
                      className="btn-ghost btn-sm px-2 text-danger hover:bg-rose-500/10 transition-colors"
                      title="Delete field definition"
                    >
                      <Trash2 size={15} />
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
