"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import HotelBookingFields, {
  EMPTY_HOTEL_BOOKING,
  type HotelBookingValue,
} from "@/components/booking/HotelBookingFields";

export default function HotelBookingForm({
  leadId,
  initial,
}: {
  leadId: string;
  initial: (HotelBookingValue & { total_amount: number }) | null;
}) {
  const router = useRouter();
  const isEdit = initial !== null;
  const [form, setForm] = useState<HotelBookingValue>(
    initial ? { ...EMPTY_HOTEL_BOOKING, ...initial } : EMPTY_HOTEL_BOOKING,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSaveBooking(sendEmail: boolean = false) {
    setSubmitting(true);
    setError(null);

    const payload = {
      ...form,
      prepaid_amount: Number(form.prepaid_amount) || 0,
      pay_at_counter_amount: Number(form.pay_at_counter_amount) || 0,
      company_amount: Number(form.company_amount) || 0,
      platform_amount: Number(form.platform_amount) || 0,
    };

    try {
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

      if (sendEmail) {
        alert("Hotel booking saved and confirmation email sent to client.");
      }

      router.push(`/leads/${leadId}`);
      router.refresh();
    } catch {
      setSubmitting(false);
      setError("Network error while saving hotel booking.");
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    handleSaveBooking(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <HotelBookingFields
        value={form}
        onChange={setForm}
        onSave={() => handleSaveBooking(false)}
        onSaveAndEmail={() => handleSaveBooking(true)}
        onBack={() => router.push(`/leads/${leadId}`)}
        submitting={submitting}
      />

      {error && (
        <div className="alert-danger text-sm rounded-xl p-3.5 shadow-xs">
          {error}
        </div>
      )}
    </form>
  );
}
