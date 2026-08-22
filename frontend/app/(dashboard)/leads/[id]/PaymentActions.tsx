"use client";

import { CheckCircle2, XCircle, ShieldAlert, Trash2, StickyNote } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Billing's charge/decline action with secure ephemeral scratchpad
export default function PaymentActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [cardLastFour, setCardLastFour] = useState("");
  const [scratchpad, setScratchpad] = useState("");
  const [showNotepad, setShowNotepad] = useState(false);
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

    // Securely wipe ephemeral scratchpad from memory immediately
    setScratchpad("");
    setCardLastFour("");

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not process payment");
      return;
    }

    router.push("/leads");
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between border-b border-hairline pb-2.5">
        <h2 className="section-label">Process Payment</h2>
        <button
          type="button"
          onClick={() => setShowNotepad(!showNotepad)}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent px-2.5 py-1 rounded-lg border border-hairline bg-surface hover:bg-surface-raised transition-colors"
        >
          <StickyNote size={13} />
          <span>{showNotepad ? "Hide Scratchpad" : "Billing Scratchpad"}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={cardLastFour}
          onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Card last 4 digits (optional)"
          className="input w-52 font-mono"
        />
        <button
          onClick={() => handleProcess("charged")}
          disabled={submitting !== null}
          className="btn-sm inline-flex items-center gap-1.5 rounded-xl font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 [data-theme=light]:bg-emerald-50 [data-theme=light]:text-emerald-700 [data-theme=light]:border-emerald-200 transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 size={16} />
          {submitting === "charged" ? "…" : "Card Charged"}
        </button>
        <button
          onClick={() => handleProcess("declined")}
          disabled={submitting !== null}
          className="btn-sm inline-flex items-center gap-1.5 rounded-xl font-semibold bg-rose-950/40 text-rose-400 border border-rose-800/40 [data-theme=light]:bg-rose-50 [data-theme=light]:text-rose-700 [data-theme=light]:border-rose-200 transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle size={16} />
          {submitting === "declined" ? "…" : "Card Declined"}
        </button>
      </div>

      {/* Ephemeral Scratchpad */}
      {showNotepad && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-500">
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={14} />
              <span>Ephemeral Billing Scratchpad (Never stored in database — destroyed upon save)</span>
            </div>
            {scratchpad && (
              <button
                type="button"
                onClick={() => setScratchpad("")}
                className="flex items-center gap-1 text-danger hover:underline text-xs"
              >
                <Trash2 size={12} />
                <span>Wipe Notepad</span>
              </button>
            )}
          </div>
          <textarea
            rows={3}
            value={scratchpad}
            onChange={(e) => setScratchpad(e.target.value)}
            className="input text-xs font-mono bg-surface"
            placeholder="Paste temporary verification details, billing notes, or gateway response here (auto-destroyed on submit)..."
          />
        </div>
      )}

      {error && (
        <p className="alert-danger">
          {error}
        </p>
      )}
    </div>
  );
}
