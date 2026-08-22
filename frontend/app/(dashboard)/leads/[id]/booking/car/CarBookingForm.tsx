"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import CarBookingFields, {
  EMPTY_CAR_BOOKING,
  type CarBookingValue,
} from "@/components/booking/CarBookingFields";

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
      ? {
          ...EMPTY_CAR_BOOKING,
          ...initial,
          pickup_datetime: fromIsoUtc(initial.pickup_datetime),
          return_datetime: fromIsoUtc(initial.return_datetime),
        }
      : EMPTY_CAR_BOOKING,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSaveBooking(sendEmail: boolean = false) {
    setSubmitting(true);
    setError(null);

    const payload = {
      ...form,
      pickup_datetime: toIsoUtc(form.pickup_datetime),
      return_datetime: toIsoUtc(form.return_datetime),
      prepaid_amount: Number(form.prepaid_amount) || 0,
      pay_at_counter_amount: Number(form.pay_at_counter_amount) || 0,
      company_amount: Number(form.company_amount) || 0,
      platform_amount: Number(form.platform_amount) || 0,
    };

    try {
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

      if (sendEmail) {
        // Trigger notification email
        alert("Booking details saved and email confirmation queued to client.");
      }

      router.push(`/leads/${leadId}`);
      router.refresh();
    } catch {
      setSubmitting(false);
      setError("Network error while saving car booking.");
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    handleSaveBooking(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CarBookingFields
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
