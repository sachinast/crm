"use client";

import { PencilLine } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface ModificationEntry {
  id: string;
  field_name: string;
  original_value: unknown;
  revised_value: unknown;
  modification_amount: number;
  created_at: string;
}

// PRD §7.1 "Original vs. Revised" — a paired-snapshot audit trail. This does
// NOT also update the live booking row; staff apply the actual change via
// the existing booking edit form (Edit link above) — this panel is purely
// the record of what changed and why (see backend/app/api/v1/modifications.py).
export default function ModificationsPanel({
  leadId,
  canModify,
  history,
}: {
  leadId: string;
  canModify: boolean;
  history: ModificationEntry[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({ field_name: "", original_value: "", revised_value: "", modification_amount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch(`/api/leads/${leadId}/modifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        field_name: form.field_name,
        original_value: form.original_value,
        revised_value: form.revised_value,
        modification_amount: form.modification_amount === "" ? null : Number(form.modification_amount),
      }),
    });
    setSubmitting(false);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not record modification");
      return;
    }

    setForm({ field_name: "", original_value: "", revised_value: "", modification_amount: "" });
    setOpen(false);
    router.refresh();
  }

  if (!canModify && history.length === 0) return null;

  return (
    <div className="card text-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-label flex items-center gap-1.5">
          <PencilLine size={13} />
          Modifications
        </h2>
        {canModify && (
          <button onClick={() => setOpen((v) => !v)} className="link-muted text-xs underline">
            {open ? "Cancel" : "Record a change"}
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="card-flat mb-3 grid grid-cols-2 gap-2">
          <input
            required
            placeholder="Field (e.g. pickup_location)"
            value={form.field_name}
            onChange={(e) => setForm({ ...form, field_name: e.target.value })}
            className="input col-span-2"
          />
          <input
            required
            placeholder="Original value"
            value={form.original_value}
            onChange={(e) => setForm({ ...form, original_value: e.target.value })}
            className="input"
          />
          <input
            required
            placeholder="Revised value"
            value={form.revised_value}
            onChange={(e) => setForm({ ...form, revised_value: e.target.value })}
            className="input"
          />
          <input
            placeholder="$ impact (optional, auto for amount fields)"
            type="number"
            step="0.01"
            value={form.modification_amount}
            onChange={(e) => setForm({ ...form, modification_amount: e.target.value })}
            className="input col-span-2"
          />
          {error && (
            <p className="col-span-2 alert-danger">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary btn-sm col-span-2">
            {submitting ? "Saving…" : "Save modification"}
          </button>
        </form>
      )}

      {history.length === 0 ? (
        <p className="text-sm text-ink-faint">No modifications recorded.</p>
      ) : (
        <ul className="flex flex-col gap-2.5 text-sm text-ink-muted">
          {history.map((m) => (
            <li key={m.id}>
              <strong className="text-ink font-semibold">{m.field_name}</strong>: {String(m.original_value)} → {String(m.revised_value)}
              {m.modification_amount !== 0 && ` (${m.modification_amount > 0 ? "+" : ""}$${m.modification_amount.toFixed(2)})`}
              {" · "}
              <span className="text-xs text-ink-faint">{new Date(m.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
