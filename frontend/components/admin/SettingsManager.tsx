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
    <div className="rounded-2xl border border-hairline bg-surface p-4 transition-colors hover:border-hairline-strong space-y-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-ink">{setting.label}</p>
          <p className="font-mono text-[11px] text-accent font-semibold">{setting.key}</p>
          {setting.description && (
            <p className="mt-1 text-xs text-ink-muted">{setting.description}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={saving}
          className="rounded-xl p-1.5 text-ink-faint hover:bg-rose-500/10 hover:text-danger transition-colors"
          title="Delete setting"
        >
          <Trash2 size={14} />
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
        <p className="text-xs text-danger flex items-center gap-1.5">
          <AlertTriangle size={13} />
          <span>{error}</span>
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="btn-primary btn-sm"
        >
          {saving ? "Saving…" : "Save Setting"}
        </button>
        {dirty && (
          <span className="text-xs font-semibold text-warning animate-pulse">
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

  // Quick Access IP Whitelist Settings
  const ipWhitelistEnabledSetting = settings.find((s) => s.key === "security.ip_whitelist_enabled");
  const ipWhitelistSetting = settings.find((s) => s.key === "security.allowed_ips");

  const [ipEnabled, setIpEnabled] = useState<boolean>(Boolean(ipWhitelistEnabledSetting?.value ?? false));
  const [allowedIps, setAllowedIps] = useState<string>(
    Array.isArray(ipWhitelistSetting?.value)
      ? (ipWhitelistSetting.value as string[]).join(", ")
      : typeof ipWhitelistSetting?.value === "string"
        ? ipWhitelistSetting.value
        : ""
  );
  const [savingIp, setSavingIp] = useState(false);
  const [ipMsg, setIpMsg] = useState<string | null>(null);

  async function handleSaveIpSecurity() {
    setSavingIp(true);
    setIpMsg(null);
    try {
      // 1. Save or create security.ip_whitelist_enabled
      const updatedEnabled = await updateSettingValue("security.ip_whitelist_enabled", ipEnabled).catch(() =>
        createSetting({
          key: "security.ip_whitelist_enabled",
          label: "Enable IP Whitelisting",
          category: "Security",
          value_type: "boolean",
          value: ipEnabled,
          description: "Restrict system access exclusively to whitelisted IP addresses",
        })
      );
      handleChanged(updatedEnabled);

      // 2. Save or create security.allowed_ips
      const ipList = allowedIps
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean);
      const updatedIps = await updateSettingValue("security.allowed_ips", ipList).catch(() =>
        createSetting({
          key: "security.allowed_ips",
          label: "Allowed IP Addresses",
          category: "Security",
          value_type: "json",
          value: ipList,
          description: "List of authorized IP addresses / CIDR ranges",
        })
      );
      handleChanged(updatedIps);

      setIpMsg("Security & IP Whitelist settings saved successfully!");
      setTimeout(() => setIpMsg(null), 3000);
    } catch (e) {
      setIpMsg(e instanceof Error ? e.message : "Failed to save IP settings");
    } finally {
      setSavingIp(false);
    }
  }

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
      {/* Superadmin IP Whitelisting & Network Security Card */}
      <div className="rounded-2xl border border-accent/30 bg-surface shadow-card overflow-hidden">
        <div className="flex items-center justify-between bg-surface-raised px-4 sm:px-5 py-3.5 border-b border-hairline">
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded-lg bg-accent-soft text-accent">
              <Sliders size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-ink">Superadmin IP Whitelisting & Access Control</h3>
              <p className="text-xs text-ink-muted">Restrict application access by authorized IP ranges.</p>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
            ipEnabled
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : "bg-slate-500/10 text-slate-500 border-slate-500/30"
          }`}>
            {ipEnabled ? "ENABLED" : "DISABLED"}
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">
                Enforce IP Whitelist
              </label>
              <select
                value={ipEnabled ? "true" : "false"}
                onChange={(e) => setIpEnabled(e.target.value === "true")}
                className="select font-semibold"
              >
                <option value="false">Disabled (Open to all networks)</option>
                <option value="true">Enabled (Strict IP filtering)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">
                Authorized IP Addresses / CIDR (comma-separated)
              </label>
              <input
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                className="input font-mono text-xs"
                placeholder="e.g. 192.168.1.1, 10.0.0.0/24, 203.0.113.5"
              />
            </div>
          </div>

          {ipMsg && (
            <p className={`text-xs font-semibold ${ipMsg.includes("success") ? "text-success" : "text-danger"}`}>
              {ipMsg}
            </p>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSaveIpSecurity}
              disabled={savingIp}
              className="btn-primary"
            >
              {savingIp ? "Updating Policy…" : "Save Security Policy"}
            </button>
          </div>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-hairline bg-surface p-4 shadow-xs">
        <div>
          <p className="text-xs font-semibold text-ink">Runtime System Flags & Configurations</p>
          <p className="text-xs text-ink-muted">
            Changes apply instantly to live workers and API endpoints without deployment.
          </p>
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="btn-primary"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>New Setting</span>
        </button>
      </div>

      {showNew && (
        <div className="rounded-2xl border border-accent/40 bg-surface p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <h2 className="text-sm font-bold text-ink">Define New System Configuration Key</h2>
            <button onClick={() => setShowNew(false)} className="text-ink-muted hover:text-ink">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Config Key</label>
              <input
                placeholder="e.g. leads.duplicate_window_days"
                value={newSetting.key}
                onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                className="input font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Label</label>
              <input
                placeholder="e.g. Duplicate Window (Days)"
                value={newSetting.label}
                onChange={(e) => setNewSetting({ ...newSetting, label: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Category</label>
              <input
                placeholder="e.g. Leads, Security, Messaging"
                value={newSetting.category}
                onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Value Type</label>
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
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Initial Value</label>
              <input
                placeholder="Initial setting value"
                value={newSetting.value}
                onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Description (optional)</label>
              <input
                placeholder="Explanation of how this configuration affects system behaviors"
                value={newSetting.description}
                onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          {error && (
            <p className="alert-danger flex items-center gap-1.5">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={creating || !newSetting.key.trim() || !newSetting.label.trim()}
              className="btn-primary"
            >
              {creating ? "Creating…" : "Save Configuration"}
            </button>
            <button onClick={() => setShowNew(false)} className="btn-ghost">
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
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-ink">
                  {category} Configurations
                </span>
                <span className="rounded-full bg-surface-raised border border-hairline px-2.5 py-0.5 text-xs font-mono font-bold text-ink-muted">
                  {rows.length} {rows.length === 1 ? "parameter" : "parameters"}
                </span>
              </div>
            }
          >
            <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2 bg-surface-raised/20">
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
