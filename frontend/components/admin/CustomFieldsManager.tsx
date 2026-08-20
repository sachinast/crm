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

  const visibleFields = useMemo(
    () => fields.filter((f) => f.entity_type === activeEntity).sort((a, b) => a.display_order - b.display_order),
    [fields, activeEntity],
  );

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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">Field Database Key</label>
              <input
                placeholder="e.g. referral_source"
                value={newField.key}
                onChange={(e) => setNewField({ ...newField, key: e.target.value })}
                className="input font-mono text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">Display Label</label>
              <input
                placeholder="e.g. Referral Source"
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                className="input text-sm font-medium"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">Data Type</label>
              <select
                value={newField.field_type}
                onChange={(e) => setNewField({ ...newField, field_type: e.target.value as FieldType })}
                className="input text-sm"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={newField.is_required}
                  onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                  className="h-4 w-4 rounded border-[var(--hairline-strong)] bg-surface text-accent focus:ring-accent accent-amber-500"
                />
                <span>Required field on intake</span>
              </label>
            </div>

            {newField.field_type === "select" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]">Dropdown Options (comma separated)</label>
                <input
                  placeholder="e.g. Direct, Google, Referral, Affiliate"
                  value={newField.options}
                  onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                  className="input text-sm"
                />
              </div>
            )}
          </div>

          {error && (
            <p className="alert-danger">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={saving || !newField.key.trim() || !newField.label.trim()}
              className="btn-primary"
            >
              {saving ? "Creating…" : "Save Custom Field"}
            </button>
            <button onClick={() => setShowNew(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Aligned DataTableCard Grid */}
      <DataTableCard
        headerContent={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {ENTITY_TABS.map((tab) => {
                const isActive = activeEntity === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveEntity(tab.value)}
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
              <span className="rounded-full bg-surface-raised border border-hairline px-2.5 py-0.5 text-xs font-mono font-bold text-ink-muted">
                {visibleFields.length} {visibleFields.length === 1 ? "field" : "fields"}
              </span>

              <button
                onClick={() => setShowNew(true)}
                className="btn-primary"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>New Field</span>
              </button>
            </div>
          </div>
        }
      >
        <table className="table-modern w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                Display Label
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                Database Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                Field Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                Required
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--hairline)]">
            {visibleFields.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-[var(--ink-muted)]">
                  No custom fields defined for {ENTITY_TABS.find((t) => t.value === activeEntity)?.label} yet.
                </td>
              </tr>
            ) : (
              visibleFields.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-[var(--surface-raised)]">
                  <td className="px-4 py-3.5 font-semibold text-sm text-[var(--ink)]">
                    {f.label}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-sm text-[var(--accent)] font-semibold">
                    {f.key}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[var(--ink-muted)]">
                    <span className="inline-flex items-center rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] px-2.5 py-0.5 font-mono text-xs uppercase font-semibold text-[var(--ink)]">
                      {f.field_type}
                    </span>
                    {f.field_type === "select" && f.options && (
                      <span className="ml-2 text-xs text-[var(--ink-faint)]">
                        ({f.options.join(", ")})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleToggleRequired(f)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
                        f.is_required
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40 [data-theme=light]:bg-emerald-50 [data-theme=light]:text-emerald-700 [data-theme=light]:border-emerald-200"
                          : "bg-slate-800/50 text-slate-400 border-slate-700/50 [data-theme=light]:bg-slate-100 [data-theme=light]:text-slate-700 [data-theme=light]:border-slate-200"
                      }`}
                    >
                      {f.is_required ? "Required" : "Optional"}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(f)}
                      className="rounded-xl p-2 text-[var(--ink-muted)] hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
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
