"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface FlightBooking {
  booking_reference: string;
  pnr: string;
  airline: string;
  flight_numbers: string[];
  origin: string;
  destination: string;
  cabin_class: string;
  prepaid_amount: number;
  pay_at_counter_amount: number;
}

const EMPTY: FlightBooking = {
  booking_reference: "",
  pnr: "",
  airline: "",
  flight_numbers: [],
  origin: "",
  destination: "",
  cabin_class: "",
  prepaid_amount: 0,
  pay_at_counter_amount: 0,
};

export default function FlightBookingForm({
  leadId,
  initial,
}: {
  leadId: string;
  initial: (FlightBooking & { total_amount: number }) | null;
}) {
  const router = useRouter();
  const isEdit = initial !== null;
  const [form, setForm] = useState<FlightBooking>(initial ?? EMPTY);
  const [flightNumbersText, setFlightNumbersText] = useState((initial?.flight_numbers ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      ...form,
      flight_numbers: flightNumbersText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      prepaid_amount: Number(form.prepaid_amount),
      pay_at_counter_amount: Number(form.pay_at_counter_amount),
    };

    const resp = await fetch(`/api/leads/${leadId}/flight-booking`, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await resp.json();
    setSubmitting(false);

    if (!resp.ok) {
      setError(typeof body.detail === "string" ? body.detail : "Could not save flight booking");
      return;
    }

    router.push(`/leads/${leadId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-lg border p-4">
      <Field label="Booking reference">
        <input required value={form.booking_reference} onChange={(e) => setForm({ ...form, booking_reference: e.target.value })} className="input" />
      </Field>
      <Field label="PNR">
        <input required value={form.pnr} onChange={(e) => setForm({ ...form, pnr: e.target.value })} className="input" />
      </Field>
      <Field label="Airline">
        <input required value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} className="input" />
      </Field>
      <Field label="Cabin class">
        <input required value={form.cabin_class} onChange={(e) => setForm({ ...form, cabin_class: e.target.value })} className="input" placeholder="Economy, Business" />
      </Field>
      <Field label="Origin">
        <input required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="input" placeholder="JFK" />
      </Field>
      <Field label="Destination">
        <input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="input" placeholder="LAX" />
      </Field>
      <div className="col-span-2">
        <Field label="Flight number(s) — comma separated">
          <input required value={flightNumbersText} onChange={(e) => setFlightNumbersText(e.target.value)} className="input" placeholder="DL123, DL456" />
        </Field>
      </div>
      <Field label="Prepaid amount">
        <input required type="number" min={0} step="0.01" value={form.prepaid_amount} onChange={(e) => setForm({ ...form, prepaid_amount: Number(e.target.value) })} className="input" />
      </Field>
      <Field label="Pay-at-counter amount">
        <input required type="number" min={0} step="0.01" value={form.pay_at_counter_amount} onChange={(e) => setForm({ ...form, pay_at_counter_amount: Number(e.target.value) })} className="input" />
      </Field>

      <p className="col-span-2 text-xs text-neutral-500">
        Total amount: {(Number(form.prepaid_amount) + Number(form.pay_at_counter_amount)).toFixed(2)} (computed)
      </p>

      {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting} className="col-span-2 rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50">
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Create flight booking"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
