"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

// PRD §7.3 — creation restricted to TL/CS (+ Admin/Super Admin oversight,
// enforced server-side; this form is just hidden from other roles).
export default function CreateFutureCreditForm() {
  const router = useRouter();
  const [form, setForm] = useState({ source_lead_id: "", voucher_amount: "", number_of_vouchers: "1", validity_date: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch("/api/future-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_lead_id: form.source_lead_id,
        voucher_amount: Number(form.voucher_amount),
        number_of_vouchers: Number(form.number_of_vouchers),
        validity_date: form.validity_date,
      }),
    });
    setSubmitting(false);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      const detail = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail;
      setError(detail ?? "Could not create future credit");
      return;
    }

    setForm({ source_lead_id: "", voucher_amount: "", number_of_vouchers: "1", validity_date: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm">
      <label className="col-span-2">
        Source lead ID
        <input
          required
          value={form.source_lead_id}
          onChange={(e) => setForm({ ...form, source_lead_id: e.target.value })}
          placeholder="UUID of the originating lead"
          className="input mt-1"
        />
      </label>
      <label>
        Voucher amount
        <input
          required
          type="number"
          min={0.01}
          step="0.01"
          value={form.voucher_amount}
          onChange={(e) => setForm({ ...form, voucher_amount: e.target.value })}
          className="input mt-1"
        />
      </label>
      <label>
        Number of vouchers
        <input
          required
          type="number"
          min={1}
          value={form.number_of_vouchers}
          onChange={(e) => setForm({ ...form, number_of_vouchers: e.target.value })}
          className="input mt-1"
        />
      </label>
      <label className="col-span-2">
        Validity date
        <input
          required
          type="date"
          value={form.validity_date}
          onChange={(e) => setForm({ ...form, validity_date: e.target.value })}
          className="input mt-1"
        />
      </label>
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="col-span-2 rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create future credit"}
      </button>
    </form>
  );
}
