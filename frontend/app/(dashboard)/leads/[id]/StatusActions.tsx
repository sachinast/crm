"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { statusBadgeClass } from "@/lib/status-colors";

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

  // Partial Refund Modal state (PRD Point 12)
  const [showPartialRefundModal, setShowPartialRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [partialRefundError, setPartialRefundError] = useState<string | null>(null);

  async function executeTransition(newStatus: string, refundedAmount?: number) {
    setSubmitting(newStatus);
    setError(null);

    const payload: { new_status: string; refunded_amount?: number } = { new_status: newStatus };
    if (refundedAmount !== undefined) {
      payload.refunded_amount = refundedAmount;
    }

    const resp = await fetch(`/api/leads/${leadId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(null);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      const detail = typeof body.detail === "string" ? body.detail : "Could not change status";
      if (newStatus === "tag_partial_refund") {
        setPartialRefundError(detail);
      } else {
        setError(detail);
      }
      return;
    }

    setShowPartialRefundModal(false);
    setRefundAmount("");

    // A transition can move the lead out of the current user's visibility
    // Refreshing / navigating safely:
    router.push("/leads");
    router.refresh();
  }

  function handleClick(newStatus: string) {
    if (newStatus === "tag_partial_refund") {
      setPartialRefundError(null);
      setRefundAmount("");
      setShowPartialRefundModal(true);
      return;
    }
    executeTransition(newStatus);
  }

  function handlePartialRefundSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      setPartialRefundError("Please enter a valid refund amount greater than 0");
      return;
    }
    executeTransition("tag_partial_refund", amt);
  }

  if (transitions.length === 0) {
    return <p className="text-xs text-ink-faint">No status actions available for your role right now.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => {
          const colorClass = statusBadgeClass(t.ui_color);
          return (
            <button
              key={t.status}
              onClick={() => handleClick(t.status)}
              disabled={submitting !== null}
              className={`btn-sm rounded-xl font-semibold shadow-xs transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${colorClass}`}
            >
              {submitting === t.status ? "…" : t.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 alert-danger">
          {error}
        </p>
      )}

      {/* Partial Refund Amount Modal (Point 12) */}
      {showPartialRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="card w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Process Partial Refund</h3>
                <p className="text-xs text-ink-muted">Enter the refund amount to be returned to the customer.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPartialRefundModal(false)}
                className="text-ink-muted hover:text-ink text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePartialRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                  Refunded Amount ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-muted font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={refundAmount}
                    onChange={(e) => {
                      setRefundAmount(e.target.value);
                      setPartialRefundError(null);
                    }}
                    autoFocus
                    required
                    className="input pl-8 font-mono font-bold text-base"
                  />
                </div>
                <p className="text-[11px] text-ink-muted mt-1">
                  This amount will be recorded in payment history and reflected in ledger reports.
                </p>
              </div>

              {partialRefundError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500 font-medium">
                  {partialRefundError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowPartialRefundModal(false)}
                  className="btn-secondary"
                  disabled={submitting !== null}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting !== null || !refundAmount || parseFloat(refundAmount) <= 0}
                  className="btn-primary"
                >
                  {submitting === "tag_partial_refund" ? "Processing…" : "Confirm Partial Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
