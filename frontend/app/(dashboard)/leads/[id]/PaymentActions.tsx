"use client";

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
    <div className="rounded-lg border p-4">
      <h2 className="mb-2 text-sm font-medium">Process payment</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={cardLastFour}
          onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Card last 4 (optional)"
          className="rounded border px-3 py-1.5 text-xs"
        />
        <button
          onClick={() => handleProcess("charged")}
          disabled={submitting !== null}
          className="rounded border border-green-600 px-3 py-1.5 text-xs text-green-700 disabled:opacity-50"
        >
          {submitting === "charged" ? "…" : "Card Charged"}
        </button>
        <button
          onClick={() => handleProcess("declined")}
          disabled={submitting !== null}
          className="rounded border border-red-600 px-3 py-1.5 text-xs text-red-700 disabled:opacity-50"
        >
          {submitting === "declined" ? "…" : "Card Declined"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
