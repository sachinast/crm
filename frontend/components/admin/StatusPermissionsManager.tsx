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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex h-[calc(100vh-13rem)] overflow-hidden rounded-2xl border border-[#232e47] bg-[#131a2b] shadow-sm">
      {/* Left Workflow Statuses Sidebar */}
      <div className="flex w-72 shrink-0 flex-col border-r border-[#232e47] bg-[#0d1220]/60">
        <div className="border-b border-[#232e47] p-4 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Workflow States
          </span>
          <span className="rounded-full bg-[#182136] px-2 py-0.5 text-[10px] font-bold text-slate-400">
            {statuses.length}
          </span>
        </div>

        <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          {statuses.map((row) => {
            const isSelected = row.status === selectedStatus;
            const totalAssigned = row.set_by.length + row.notifies.length + row.relevant.length;
            return (
              <li key={row.status}>
                <button
                  onClick={() => selectStatus(row)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-[#182136] text-white border border-[#d3ab5e]/50 shadow-xs"
                      : "text-slate-400 hover:bg-[#182136]/50 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <Workflow size={13} className={isSelected ? "text-[#d3ab5e]" : "text-slate-500"} />
                  <span className="truncate">{row.label}</span>
                  <span
                    className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                      isSelected ? "bg-[#d3ab5e] text-slate-950" : "bg-[#131a2b] text-slate-500"
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
      <div className="flex flex-1 flex-col overflow-y-auto p-6 bg-[#131a2b]">
        {error && (
          <p className="mb-4 flex items-center gap-1.5 rounded-lg border border-[#ef7b93]/30 bg-[#34131c] px-3 py-2 text-xs font-medium text-[#ef7b93]">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </p>
        )}

        {!selected || !draft ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            Select a workflow status to configure role permissions.
          </div>
        ) : (
          <>
            <div className="mb-5 border-b border-[#232e47] pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{selected.label}</span>
                <span className="rounded-md border border-[#2a3652] bg-[#182136] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#d3ab5e]">
                  {selected.status}
                </span>
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Configure role bindings for state transition permissions, alerts, and visibility retention.
              </p>
            </div>

            <div className="space-y-5 flex-1">
              {KIND_META.map((meta) => {
                const currentSet = new Set(draft[meta.key]);
                return (
                  <div key={meta.key} className="rounded-xl border border-[#232e47] bg-[#182136]/40 p-4">
                    <div className="mb-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#d3ab5e]">
                        {meta.label}
                      </h3>
                      <p className="text-[11px] text-slate-400">{meta.hint}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {roles.map((r) => {
                        const checked = currentSet.has(r.id);
                        return (
                          <label
                            key={r.id}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                              checked
                                ? "border-[#d3ab5e]/40 bg-[#182136] text-white font-semibold"
                                : "border-[#232e47] bg-[#0d1220]/60 text-slate-400 hover:border-[#2a3652]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(meta.key, r.id)}
                              className="h-3.5 w-3.5 rounded border-[#313f61] bg-[#0d1220]"
                              style={{ accentColor: "#d3ab5e" }}
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
            <div className="sticky bottom-0 mt-6 flex items-center justify-between border-t border-[#232e47] bg-[#131a2b] pt-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={!dirty || saving}
                  className="btn-primary btn-sm text-xs"
                >
                  {saving ? "Saving Status Workflow…" : "Save Workflow Configuration"}
                </button>
                {dirty && (
                  <span className="text-xs font-medium text-[#e0bc78] animate-pulse">
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
