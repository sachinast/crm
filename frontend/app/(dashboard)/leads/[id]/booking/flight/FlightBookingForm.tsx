"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import FlightBookingFields, {
  EMPTY_FLIGHT_BOOKING,
  type FlightBookingValue,
} from "@/components/booking/FlightBookingFields";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function FlightBookingForm({
  leadId,
  initial,
  readOnly = false,
}: {
  leadId: string;
  initial: (FlightBookingValue & { total_amount: number }) | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const isEdit = initial !== null;
  const [form, setForm] = useState<FlightBookingValue>(
    initial ? { ...EMPTY_FLIGHT_BOOKING, ...initial } : EMPTY_FLIGHT_BOOKING,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSaveBooking(sendEmail: boolean = false) {
    setError(null);

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

  if (readOnly) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-500 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} />
            <span className="font-bold uppercase tracking-wider">Read-Only Booking Record</span>
            <span className="text-ink-muted hidden sm:inline">— Department Staff Access</span>
          </div>
          <Link href={`/leads/${leadId}`} className="btn-secondary btn-sm font-semibold">
            Back to Lead Workspace
          </Link>
        </div>

        <fieldset disabled className="space-y-4 select-text">
          <FlightBookingFields
            value={form}
            onChange={() => {}}
            onBack={() => router.push(`/leads/${leadId}`)}
            readOnly={true}
            disabled={true}
            submitting={false}
          />
        </fieldset>
      </div>
    );
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
