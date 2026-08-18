"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { VEHICLE_TYPES } from "@/lib/vehicle-types";

interface CarBooking {
  booking_reference: string;
  booking_platform: string;
  car_provider: string;
  renter_name: string;
  renter_dob: string;
  transmission: string;
  fuel_policy: string | null;
  vehicle_type: string;
  pickup_datetime: string;
  pickup_location: string;
  return_datetime: string;
  return_location: string;
  prepaid_amount: number;
  pay_at_counter_amount: number;
}

const EMPTY: CarBooking = {
  booking_reference: "",
  booking_platform: "",
  car_provider: "",
  renter_name: "",
  renter_dob: "",
  transmission: "automatic",
  fuel_policy: "",
  vehicle_type: "economy",
  pickup_datetime: "",
  pickup_location: "",
  return_datetime: "",
  return_location: "",
  prepaid_amount: 0,
  pay_at_counter_amount: 0,
};

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
  initial: (CarBooking & { total_amount: number }) | null;
}) {
  const router = useRouter();
  const isEdit = initial !== null;
  const [form, setForm] = useState<CarBooking>(
    initial
      ? { ...initial, pickup_datetime: fromIsoUtc(initial.pickup_datetime), return_datetime: fromIsoUtc(initial.return_datetime) }
      : EMPTY,
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
      <Field label="Booking reference">
        <input required value={form.booking_reference} onChange={(e) => setForm({ ...form, booking_reference: e.target.value })} className="input" />
      </Field>
      <Field label="Booking platform">
        <input required value={form.booking_platform} onChange={(e) => setForm({ ...form, booking_platform: e.target.value })} className="input" placeholder="eBookingHub, Our Booking" />
      </Field>
      <Field label="Car provider">
        <input required value={form.car_provider} onChange={(e) => setForm({ ...form, car_provider: e.target.value })} className="input" placeholder="Hertz, Budget" />
      </Field>
      <Field label="Vehicle type">
        <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} className="input">
          {VEHICLE_TYPES.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Renter name">
        <input required value={form.renter_name} onChange={(e) => setForm({ ...form, renter_name: e.target.value })} className="input" />
      </Field>
      <Field label="Renter date of birth">
        <input required type="date" value={form.renter_dob} onChange={(e) => setForm({ ...form, renter_dob: e.target.value })} className="input" />
      </Field>
      <Field label="Transmission">
        <select value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })} className="input">
          <option value="automatic">Automatic</option>
          <option value="manual">Manual</option>
        </select>
      </Field>
      <Field label="Fuel policy">
        <input value={form.fuel_policy ?? ""} onChange={(e) => setForm({ ...form, fuel_policy: e.target.value })} className="input" placeholder="Full to Full" />
      </Field>
      <Field label="Pick-up date/time">
        <input required type="datetime-local" value={form.pickup_datetime} onChange={(e) => setForm({ ...form, pickup_datetime: e.target.value })} className="input" />
      </Field>
      <Field label="Pick-up location">
        <input required value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} className="input" />
      </Field>
      <Field label="Return date/time">
        <input required type="datetime-local" value={form.return_datetime} onChange={(e) => setForm({ ...form, return_datetime: e.target.value })} className="input" />
      </Field>
      <Field label="Return location">
        <input required value={form.return_location} onChange={(e) => setForm({ ...form, return_location: e.target.value })} className="input" />
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
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Create car booking"}
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
