"use client";

import { AlertTriangle, Plus, Trash2, Sliders, X, Check } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createSetting,
  deleteSetting,
  updateSettingValue,
  type AppSettingDef,
  type SettingValueType,
} from "@/lib/settings-api";
import DataTableCard from "@/components/shared/DataTableCard";

function groupByCategory(settings: AppSettingDef[]): Map<string, AppSettingDef[]> {
  const groups = new Map<string, AppSettingDef[]>();
  for (const s of settings) {
    const list = groups.get(s.category) ?? [];
    list.push(s);
    groups.set(s.category, list);
  }
  return groups;
}

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
      onChanged({ ...setting, value: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete setting");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#232e47] bg-[#182136]/50 p-4 transition-colors hover:border-[#2a3652] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-white">{setting.label}</p>
          <p className="font-mono text-[10px] text-[#d3ab5e]">{setting.key}</p>
          {setting.description && (
            <p className="mt-1 text-[11px] text-slate-400">{setting.description}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={saving}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-[#34131c] hover:text-[#ef7b93] transition-colors"
          title="Delete setting"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div>
        {setting.value_type === "boolean" ? (
          <select
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="input text-xs"
          >
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
            className="input text-xs"
          />
        )}
      </div>

      {error && (
        <p className="text-[11px] text-[#ef7b93] flex items-center gap-1">
          <AlertTriangle size={11} />
          <span>{error}</span>
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="btn-primary btn-sm text-[11px]"
        >
          {saving ? "Saving…" : "Save Setting"}
        </button>
        {dirty && (
          <span className="text-[11px] text-[#e0bc78] animate-pulse">
            ● Unsaved
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
    category: "General",
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
      setNewSetting({ key: "", label: "", category: "General", value_type: "string", value: "", description: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create setting");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-[#232e47] bg-[#131a2b] p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-white">Runtime System Flags & Configurations</p>
          <p className="text-[11px] text-slate-400">
            Changes apply instantly to live workers and API endpoints without deployment.
          </p>
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d3ab5e] to-[#e0bc78] px-3 py-1.5 text-xs font-bold text-slate-950 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={13} strokeWidth={2.5} />
          <span>New Setting</span>
        </button>
      </div>

      {showNew && (
        <div className="rounded-2xl border border-[#d3ab5e] bg-[#131a2b] p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#232e47] pb-3">
            <h2 className="text-sm font-bold text-white">Define New System Configuration Key</h2>
            <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-300">Config Key</label>
              <input
                placeholder="e.g. leads.duplicate_window_days"
                value={newSetting.key}
                onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                className="input font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Label</label>
              <input
                placeholder="e.g. Duplicate Window (Days)"
                value={newSetting.label}
                onChange={(e) => setNewSetting({ ...newSetting, label: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Category</label>
              <input
                placeholder="e.g. Leads, Security, Messaging"
                value={newSetting.category}
                onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Value Type</label>
              <select
                value={newSetting.value_type}
                onChange={(e) => setNewSetting({ ...newSetting, value_type: e.target.value as SettingValueType })}
                className="input text-xs"
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="json">json</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Initial Value</label>
              <input
                placeholder="Initial setting value"
                value={newSetting.value}
                onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-300">Description (optional)</label>
              <input
                placeholder="Explanation of how this configuration affects system behaviors"
                value={newSetting.description}
                onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                className="input text-xs"
              />
            </div>
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
              disabled={creating || !newSetting.key.trim() || !newSetting.label.trim()}
              className="btn-primary btn-sm text-xs"
            >
              {creating ? "Creating…" : "Save Configuration"}
            </button>
            <button onClick={() => setShowNew(false)} className="btn-ghost btn-sm text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grouped Settings Cards */}
      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([category, rows]) => (
          <DataTableCard
            key={category}
            headerContent={
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {category} Configurations
                </span>
                <span className="text-[11px] text-slate-400">{rows.length} parameters</span>
              </div>
            }
          >
            <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {rows.map((s) => (
                <SettingRow key={s.key} setting={s} onChanged={handleChanged} />
              ))}
            </div>
          </DataTableCard>
        ))}
      </div>
    </div>
  );
}
