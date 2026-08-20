"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import HotelBookingFields, { EMPTY_HOTEL_BOOKING, type HotelBookingValue } from "@/components/booking/HotelBookingFields";

export default function HotelBookingForm({
  leadId,
  initial,
}: {
  leadId: string;
  initial: (HotelBookingValue & { total_amount: number }) | null;
}) {
  const router = useRouter();
  const isEdit = initial !== null;
  const [form, setForm] = useState<HotelBookingValue>(initial ?? EMPTY_HOTEL_BOOKING);
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

    const resp = await fetch(`/api/leads/${leadId}/hotel-booking`, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await resp.json();
    setSubmitting(false);

    if (!resp.ok) {
      setError(typeof body.detail === "string" ? body.detail : "Could not save hotel booking");
      return;
    }

    router.push(`/leads/${leadId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card grid grid-cols-2 gap-4">
      <HotelBookingFields value={form} onChange={setForm} />

      {error && (
        <p className="col-span-2 alert-danger">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary col-span-2">
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Create hotel booking"}
      </button>
    </form>
  );
}
