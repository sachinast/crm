"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createCustomField,
  deleteCustomField,
  updateCustomField,
  type CustomFieldDef,
  type EntityType,
  type FieldType,
} from "@/lib/custom-fields-api";

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
    <div>
      <div className="mb-4 flex gap-1.5">
        {ENTITY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveEntity(tab.value)}
            className="badge"
            style={
              activeEntity === tab.value
                ? { background: "var(--accent-soft)", color: "var(--accent)" }
                : { background: "var(--hairline)", color: "var(--ink-muted)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Fields defined here render automatically on the matching form — no deploy required.
        </p>
        <button onClick={() => setShowNew(true)} className="btn-secondary btn-sm">
          <Plus size={14} />
          New field
        </button>
      </div>

      {showNew && (
        <div className="card mb-6 grid grid-cols-2 gap-3" style={{ borderColor: "var(--accent)" }}>
          <input
            placeholder="key (e.g. referral_code)"
            value={newField.key}
            onChange={(e) => setNewField({ ...newField, key: e.target.value })}
            className="input font-mono text-xs"
          />
          <input
            placeholder="Label"
            value={newField.label}
            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
            className="input"
          />
          <select
            value={newField.field_type}
            onChange={(e) => setNewField({ ...newField, field_type: e.target.value as FieldType })}
            className="input"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newField.is_required}
              onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
              style={{ accentColor: "var(--accent)" }}
            />
            Required
          </label>
          {newField.field_type === "select" && (
            <input
              placeholder="Options, comma separated (e.g. low, medium, high)"
              value={newField.options}
              onChange={(e) => setNewField({ ...newField, options: e.target.value })}
              className="input col-span-2"
            />
          )}
          {error && (
            <p className="col-span-2 flex items-center gap-1.5 text-sm" style={{ color: "var(--danger)" }}>
              <AlertTriangle size={14} />
              {error}
            </p>
          )}
          <div className="col-span-2 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newField.key.trim() || !newField.label.trim()}
              className="btn-primary"
            >
              Create
            </button>
            <button onClick={() => setShowNew(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card-flat overflow-x-auto p-0">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Label</th>
              <th>Key</th>
              <th>Type</th>
              <th>Required</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibleFields.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center" style={{ color: "var(--ink-faint)" }}>
                  No custom fields defined for this entity type yet.
                </td>
              </tr>
            )}
            {visibleFields.map((f) => (
              <tr key={f.id}>
                <td className="font-medium">{f.label}</td>
                <td className="font-mono text-xs" style={{ color: "var(--ink-faint)" }}>
                  {f.key}
                </td>
                <td style={{ color: "var(--ink-muted)" }}>
                  {f.field_type}
                  {f.field_type === "select" && f.options && (
                    <span className="ml-1 text-xs" style={{ color: "var(--ink-faint)" }}>
                      ({f.options.join(", ")})
                    </span>
                  )}
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={f.is_required}
                    onChange={() => handleToggleRequired(f)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                </td>
                <td>
                  <button onClick={() => handleDelete(f)} className="btn-ghost btn-sm px-1.5" title="Delete this field">
                    <Trash2 size={13} style={{ color: "var(--danger)" }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
