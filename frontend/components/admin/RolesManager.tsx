"use client";

import { AlertTriangle, KeyRound, Lock, Plus, Trash2 } from "lucide-react";
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
    <div className="card flex h-[calc(100vh-11rem)] overflow-hidden p-0">
      <div className="flex w-64 shrink-0 flex-col border-r" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex items-center justify-between px-4 py-4">
          <h2 className="section-label">Roles</h2>
          <button onClick={() => setShowNewRole(true)} className="btn-ghost btn-sm px-1.5" title="New role">
            <Plus size={15} />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
          {roles.map((role) => (
            <li key={role.id}>
              <button
                onClick={() => selectRole(role)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors"
                style={{ background: role.id === selectedId ? "var(--accent-soft)" : "transparent" }}
              >
                {role.is_system_role ? (
                  <Lock size={13} style={{ color: "var(--ink-faint)" }} />
                ) : (
                  <KeyRound size={13} style={{ color: "var(--accent)" }} />
                )}
                <span className="truncate capitalize">{role.name.replace(/_/g, " ")}</span>
                <span className="ml-auto text-xs" style={{ color: "var(--ink-faint)" }}>
                  {role.permissions.length}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin p-6">
        {showNewRole && (
          <div className="card mb-5 flex items-end gap-2" style={{ borderColor: "var(--accent)" }}>
            <label className="flex-1 text-sm font-medium">
              New role name
              <input
                autoFocus
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. regional_manager"
                className="input mt-1.5"
              />
            </label>
            <button onClick={handleCreateRole} disabled={saving || !newRoleName.trim()} className="btn-primary">
              Create
            </button>
            <button onClick={() => setShowNewRole(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        )}

        {error && (
          <p className="mb-4 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            <AlertTriangle size={14} />
            {error}
          </p>
        )}

        {!selected ? (
          <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
            Select a role, or create a new one.
          </p>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-semibold capitalize tracking-tight">
                  {selected.name.replace(/_/g, " ")}
                  {selected.is_system_role && (
                    <span className="badge" style={{ background: "var(--hairline)", color: "var(--ink-muted)" }}>
                      <Lock size={11} />
                      System role
                    </span>
                  )}
                </h1>
                <p className="mt-0.5 text-sm" style={{ color: "var(--ink-muted)" }}>
                  {selected.is_system_role
                    ? "One of the 10 built-in roles — can't be renamed or deleted, but its permissions can be changed."
                    : "Custom role."}
                </p>
              </div>
              {!selected.is_system_role && (
                <button
                  onClick={() => handleDelete(selected)}
                  disabled={saving}
                  className="btn-danger btn-sm"
                  title="Delete this role"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              )}
            </div>

            <div className="flex flex-col gap-5">
              {Array.from(grouped.entries()).map(([category, perms]) => (
                <div key={category} className="card-flat">
                  <h3 className="section-label mb-3">{category}</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {perms.map((p) => (
                      <label key={p.code} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checkedCodes.has(p.code)}
                          onChange={() => toggleCode(p.code)}
                          className="mt-0.5"
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span>
                          <span className="block">{p.description}</span>
                          <span className="block font-mono text-xs" style={{ color: "var(--ink-faint)" }}>
                            {p.code}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t bg-[var(--surface)] pt-4" style={{ borderColor: "var(--hairline)" }}>
              <button onClick={handleSave} disabled={!dirty || saving} className="btn-primary">
                {saving ? "Saving…" : "Save permissions"}
              </button>
              {dirty && (
                <span className="text-xs" style={{ color: "var(--warning)" }}>
                  Unsaved changes
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
