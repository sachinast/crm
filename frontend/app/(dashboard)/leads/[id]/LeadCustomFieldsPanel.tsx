"use client";

import { ListPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import DynamicFieldsBlock from "@/components/shared/DynamicFieldsBlock";

// Post-creation editor for this lead's admin-defined extra fields (Master
// Admin — Custom Form Fields). Renders nothing itself if this entity type
// has no custom fields defined — DynamicFieldsBlock handles that — so this
// whole card just doesn't appear for orgs that haven't defined any yet.
export default function LeadCustomFieldsPanel({
  leadId,
  initialCustomFields,
  canEdit,
}: {
  leadId: string;
  initialCustomFields: Record<string, unknown>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialCustomFields);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(initialCustomFields);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const resp = await fetch(`/api/leads/${leadId}/custom-fields`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_fields: values }),
    });
    setSaving(false);
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not save custom fields");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card mb-4">
      <h2 className="mb-3 flex items-center gap-1.5 section-label">
        <ListPlus size={14} />
        Additional details
      </h2>
      <fieldset disabled={!canEdit} className="grid grid-cols-2 gap-4">
        <DynamicFieldsBlock entityType="lead" value={values} onChange={setValues} />
      </fieldset>
      {error && (
        <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {canEdit && dirty && (
        <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm mt-3">
          {saving ? "Saving…" : "Save changes"}
        </button>
      )}
    </div>
  );
}
