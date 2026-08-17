"use client";

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
    <div className="rounded-lg border p-4 text-sm">
      <h2 className="mb-2 font-medium">Cancellation</h2>

      {cancellation ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-neutral-500">Original prepaid</dt>
          <dd>${cancellation.original_prepaid_amount.toFixed(2)}</dd>
          <dt className="text-neutral-500">Penalty fee</dt>
          <dd>${cancellation.cancellation_penalty_fee.toFixed(2)}</dd>
          <dt className="text-neutral-500">Refund to customer</dt>
          <dd>${cancellation.refund_amount.toFixed(2)}</dd>
          <dt className="text-neutral-500">Retained by agency</dt>
          <dd>${cancellation.final_retained_amount.toFixed(2)}</dd>
          <dt className="text-neutral-500">Cancelled</dt>
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
              className="rounded border border-red-600 px-3 py-1.5 text-xs text-red-700 disabled:opacity-50"
            >
              {submitting ? "…" : "Confirm cancellation"}
            </button>
            {error && <p className="w-full text-xs text-red-600">{error}</p>}
          </form>
        ) : (
          <button onClick={() => setOpen(true)} className="rounded border px-3 py-1.5 text-xs hover:bg-neutral-100">
            Cancel this booking
          </button>
        )
      ) : null}
    </div>
  );
}
