"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import CarBookingFields, {
  EMPTY_CAR_BOOKING,
  type CarBookingValue,
} from "@/components/booking/CarBookingFields";

function toIsoUtc(localValue: string): string {
  if (!localValue) return "";
  try {
    const d = new Date(localValue);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch {}
  return localValue.endsWith("Z") ? localValue : `${localValue}:00Z`;
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
    setError(null);

    if (!form.booking_platform?.trim()) {
      setError("Booking Platform is required");
      return;
    }
    if (!form.car_provider?.trim()) {
      setError("Car Provider is required");
      return;
    }
    if (!form.vehicle_type?.trim()) {
      setError("Vehicle Type is required");
      return;
    }
    if (!form.transmission?.trim()) {
      setError("Transmission is required");
      return;
    }
    if (!form.renter_dob?.trim()) {
      setError("Renter Date of Birth is required");
      return;
    }
    if (!form.driver_name?.trim()) {
      setError("Driver Full Name is required");
      return;
    }
    if (!form.driver_phone?.trim()) {
      setError("Driver Phone / Mobile is required");
      return;
    }
    if (!form.driver_license?.trim()) {
      setError("Driver License / ID is required");
      return;
    }
    if (!form.pickup_location?.trim()) {
      setError("Pick-up Location is required");
      return;
    }
    if (!form.pickup_datetime?.trim()) {
      setError("Pick-up Date & Time is required");
      return;
    }
    if (!form.return_location?.trim()) {
      setError("Drop-off / Return Location is required");
      return;
    }
    if (!form.return_datetime?.trim()) {
      setError("Return Date & Time is required");
      return;
    }

    const hasRemarks =
      (form.remarks_history && form.remarks_history.length > 0) ||
      (form.remarks && form.remarks.trim().length > 0);
    if (!hasRemarks) {
      setError("Remarks is mandatory. Please enter at least one remark in the Remarks section.");
      return;
    }

    setSubmitting(true);

    const payload = {
      ...form,
      renter_dob: form.renter_dob ? form.renter_dob.split("T")[0] : "1990-01-01",
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
      const body = await resp.json().catch(() => ({}));
      setSubmitting(false);

      if (!resp.ok) {
        let msg = "Could not save car booking";
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
