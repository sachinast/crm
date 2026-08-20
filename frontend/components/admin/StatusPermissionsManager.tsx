"use client";

import { AlertTriangle, Lock, Workflow, Check, Shield } from "lucide-react";
import { useState } from "react";

import type { RoleDef } from "@/lib/roles-api";
import { updateStatusPermissions, type StatusPermissionDef } from "@/lib/status-permissions-api";

const KIND_META: { key: "set_by" | "notifies" | "relevant"; label: string; hint: string }[] = [
  { key: "set_by", label: "Can set this status", hint: "Roles permitted to transition a lead into this status." },
  { key: "notifies", label: "Notified on transition", hint: "Roles that receive real-time notifications when a lead reaches this state." },
  {
    key: "relevant",
    label: "Maintains visibility while here",
    hint: "Roles granted visibility for as long as a lead remains in this status.",
  },
];

export default function StatusPermissionsManager({
  initialStatuses,
  roles,
}: {
  initialStatuses: StatusPermissionDef[];
  roles: RoleDef[];
}) {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(initialStatuses[0]?.status ?? null);
  const [draft, setDraft] = useState<Pick<StatusPermissionDef, "set_by" | "notifies" | "relevant"> | null>(
    initialStatuses[0]
      ? { set_by: initialStatuses[0].set_by, notifies: initialStatuses[0].notifies, relevant: initialStatuses[0].relevant }
      : null,
  );
  const [statusSearch, setStatusSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredStatuses = statuses.filter((s) => {
    if (!statusSearch.trim()) return true;
    const q = statusSearch.trim().toLowerCase();
    return s.label.toLowerCase().includes(q) || s.status.toLowerCase().includes(q);
  });

  const selected = statuses.find((s) => s.status === selectedStatus) ?? null;
  const dirty =
    selected !== null &&
    draft !== null &&
    (["set_by", "notifies", "relevant"] as const).some(
      (kind) => JSON.stringify([...draft[kind]].sort()) !== JSON.stringify([...selected[kind]].sort()),
    );

  function selectStatus(row: StatusPermissionDef) {
    setSelectedStatus(row.status);
    setDraft({ set_by: row.set_by, notifies: row.notifies, relevant: row.relevant });
    setError(null);
  }

  function toggle(kind: "set_by" | "notifies" | "relevant", roleId: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      const set = new Set(prev[kind]);
      if (set.has(roleId)) set.delete(roleId);
      else set.add(roleId);
      return { ...prev, [kind]: Array.from(set) };
    });
  }

  async function handleSave() {
    if (!selected || !draft) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateStatusPermissions(selected.status, draft);
      setStatuses((prev) => prev.map((s) => (s.status === updated.status ? updated : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save status permissions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] shadow-xs">
      {/* Left Workflow Statuses Sidebar */}
      <div className="flex w-72 shrink-0 flex-col border-r border-[var(--hairline)] bg-[var(--surface-sunken)]">
        <div className="border-b border-[var(--hairline)] p-4 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Workflow States
          </span>
          <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-bold text-[var(--ink-muted)]">
            {statuses.length}
          </span>
        </div>

        {/* Workflow search input */}
        <div className="p-2 border-b border-[var(--hairline)]">
          <input
            value={statusSearch}
            onChange={(e) => setStatusSearch(e.target.value)}
            placeholder="Filter workflow states..."
            className="input w-full py-1 text-xs"
          />
        </div>

        <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredStatuses.map((row) => {
            const isSelected = row.status === selectedStatus;
            const totalAssigned = row.set_by.length + row.notifies.length + row.relevant.length;
            return (
              <li key={row.status}>
                <button
                  onClick={() => selectStatus(row)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                    isSelected
                      ? "bg-[var(--surface-raised)] text-[var(--ink)] border border-[var(--accent)]/50 shadow-xs"
                      : "text-[var(--ink-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)] border border-transparent"
                  }`}
                >
                  <Workflow size={15} className={isSelected ? "text-[var(--accent)]" : "text-[var(--ink-faint)]"} />
                  <span className="truncate">{row.label}</span>
                  <span
                    className={`ml-auto rounded-lg px-2 py-0.5 text-xs font-mono font-bold ${
                      isSelected ? "bg-accent text-white" : "bg-surface text-ink-muted border border-hairline"
                    }`}
                  >
                    {totalAssigned}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right Workflow Configuration Area */}
      <div className="flex flex-1 flex-col overflow-y-auto p-6 bg-[var(--surface)]">
        {error && (
          <p className="mb-4 alert-danger">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </p>
        )}

        {!selected || !draft ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--ink-faint)]">
            Select a workflow status to configure role permissions.
          </div>
        ) : (
          <>
            <div className="mb-5 border-b border-[var(--hairline)] pb-4">
              <h2 className="text-xl font-bold text-[var(--ink)] flex items-center gap-2">
                <span>{selected.label}</span>
                <span className="rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--accent)]">
                  {selected.status}
                </span>
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Configure role bindings for state transition permissions, alerts, and visibility retention.
              </p>
            </div>

            <div className="space-y-5 flex-1">
              {KIND_META.map((meta) => {
                const currentSet = new Set(draft[meta.key]);
                return (
                  <div key={meta.key} className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-raised)] p-4">
                    <div className="mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                        {meta.label}
                      </h3>
                      <p className="text-xs text-[var(--ink-muted)]">{meta.hint}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {roles.map((r) => {
                        const checked = currentSet.has(r.id);
                        return (
                          <label
                            key={r.id}
                            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                              checked
                                ? "border-[var(--accent)]/50 bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-xs"
                                : "border-[var(--hairline)] bg-[var(--surface-sunken)] text-[var(--ink-muted)] hover:border-[var(--hairline-strong)]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(meta.key, r.id)}
                              className="h-4 w-4 rounded border-[var(--hairline-strong)] bg-surface text-accent focus:ring-accent accent-amber-500"
                            />
                            <span className="truncate capitalize">{r.name.replace(/_/g, " ")}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Sticky Save Bar */}
            <div className="sticky bottom-0 mt-6 flex items-center justify-between border-t border-[var(--hairline)] bg-[var(--surface)] pt-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={!dirty || saving}
                  className="btn-primary"
                >
                  {saving ? "Saving Status Workflow…" : "Save Workflow Configuration"}
                </button>
                {dirty && (
                  <span className="text-xs font-semibold text-[var(--accent)] animate-pulse">
                    ● Unsaved changes
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
