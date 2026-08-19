"use client";

import Field from "@/components/shared/FormField";
import DynamicFieldsBlock from "@/components/shared/DynamicFieldsBlock";
import MasterSelect from "@/components/shared/MasterSelect";

export interface CarBookingValue {
  booking_reference: string;
  booking_platform: string;
  car_provider: string;
  renter_dob: string;
  transmission: string;
  fuel_policy: string | null;
  vehicle_type: string;
  // "YYYY-MM-DDTHH:mm" (datetime-local's own format) — the caller converts
  // to/from ISO-UTC at load/submit time, same contract CarBookingForm.tsx
  // (this component's original home) already used.
  pickup_datetime: string;
  pickup_location: string;
  return_datetime: string;
  return_location: string;
  prepaid_amount: number;
  pay_at_counter_amount: number;
  custom_fields: Record<string, unknown>;
}

export const EMPTY_CAR_BOOKING: CarBookingValue = {
  booking_reference: "",
  booking_platform: "",
  car_provider: "",
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
  custom_fields: {},
};

/** Car booking fields only — no form tag, no submit button, no renter name
 * (that's the lead's own "Customer Name" now, see migration 0011). Reused by
 * the standalone edit page (CarBookingForm.tsx) and the single-step lead
 * intake form (leads/new/page.tsx). */
export default function CarBookingFields({
  value,
  onChange,
  disabled = false,
}: {
  value: CarBookingValue;
  onChange: (next: CarBookingValue) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="contents">
      <Field label="Booking reference">
        <input required value={value.booking_reference} onChange={(e) => onChange({ ...value, booking_reference: e.target.value })} className="input" />
      </Field>
      <Field label="Booking platform">
        <MasterSelect fieldKey="booking_platform" value={value.booking_platform} onChange={(v) => onChange({ ...value, booking_platform: v })} />
      </Field>
      <Field label="Car provider">
        <MasterSelect fieldKey="car_provider" value={value.car_provider} onChange={(v) => onChange({ ...value, car_provider: v })} />
      </Field>
      <Field label="Vehicle type">
        <MasterSelect fieldKey="vehicle_type" value={value.vehicle_type} onChange={(v) => onChange({ ...value, vehicle_type: v })} />
      </Field>
      <Field label="Renter date of birth">
        <input required type="date" value={value.renter_dob} onChange={(e) => onChange({ ...value, renter_dob: e.target.value })} className="input" />
      </Field>
      <Field label="Transmission">
        <MasterSelect fieldKey="transmission" value={value.transmission} onChange={(v) => onChange({ ...value, transmission: v })} />
      </Field>
      <Field label="Fuel policy">
        <input value={value.fuel_policy ?? ""} onChange={(e) => onChange({ ...value, fuel_policy: e.target.value })} className="input" placeholder="Full to Full" />
      </Field>
      <Field label="Pick-up date/time">
        <input required type="datetime-local" value={value.pickup_datetime} onChange={(e) => onChange({ ...value, pickup_datetime: e.target.value })} className="input" />
      </Field>
      <Field label="Pick-up location">
        <input required value={value.pickup_location} onChange={(e) => onChange({ ...value, pickup_location: e.target.value })} className="input" />
      </Field>
      <Field label="Return date/time">
        <input required type="datetime-local" value={value.return_datetime} onChange={(e) => onChange({ ...value, return_datetime: e.target.value })} className="input" />
      </Field>
      <Field label="Return location">
        <input required value={value.return_location} onChange={(e) => onChange({ ...value, return_location: e.target.value })} className="input" />
      </Field>
      <Field label="Prepaid amount">
        <input required type="number" min={0} step="0.01" value={value.prepaid_amount} onChange={(e) => onChange({ ...value, prepaid_amount: Number(e.target.value) })} className="input" />
      </Field>
      <Field label="Pay-at-counter amount">
        <input required type="number" min={0} step="0.01" value={value.pay_at_counter_amount} onChange={(e) => onChange({ ...value, pay_at_counter_amount: Number(e.target.value) })} className="input" />
      </Field>

      <DynamicFieldsBlock
        entityType="car_booking"
        value={value.custom_fields}
        onChange={(next) => onChange({ ...value, custom_fields: next })}
      />

      <p className="col-span-2 text-xs" style={{ color: "var(--ink-muted)" }}>
        Total amount: {(Number(value.prepaid_amount) + Number(value.pay_at_counter_amount)).toFixed(2)} (computed)
      </p>
    </fieldset>
  );
}
