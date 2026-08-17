"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { statusColor } from "@/lib/status-colors";

interface Transition {
  status: string;
  label: string;
  ui_color: string;
}

// PATCH /leads/{id}/status action buttons — TECHNICAL_SPEC.md §3.2. The
// button list itself comes from GET /leads/{id}/available-transitions, which
// already applies the transition graph + role rules server-side (status_machine.py),
// so this component never has to know the rules itself.
export default function StatusActions({ leadId, transitions }: { leadId: string; transitions: Transition[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(newStatus: string) {
    setSubmitting(newStatus);
    setError(null);

    const resp = await fetch(`/api/leads/${leadId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_status: newStatus }),
    });
    setSubmitting(null);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not change status");
      return;
    }

    // A transition can move the lead out of the current user's visibility
    // (PRD §3.2 "Status-Based Sharing" — e.g. Billing tagging a lead to
    // Auditor loses their own view of it in the same action). Refreshing in
    // place would 404; the list is always a safe landing spot.
    router.push("/leads");
    router.refresh();
  }

  if (transitions.length === 0) {
    return <p className="text-xs text-neutral-400">No status actions available for your role right now.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <button
            key={t.status}
            onClick={() => handleClick(t.status)}
            disabled={submitting !== null}
            className="rounded border px-3 py-1.5 text-xs disabled:opacity-50"
            style={{ borderColor: statusColor(t.ui_color) }}
          >
            {submitting === t.status ? "…" : t.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
