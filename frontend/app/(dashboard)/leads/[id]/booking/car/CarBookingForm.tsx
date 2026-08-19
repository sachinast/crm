"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import CarBookingFields, { EMPTY_CAR_BOOKING, type CarBookingValue } from "@/components/booking/CarBookingFields";

// datetime-local inputs give "YYYY-MM-DDTHH:mm" with no timezone. Treating that
// as UTC is a Phase 3 simplification (the DB column is timezone-aware) — real
// timezone handling can be layered on later without changing the schema.
function toIsoUtc(localValue: string): string {
  return localValue ? `${localValue}:00Z` : localValue;
}
function fromIsoUtc(isoValue: string): string {
  return isoValue ? isoValue.slice(0, 16) : "";
}

export default function CarBookingForm({
  leadId,
  initial,
}: {
  leadId: string;
  initial: (CarBookingValue & { total_amount: number }) | null;
}) {
  const router = useRouter();
  const isEdit = initial !== null;
  const [form, setForm] = useState<CarBookingValue>(
    initial
      ? { ...initial, pickup_datetime: fromIsoUtc(initial.pickup_datetime), return_datetime: fromIsoUtc(initial.return_datetime) }
      : EMPTY_CAR_BOOKING,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      ...form,
      pickup_datetime: toIsoUtc(form.pickup_datetime),
      return_datetime: toIsoUtc(form.return_datetime),
      prepaid_amount: Number(form.prepaid_amount),
      pay_at_counter_amount: Number(form.pay_at_counter_amount),
    };

    const resp = await fetch(`/api/leads/${leadId}/car-booking`, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await resp.json();
    setSubmitting(false);

    if (!resp.ok) {
      setError(typeof body.detail === "string" ? body.detail : "Could not save car booking");
      return;
    }

    router.push(`/leads/${leadId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card grid grid-cols-2 gap-4">
      <CarBookingFields value={form} onChange={setForm} />

      {error && (
        <p className="col-span-2 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary col-span-2">
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Create car booking"}
      </button>
    </form>
  );
}
