"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createSetting,
  deleteSetting,
  updateSettingValue,
  type AppSettingDef,
  type SettingValueType,
} from "@/lib/settings-api";

function groupByCategory(settings: AppSettingDef[]): Map<string, AppSettingDef[]> {
  const groups = new Map<string, AppSettingDef[]>();
  for (const s of settings) {
    const list = groups.get(s.category) ?? [];
    list.push(s);
    groups.set(s.category, list);
  }
  return groups;
}

// JSON-typed values (e.g. messaging.quick_replies) are edited as raw JSON
// text — the escape hatch for arbitrary admin-added config this store is
// meant to support, at the cost of the input being a textarea, not a widget.
function valueToInputString(value: unknown, valueType: SettingValueType): string {
  if (valueType === "json") return JSON.stringify(value, null, 2);
  return String(value);
}

function parseInputValue(raw: string, valueType: SettingValueType): unknown {
  switch (valueType) {
    case "number":
      return Number(raw);
    case "boolean":
      return raw === "true";
    case "json":
      return JSON.parse(raw);
    default:
      return raw;
  }
}

function SettingRow({ setting, onChanged }: { setting: AppSettingDef; onChanged: (updated: AppSettingDef) => void }) {
  const [draft, setDraft] = useState(() => valueToInputString(setting.value, setting.value_type));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = draft !== valueToInputString(setting.value, setting.value_type);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const parsed = parseInputValue(draft, setting.value_type);
      const updated = await updateSettingValue(setting.key, parsed);
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save — check the value's format");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      await deleteSetting(setting.key);
      onChanged({ ...setting, value: null }); // parent removes it from the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete setting");
      setSaving(false);
    }
  }

  return (
    <div className="card-flat">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{setting.label}</p>
          <p className="font-mono text-xs" style={{ color: "var(--ink-faint)" }}>
            {setting.key}
          </p>
          {setting.description && (
            <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
              {setting.description}
            </p>
          )}
        </div>
        <button onClick={handleDelete} disabled={saving} className="btn-ghost btn-sm px-1.5" title="Delete this setting">
          <Trash2 size={13} style={{ color: "var(--danger)" }} />
        </button>
      </div>

      {setting.value_type === "boolean" ? (
        <select value={draft} onChange={(e) => setDraft(e.target.value)} className="input">
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : setting.value_type === "json" ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="input font-mono text-xs"
        />
      ) : (
        <input
          type={setting.value_type === "number" ? "number" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="input"
        />
      )}

      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <button onClick={handleSave} disabled={!dirty || saving} className="btn-primary btn-sm">
          {saving ? "Saving…" : "Save"}
        </button>
        {dirty && (
          <span className="text-xs" style={{ color: "var(--warning)" }}>
            Unsaved
          </span>
        )}
      </div>
    </div>
  );
}

export default function SettingsManager({ initialSettings }: { initialSettings: AppSettingDef[] }) {
  const [settings, setSettings] = useState(initialSettings);
  const [showNew, setShowNew] = useState(false);
  const [newSetting, setNewSetting] = useState({
    key: "",
    label: "",
    category: "Custom",
    value_type: "string" as SettingValueType,
    value: "",
    description: "",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => groupByCategory(settings), [settings]);

  function handleChanged(updated: AppSettingDef) {
    if (updated.value === null) {
      setSettings((prev) => prev.filter((s) => s.key !== updated.key));
    } else {
      setSettings((prev) => prev.map((s) => (s.key === updated.key ? updated : s)));
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const value = parseInputValue(newSetting.value, newSetting.value_type);
      const created = await createSetting({ ...newSetting, value });
      setSettings((prev) => [...prev, created]);
      setShowNew(false);
      setNewSetting({ key: "", label: "", category: "Custom", value_type: "string", value: "", description: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create setting");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Add, edit, or remove any config value here — takes effect immediately, no deploy.
        </p>
        <button onClick={() => setShowNew(true)} className="btn-secondary btn-sm">
          <Plus size={14} />
          New setting
        </button>
      </div>

      {showNew && (
        <div className="card mb-6 grid grid-cols-2 gap-3" style={{ borderColor: "var(--accent)" }}>
          <input
            placeholder="key (e.g. leads.duplicate_window_days)"
            value={newSetting.key}
            onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
            className="input col-span-2 font-mono text-xs"
          />
          <input
            placeholder="Label"
            value={newSetting.label}
            onChange={(e) => setNewSetting({ ...newSetting, label: e.target.value })}
            className="input"
          />
          <input
            placeholder="Category"
            value={newSetting.category}
            onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
            className="input"
          />
          <select
            value={newSetting.value_type}
            onChange={(e) => setNewSetting({ ...newSetting, value_type: e.target.value as SettingValueType })}
            className="input"
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="json">json</option>
          </select>
          <input
            placeholder="Value"
            value={newSetting.value}
            onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
            className="input"
          />
          <input
            placeholder="Description (optional)"
            value={newSetting.description}
            onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
            className="input col-span-2"
          />
          {error && (
            <p className="col-span-2 flex items-center gap-1.5 text-sm" style={{ color: "var(--danger)" }}>
              <AlertTriangle size={14} />
              {error}
            </p>
          )}
          <div className="col-span-2 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newSetting.key.trim() || !newSetting.label.trim()}
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

      <div className="flex flex-col gap-6">
        {Array.from(grouped.entries()).map(([category, rows]) => (
          <div key={category}>
            <h2 className="section-label mb-3">{category}</h2>
            <div className="grid grid-cols-2 gap-3">
              {rows.map((s) => (
                <SettingRow key={s.key} setting={s} onChanged={handleChanged} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
