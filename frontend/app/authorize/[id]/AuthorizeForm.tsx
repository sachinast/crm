"use client";

import { useState, type FormEvent } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

interface ConsentState {
  cardholder_confirmed: boolean;
  prepaid_charge_ack: boolean;
  pay_at_counter_ack: boolean;
  booking_details_ack: boolean;
  terms_ack: boolean;
  non_refundable_ack: boolean;
}

const CONSENT_ITEMS: { key: keyof ConsentState; label: string }[] = [
  { key: "cardholder_confirmed", label: "I am the authorized holder of the card on file." },
  { key: "prepaid_charge_ack", label: "I authorize the Prepaid Amount to be charged now." },
  { key: "pay_at_counter_ack", label: "I acknowledge the Pay-at-Counter amount is due on arrival/pickup." },
  { key: "booking_details_ack", label: "I have reviewed and approve the booking details above." },
  { key: "terms_ack", label: "I acknowledge the applicable rental/hotel/airline terms apply." },
  { key: "non_refundable_ack", label: "I understand this charge is non-refundable and non-disputable." },
];

const EMPTY: ConsentState = {
  cardholder_confirmed: false,
  prepaid_charge_ack: false,
  pay_at_counter_ack: false,
  booking_details_ack: false,
  terms_ack: false,
  non_refundable_ack: false,
};

// This is the one PUBLIC, unauthenticated form in the app (PRD §8) — it talks
// directly to the backend rather than through a Next.js route-handler proxy,
// since there's no session cookie/token to keep off the client here at all.
export default function AuthorizeForm({ leadId }: { leadId: string }) {
  const [consent, setConsent] = useState<ConsentState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const allChecked = Object.values(consent).every(Boolean);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch(`${API_BASE_URL}/leads/${leadId}/authorization`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(consent),
    });
    setSubmitting(false);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      const detail = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail;
      setError(detail ?? "Could not submit authorization");
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-sm text-green-900">
        <p className="font-medium">Thank you — your booking is confirmed.</p>
        <p className="mt-1 text-green-700">Our team will process your payment shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border p-4 text-sm">
      <h2 className="font-medium">Authorization &amp; consent</h2>
      {CONSENT_ITEMS.map((item) => (
        <label key={item.key} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={consent[item.key]}
            onChange={(e) => setConsent({ ...consent, [item.key]: e.target.checked })}
            className="mt-0.5"
          />
          <span>{item.label}</span>
        </label>
      ))}
      <label className="flex items-start gap-2 border-t pt-3">
        <span>By clicking below, I agree to all terms and conditions of this booking.</span>
      </label>

      {error && <p className="text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!allChecked || submitting}
        className="mt-2 rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-40"
      >
        {submitting ? "Submitting…" : "I Authorize"}
      </button>
    </form>
  );
}
