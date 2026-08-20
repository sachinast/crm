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
        <div className="rounded-2xl border border-[#d3ab5e] bg-[#131a2b] p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#232e47] pb-3">
            <h2 className="text-sm font-bold text-white">
              Add New Custom Field for {ENTITY_TABS.find((t) => t.value === activeEntity)?.label}
            </h2>
            <button
              onClick={() => setShowNew(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Field Database Key</label>
              <input
                placeholder="e.g. referral_source"
                value={newField.key}
                onChange={(e) => setNewField({ ...newField, key: e.target.value })}
                className="input font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Display Label</label>
              <input
                placeholder="e.g. Referral Source"
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                className="input text-xs font-medium"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Data Type</label>
              <select
                value={newField.field_type}
                onChange={(e) => setNewField({ ...newField, field_type: e.target.value as FieldType })}
                className="input text-xs"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newField.is_required}
                  onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                  className="h-4 w-4 rounded border-[#313f61] bg-[#0d1220]"
                  style={{ accentColor: "#d3ab5e" }}
                />
                <span>Required field on intake</span>
              </label>
            </div>

            {newField.field_type === "select" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-300">Dropdown Options (comma separated)</label>
                <input
                  placeholder="e.g. Direct, Google, Referral, Affiliate"
                  value={newField.options}
                  onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                  className="input text-xs"
                />
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-[#34131c] px-3 py-1.5 text-xs font-medium text-[#ef7b93] border border-[#ef7b93]/30 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              <span>{error}</span>
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={saving || !newField.key.trim() || !newField.label.trim()}
              className="btn-primary btn-sm text-xs"
            >
              {saving ? "Creating…" : "Save Custom Field"}
            </button>
            <button onClick={() => setShowNew(false)} className="btn-ghost btn-sm text-xs">
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
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-[#d3ab5e] text-slate-950 font-bold shadow-sm"
                        : "bg-[#0d1220] text-slate-300 border border-[#232e47] hover:border-[#d3ab5e] hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">
                {visibleFields.length} {visibleFields.length === 1 ? "field" : "fields"}
              </span>

              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d3ab5e] to-[#e0bc78] px-3 py-1.5 text-xs font-bold text-slate-950 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>New Field</span>
              </button>
            </div>
          </div>
        }
      >
        <table className="table-modern w-full">
          <thead>
            <tr className="bg-[#182136]/30">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Display Label
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Database Key
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Field Type
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Required
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232e47]">
            {visibleFields.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                  No custom fields defined for {ENTITY_TABS.find((t) => t.value === activeEntity)?.label} yet.
                </td>
              </tr>
            ) : (
              visibleFields.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-[#182136]/60">
                  <td className="px-4 py-3 font-semibold text-white">
                    {f.label}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#d3ab5e]">
                    {f.key}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    <span className="inline-flex items-center rounded-md border border-[#2a3652] bg-[#182136] px-2 py-0.5 font-mono text-[11px] uppercase font-semibold text-slate-300">
                      {f.field_type}
                    </span>
                    {f.field_type === "select" && f.options && (
                      <span className="ml-2 text-[11px] text-slate-400">
                        ({f.options.join(", ")})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleRequired(f)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                        f.is_required
                          ? "bg-[#113028] text-[#3ecf9a] border-[#3ecf9a]/30"
                          : "bg-[#232e47] text-slate-400 border-[#313f61]"
                      }`}
                    >
                      {f.is_required ? "Required" : "Optional"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(f)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-[#34131c] hover:text-[#ef7b93] transition-colors"
                      title="Delete field definition"
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
