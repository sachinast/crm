"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import FlightBookingFields, {
  EMPTY_FLIGHT_BOOKING,
  type FlightBookingValue,
} from "@/components/booking/FlightBookingFields";

export default function FlightBookingForm({
  leadId,
  initial,
}: {
  leadId: string;
  initial: (FlightBookingValue & { total_amount: number }) | null;
}) {
  const router = useRouter();
  const isEdit = initial !== null;
  const [form, setForm] = useState<FlightBookingValue>(
    initial ? { ...EMPTY_FLIGHT_BOOKING, ...initial } : EMPTY_FLIGHT_BOOKING,
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
      const resp = await fetch(`/api/leads/${leadId}/flight-booking`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await resp.json().catch(() => ({}));
      setSubmitting(false);

      if (!resp.ok) {
        let msg = "Could not save flight booking";
        if (typeof body.detail === "string") {
          msg = body.detail;
        } else if (Array.isArray(body.detail)) {
          msg = body.detail
            .map((d: { msg?: string; loc?: string[] }) => {
              const field = d.loc && d.loc.length ? d.loc[d.loc.length - 1] : "";
              return field ? `${field.replace(/_/g, " ")}: ${d.msg}` : d.msg || JSON.stringify(d);
            })
            .join(" • ");
        } else if (body.message) {
          msg = body.message;
        }
        setError(msg);
        return;
      }

      if (sendEmail) {
        try {
          await fetch(`/api/leads/${leadId}/send-auth-email`, { method: "POST" });
        } catch (e) {
          console.error("Failed to trigger auth email:", e);
        }
      }

      router.push(`/leads/${leadId}`);
      router.refresh();
    } catch {
      setSubmitting(false);
      setError("Network error while saving flight booking.");
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    handleSaveBooking(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FlightBookingFields
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
