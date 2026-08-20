"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import FlightBookingFields, { EMPTY_FLIGHT_BOOKING, type FlightBookingValue } from "@/components/booking/FlightBookingFields";

export default function FlightBookingForm({
  leadId,
  initial,
}: {
  leadId: string;
  initial: (FlightBookingValue & { total_amount: number }) | null;
}) {
  const router = useRouter();
  const isEdit = initial !== null;
  const [form, setForm] = useState<FlightBookingValue>(initial ?? EMPTY_FLIGHT_BOOKING);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      ...form,
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
    <form onSubmit={handleSubmit} className="card grid grid-cols-2 gap-4">
      <FlightBookingFields value={form} onChange={setForm} />

      {error && (
        <p className="col-span-2 alert-danger">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary col-span-2">
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Create flight booking"}
      </button>
    </form>
  );
}
