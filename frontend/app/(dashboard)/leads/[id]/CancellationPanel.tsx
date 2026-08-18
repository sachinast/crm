"use client";

import { Ban } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface CancellationEntry {
  original_prepaid_amount: number;
  cancellation_penalty_fee: number;
  refund_amount: number;
  final_retained_amount: number;
  created_at: string;
}

// PRD §7.2 — refund_amount/final_retained_amount are computed server-side
// (DB-generated columns), never entered here.
export default function CancellationPanel({
  leadId,
  canCancel,
  cancellation,
}: {
  leadId: string;
  canCancel: boolean;
  cancellation: CancellationEntry | null;
}) {
  const router = useRouter();
  const [penaltyFee, setPenaltyFee] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch(`/api/leads/${leadId}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancellation_penalty_fee: Number(penaltyFee) }),
    });
    setSubmitting(false);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not cancel booking");
      return;
    }

    router.refresh();
  }

  if (!canCancel && !cancellation) return null;

  return (
    <div className="card text-sm">
      <h2 className="section-label mb-3 flex items-center gap-1.5">
        <Ban size={13} />
        Cancellation
      </h2>

      {cancellation ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <dt style={{ color: "var(--ink-faint)" }}>Original prepaid</dt>
          <dd>${cancellation.original_prepaid_amount.toFixed(2)}</dd>
          <dt style={{ color: "var(--ink-faint)" }}>Penalty fee</dt>
          <dd>${cancellation.cancellation_penalty_fee.toFixed(2)}</dd>
          <dt style={{ color: "var(--ink-faint)" }}>Refund to customer</dt>
          <dd>${cancellation.refund_amount.toFixed(2)}</dd>
          <dt style={{ color: "var(--ink-faint)" }}>Retained by agency</dt>
          <dd>${cancellation.final_retained_amount.toFixed(2)}</dd>
          <dt style={{ color: "var(--ink-faint)" }}>Cancelled</dt>
          <dd>{new Date(cancellation.created_at).toLocaleString()}</dd>
        </dl>
      ) : canCancel ? (
        open ? (
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
            <label className="text-xs">
              Cancellation penalty fee
              <input
                type="number"
                min={0}
                step="0.01"
                value={penaltyFee}
                onChange={(e) => setPenaltyFee(e.target.value)}
                className="input mt-1"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="btn-danger btn-sm"
            >
              {submitting ? "…" : "Confirm cancellation"}
            </button>
            {error && (
              <p className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                {error}
              </p>
            )}
          </form>
        ) : (
          <button onClick={() => setOpen(true)} className="btn-secondary btn-sm">
            Cancel this booking
          </button>
        )
      ) : null}
    </div>
  );
}
