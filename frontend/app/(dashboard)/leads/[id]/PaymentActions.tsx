"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Billing's charge/decline action — TECHNICAL_SPEC.md §5 POST /payments.
// Separate from the generic StatusActions buttons (which still list
// card_charged/card_declined as reachable transitions) because processing a
// payment also records a PaymentTransaction row with the amounts pulled from
// the booking, not just a bare status flip.
export default function PaymentActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [cardLastFour, setCardLastFour] = useState("");
  const [submitting, setSubmitting] = useState<"charged" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleProcess(outcome: "charged" | "declined") {
    setSubmitting(outcome);
    setError(null);

    const resp = await fetch(`/api/leads/${leadId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, card_last_four: cardLastFour || null }),
    });
    setSubmitting(null);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not process payment");
      return;
    }

    router.push("/leads");
    router.refresh();
  }

  return (
    <div className="card">
      <h2 className="section-label mb-3">Process payment</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={cardLastFour}
          onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Card last 4 (optional)"
          className="input w-48"
        />
        <button
          onClick={() => handleProcess("charged")}
          disabled={submitting !== null}
          className="btn-sm inline-flex items-center gap-1.5 rounded-lg font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--success-soft)", color: "var(--success)" }}
        >
          <CheckCircle2 size={14} />
          {submitting === "charged" ? "…" : "Card Charged"}
        </button>
        <button
          onClick={() => handleProcess("declined")}
          disabled={submitting !== null}
          className="btn-sm inline-flex items-center gap-1.5 rounded-lg font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          <XCircle size={14} />
          {submitting === "declined" ? "…" : "Card Declined"}
        </button>
      </div>
      {error && (
        <p className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
