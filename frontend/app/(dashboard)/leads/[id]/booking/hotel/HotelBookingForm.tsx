"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface HotelBooking {
  booking_reference: string;
  booking_platform: string;
  hotel_name: string;
  room_type: string;
  location: string;
  check_in_date: string;
  check_out_date: string;
  prepaid_amount: number;
  pay_at_counter_amount: number;
}

const EMPTY: HotelBooking = {
  booking_reference: "",
  booking_platform: "",
  hotel_name: "",
  room_type: "",
  location: "",
  check_in_date: "",
  check_out_date: "",
  prepaid_amount: 0,
  pay_at_counter_amount: 0,
};

export default function HotelBookingForm({
  leadId,
  initial,
}: {
  leadId: string;
  initial: (HotelBooking & { total_amount: number }) | null;
}) {
  const router = useRouter();
  const isEdit = initial !== null;
  const [form, setForm] = useState<HotelBooking>(initial ?? EMPTY);
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
      <Field label="Booking reference">
        <input required value={form.booking_reference} onChange={(e) => setForm({ ...form, booking_reference: e.target.value })} className="input" />
      </Field>
      <Field label="Booking platform">
        <input required value={form.booking_platform} onChange={(e) => setForm({ ...form, booking_platform: e.target.value })} className="input" />
      </Field>
      <Field label="Hotel name">
        <input required value={form.hotel_name} onChange={(e) => setForm({ ...form, hotel_name: e.target.value })} className="input" />
      </Field>
      <Field label="Room type">
        <input required value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })} className="input" />
      </Field>
      <Field label="Location">
        <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" />
      </Field>
      <div />
      <Field label="Check-in date">
        <input required type="date" value={form.check_in_date} onChange={(e) => setForm({ ...form, check_in_date: e.target.value })} className="input" />
      </Field>
      <Field label="Check-out date">
        <input required type="date" value={form.check_out_date} onChange={(e) => setForm({ ...form, check_out_date: e.target.value })} className="input" />
      </Field>
      <Field label="Prepaid amount">
        <input required type="number" min={0} step="0.01" value={form.prepaid_amount} onChange={(e) => setForm({ ...form, prepaid_amount: Number(e.target.value) })} className="input" />
      </Field>
      <Field label="Pay-at-counter amount">
        <input required type="number" min={0} step="0.01" value={form.pay_at_counter_amount} onChange={(e) => setForm({ ...form, pay_at_counter_amount: Number(e.target.value) })} className="input" />
      </Field>

      <p className="col-span-2 text-xs" style={{ color: "var(--ink-muted)" }}>
        Total amount: {(Number(form.prepaid_amount) + Number(form.pay_at_counter_amount)).toFixed(2)} (computed)
      </p>

      {error && (
        <p className="col-span-2 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary col-span-2">
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Create hotel booking"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
