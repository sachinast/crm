"use client";

import { AlertTriangle, KeyRound, Lock, Plus, Trash2, ShieldCheck, Check } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createRole,
  deleteRole,
  updateRolePermissions,
  type PermissionDef,
  type RoleDef,
} from "@/lib/roles-api";

function groupByCategory(permissions: PermissionDef[]): Map<string, PermissionDef[]> {
  const groups = new Map<string, PermissionDef[]>();
  for (const p of permissions) {
    const list = groups.get(p.category) ?? [];
    list.push(p);
    groups.set(p.category, list);
  }
  return groups;
}

export default function RolesManager({
  initialRoles,
  permissions,
}: {
  initialRoles: RoleDef[];
  permissions: PermissionDef[];
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [selectedId, setSelectedId] = useState<string | null>(initialRoles[0]?.id ?? null);
  const [checkedCodes, setCheckedCodes] = useState<Set<string>>(
    new Set(initialRoles[0]?.permissions.map((p) => p.code) ?? []),
  );
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => groupByCategory(permissions), [permissions]);
  const selected = roles.find((r) => r.id === selectedId) ?? null;
  const dirty =
    selected !== null &&
    (checkedCodes.size !== selected.permissions.length ||
      selected.permissions.some((p) => !checkedCodes.has(p.code)));

  function selectRole(role: RoleDef) {
    setSelectedId(role.id);
    setCheckedCodes(new Set(role.permissions.map((p) => p.code)));
    setError(null);
  }

  function toggleCode(code: string) {
    setCheckedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateRolePermissions(selected.id, Array.from(checkedCodes));
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save permissions");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRole() {
    if (!newRoleName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const role = await createRole(newRoleName.trim(), []);
      setRoles((prev) => [...prev, role]);
      setNewRoleName("");
      setShowNewRole(false);
      selectRole(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create role");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: RoleDef) {
    setSaving(true);
    setError(null);
    try {
      await deleteRole(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      if (selectedId === role.id) {
        const next = roles.find((r) => r.id !== role.id) ?? null;
        if (next) selectRole(next);
        else setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete role — it may still be in use");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] shadow-xs">
      {/* Left Role List Sidebar */}
      <div className="flex w-72 shrink-0 flex-col border-r border-[var(--hairline)] bg-[var(--surface-sunken)]">
        <div className="flex items-center justify-between border-b border-[var(--hairline)] p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Configured Roles
            </span>
            <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-bold text-[var(--ink-muted)]">
              {roles.length}
            </span>
          </div>
          <button
            onClick={() => setShowNewRole(true)}
            className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-2 text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            title="Create new role"
          >
            <Plus size={15} />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          {roles.map((role) => {
            const isSelected = role.id === selectedId;
            return (
              <li key={role.id}>
                <button
                  onClick={() => selectRole(role)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                    isSelected
                      ? "bg-[var(--surface-raised)] text-[var(--ink)] border border-[var(--accent)]/50 shadow-xs"
                      : "text-[var(--ink-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)] border border-transparent"
                  }`}
                >
                  {role.is_system_role ? (
                    <Lock size={14} className="text-[var(--ink-faint)] shrink-0" />
                  ) : (
                    <KeyRound size={14} className="text-[var(--accent)] shrink-0" />
                  )}
                  <span className="truncate capitalize">{role.name.replace(/_/g, " ")}</span>
                  <span
                    className={`ml-auto rounded-lg px-2 py-0.5 text-xs font-mono font-bold ${
                      isSelected ? "bg-accent text-white" : "bg-surface text-ink-muted border border-hairline"
                    }`}
                  >
                    {role.permissions.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right Permissions Matrix Editor */}
      <div className="flex flex-1 flex-col overflow-y-auto p-6 bg-[var(--surface)]">
        {showNewRole && (
          <div className="mb-5 rounded-2xl border border-[var(--accent)] bg-[var(--surface-raised)] p-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--ink)]">Create New Custom Role</h3>
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. regional_supervisor"
                className="input flex-1"
              />
              <button
                onClick={handleCreateRole}
                disabled={saving || !newRoleName.trim()}
                className="btn-primary"
              >
                Create Role
              </button>
              <button onClick={() => setShowNewRole(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mb-4 alert-danger">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </p>
        )}

        {!selected ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--ink-faint)]">
            Select a role from the sidebar to inspect or modify permissions.
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-[var(--ink)] capitalize">
                    {selected.name.replace(/_/g, " ")}
                  </h2>
                  {selected.is_system_role ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--hairline)] bg-[var(--surface-raised)] px-2.5 py-0.5 text-xs font-bold uppercase text-[var(--ink-muted)]">
                      <Lock size={11} />
                      System Role
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-bold uppercase text-[var(--accent)]">
                      Custom Role
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  {selected.is_system_role
                    ? "Built-in core role. Role definition is locked, permissions can be granted or revoked."
                    : "Custom role created at runtime. Can be safely renamed, modified, or deleted."}
                </p>
              </div>

              {!selected.is_system_role && (
                <button
                  onClick={() => handleDelete(selected)}
                  disabled={saving}
                  className="btn-danger btn-sm"
                  title="Delete this custom role"
                >
                  <Trash2 size={14} />
                  <span>Delete Role</span>
                </button>
              )}
            </div>

            {/* Grouped Permissions Matrix */}
            <div className="space-y-5 flex-1">
              {Array.from(grouped.entries()).map(([category, perms]) => (
                <div key={category} className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-raised)] p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                    {category} Permissions
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {perms.map((p) => {
                      const isChecked = checkedCodes.has(p.code);
                      return (
                        <label
                          key={p.code}
                          className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-colors ${
                            isChecked
                              ? "border-[var(--accent)]/50 bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-xs"
                              : "border-[var(--hairline)] bg-[var(--surface-sunken)] text-[var(--ink-muted)] hover:border-[var(--hairline-strong)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCode(p.code)}
                            className="mt-0.5 h-4 w-4 rounded border-[var(--hairline-strong)] bg-surface text-accent focus:ring-accent accent-amber-500"
                          />
                          <div className="text-sm">
                            <span className="block font-medium text-[var(--ink)]">{p.description}</span>
                            <span className="block font-mono text-xs text-[var(--ink-faint)]">{p.code}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Sticky Save Bar */}
            <div className="sticky bottom-0 mt-6 flex items-center justify-between border-t border-[var(--hairline)] bg-[var(--surface)] pt-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={!dirty || saving}
                  className="btn-primary"
                >
                  {saving ? "Saving Changes…" : "Save Permission Matrix"}
                </button>
                {dirty && (
                  <span className="text-xs font-semibold text-[var(--accent)] animate-pulse">
                    ● Unsaved changes
                  </span>
                )}
              </div>

              <span className="text-sm text-[var(--ink-muted)] font-mono">
                {checkedCodes.size} of {permissions.length} granted
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
