"use client";

import { AlertTriangle, Lock } from "lucide-react";
import { useState } from "react";

import type { RoleDef } from "@/lib/roles-api";
import { updateStatusPermissions, type StatusPermissionDef } from "@/lib/status-permissions-api";

const KIND_META: { key: "set_by" | "notifies" | "relevant"; label: string; hint: string }[] = [
  { key: "set_by", label: "Can set this status", hint: "Roles allowed to move a lead TO this status." },
  { key: "notifies", label: "Notified on transition", hint: "Roles that get a one-time notification when a lead moves into this status." },
  {
    key: "relevant",
    label: "Keeps visibility while here",
    hint: "Roles that keep seeing a lead for as long as it sits at this status (PRD §3.2 Status-Based Sharing).",
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
    <div className="card flex h-[calc(100vh-11rem)] overflow-hidden p-0">
      <div className="flex w-64 shrink-0 flex-col border-r" style={{ borderColor: "var(--hairline)" }}>
        <div className="px-4 py-4">
          <h2 className="section-label">Statuses</h2>
        </div>
        <ul className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
          {statuses.map((row) => (
            <li key={row.status}>
              <button
                onClick={() => selectStatus(row)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors"
                style={{ background: row.status === selectedStatus ? "var(--accent-soft)" : "transparent" }}
              >
                <span className="truncate">{row.label}</span>
                <span className="ml-auto text-xs" style={{ color: "var(--ink-faint)" }}>
                  {row.set_by.length + row.notifies.length + row.relevant.length}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin p-6">
        {error && (
          <p className="mb-4 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            <AlertTriangle size={14} />
            {error}
          </p>
        )}

        {!selected || !draft ? (
          <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
            Select a status.
          </p>
        ) : (
          <>
            <div className="mb-5">
              <h1 className="text-xl font-semibold tracking-tight">{selected.label}</h1>
              <p className="mt-0.5 text-sm" style={{ color: "var(--ink-muted)" }}>
                Which roles can act on / are notified by / keep seeing a lead at this status — no deploy required.
              </p>
              {(selected.status === "authorization_pending" || selected.status === "client_approved") && (
                <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-faint)" }}>
                  <Lock size={12} />
                  {selected.status === "authorization_pending"
                    ? "Set automatically by the system — no staff role can set it here."
                    : "Set by the customer via the public authorization link — no staff role can set it here."}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-5">
              {KIND_META.map(({ key, label, hint }) => (
                <div key={key} className="card-flat">
                  <h3 className="section-label mb-1">{label}</h3>
                  <p className="mb-3 text-xs" style={{ color: "var(--ink-faint)" }}>
                    {hint}
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {roles.map((role) => (
                      <label key={role.id} className="flex items-center gap-2 text-sm capitalize">
                        <input
                          type="checkbox"
                          checked={draft[key].includes(role.id)}
                          onChange={() => toggle(key, role.id)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        {role.name.replace(/_/g, " ")}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t bg-[var(--surface)] pt-4" style={{ borderColor: "var(--hairline)" }}>
              <button onClick={handleSave} disabled={!dirty || saving} className="btn-primary">
                {saving ? "Saving…" : "Save changes"}
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
