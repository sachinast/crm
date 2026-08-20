"use client";

import { useEffect, useState } from "react";

import { fetchCustomFields, type CustomFieldDef, type EntityType } from "@/lib/custom-fields-api";

/**
 * Renders admin-defined extra fields (Master Admin — Custom Form Fields) for
 * one entity type, bound to a `custom_fields` value object — dropped into
 * the lead intake form, the lead detail page, and all three booking forms.
 * Self-fetches its field definitions (GET /custom-fields?entity_type=...,
 * open to any authenticated user) so each call site only needs to wire up
 * `value`/`onChange`, not also fetch+pass definitions down.
 * Renders nothing if this entity type has no custom fields defined yet.
 */
export default function DynamicFieldsBlock({
  entityType,
  value,
  onChange,
}: {
  entityType: EntityType;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [definitions, setDefinitions] = useState<CustomFieldDef[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCustomFields(entityType).then((defs) => {
      if (!cancelled) setDefinitions(defs);
    });
    return () => {
      cancelled = true;
    };
  }, [entityType]);

  if (!definitions || definitions.length === 0) return null;

  function setField(key: string, fieldValue: unknown) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <>
      {definitions.map((def) => (
        <label key={def.id} className="text-sm font-medium">
          {def.label}
          {def.is_required && <span style={{ color: "var(--danger)" }}> *</span>}
          <div className="mt-1.5">
            {def.field_type === "text" && (
              <input
                required={def.is_required}
                value={(value[def.key] as string) ?? ""}
                onChange={(e) => setField(def.key, e.target.value)}
                className="input"
              />
            )}
            {def.field_type === "number" && (
              <input
                required={def.is_required}
                type="number"
                value={(value[def.key] as number) ?? ""}
                onChange={(e) => setField(def.key, e.target.value === "" ? "" : Number(e.target.value))}
                className="input"
              />
            )}
            {def.field_type === "date" && (
              <input
                required={def.is_required}
                type="date"
                value={(value[def.key] as string) ?? ""}
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => setField(def.key, e.target.value)}
                className="input"
              />
            )}
            {def.field_type === "select" && (
              <select
                required={def.is_required}
                value={(value[def.key] as string) ?? ""}
                onChange={(e) => setField(def.key, e.target.value)}
                className="input"
              >
                <option value="" disabled>
                  Select…
                </option>
                {(def.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
            {def.field_type === "checkbox" && (
              <input
                type="checkbox"
                checked={Boolean(value[def.key])}
                onChange={(e) => setField(def.key, e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
            )}
          </div>
        </label>
      ))}
    </>
  );
}
