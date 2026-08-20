"use client";

import { useState, type FormEvent } from "react";

// PRD §9.1 "Click-to-Reveal" — every reveal requires a reason and is logged
// server-side (§9.2, POST /leads/{id}/reveal). This component never fetches
// the raw value proactively; the masked string is all it ever has until the
// agent explicitly reveals it.
export default function RevealField({
  leadId,
  field,
  maskedValue,
}: {
  leadId: string;
  field: "email" | "phone";
  maskedValue: string;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleReveal(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch(`/api/leads/${leadId}/reveal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, reason }),
    });
    setSubmitting(false);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      const detail = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail;
      setError(detail ?? "Could not reveal");
      return;
    }

    const body = await resp.json();
    setRevealed(body.value);
    setShowPrompt(false);
  }

  if (revealed) {
    return <span>{revealed}</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span>{maskedValue}</span>
      {!showPrompt && (
        <button type="button" onClick={() => setShowPrompt(true)} className="text-xs font-semibold underline text-accent hover:opacity-80">
          Reveal
        </button>
      )}
      {showPrompt && (
        <form onSubmit={handleReveal} className="inline-flex items-center gap-1.5">
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for access"
            className="input w-40 px-2 py-0.5 text-xs"
          />
          <button type="submit" disabled={submitting} className="text-xs font-semibold underline text-accent hover:opacity-80">
            {submitting ? "…" : "Confirm"}
          </button>
        </form>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
