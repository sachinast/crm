"use client";

import { useState } from "react";

import Field from "@/components/shared/FormField";
import DynamicFieldsBlock from "@/components/shared/DynamicFieldsBlock";
import MasterSelect from "@/components/shared/MasterSelect";

export interface FlightBookingValue {
  booking_reference: string;
  booking_platform: string;
  pnr: string;
  airline: string;
  flight_numbers: string[];
  origin: string;
  destination: string;
  cabin_class: string;
  prepaid_amount: number;
  pay_at_counter_amount: number;
  custom_fields: Record<string, unknown>;
}

export const EMPTY_FLIGHT_BOOKING: FlightBookingValue = {
  booking_reference: "",
  booking_platform: "",
  pnr: "",
  airline: "",
  flight_numbers: [],
  origin: "",
  destination: "",
  cabin_class: "",
  prepaid_amount: 0,
  pay_at_counter_amount: 0,
  custom_fields: {},
};

/** Flight booking fields only — no form tag, no submit button. Reused by the
 * standalone edit page (FlightBookingForm.tsx) and the single-step lead
 * intake form (leads/new/page.tsx). flight_numbers is edited as a single
 * comma-separated text field and parsed into the array on every change. */
export default function FlightBookingFields({
  value,
  onChange,
  disabled = false,
}: {
  value: FlightBookingValue;
  onChange: (next: FlightBookingValue) => void;
  disabled?: boolean;
}) {
  const [flightNumbersText, setFlightNumbersText] = useState(value.flight_numbers.join(", "));

  function handleFlightNumbersChange(text: string) {
    setFlightNumbersText(text);
    onChange({
      ...value,
      flight_numbers: text.split(",").map((s) => s.trim()).filter(Boolean),
    });
  }

  return (
    <fieldset disabled={disabled} className="contents">
      <Field label="Booking reference">
        <input required value={value.booking_reference} onChange={(e) => onChange({ ...value, booking_reference: e.target.value })} className="input" />
      </Field>
      <Field label="Booking platform">
        <MasterSelect fieldKey="booking_platform" value={value.booking_platform} onChange={(v) => onChange({ ...value, booking_platform: v })} />
      </Field>
      <Field label="PNR">
        <input required value={value.pnr} onChange={(e) => onChange({ ...value, pnr: e.target.value })} className="input" />
      </Field>
      <Field label="Airline">
        <MasterSelect fieldKey="airline" value={value.airline} onChange={(v) => onChange({ ...value, airline: v })} />
      </Field>
      <Field label="Cabin class">
        <MasterSelect fieldKey="cabin_class" value={value.cabin_class} onChange={(v) => onChange({ ...value, cabin_class: v })} />
      </Field>
      <Field label="Origin">
        <input required value={value.origin} onChange={(e) => onChange({ ...value, origin: e.target.value })} className="input" placeholder="JFK" />
      </Field>
      <Field label="Destination">
        <input required value={value.destination} onChange={(e) => onChange({ ...value, destination: e.target.value })} className="input" placeholder="LAX" />
      </Field>
      <div className="col-span-2">
        <Field label="Flight number(s) — comma separated">
          <input required value={flightNumbersText} onChange={(e) => handleFlightNumbersChange(e.target.value)} className="input" placeholder="DL123, DL456" />
        </Field>
      </div>
      <Field label="Prepaid amount">
        <input required type="number" min={0} step="0.01" value={value.prepaid_amount} onChange={(e) => onChange({ ...value, prepaid_amount: Number(e.target.value) })} className="input" />
      </Field>
      <Field label="Pay-at-counter amount">
        <input required type="number" min={0} step="0.01" value={value.pay_at_counter_amount} onChange={(e) => onChange({ ...value, pay_at_counter_amount: Number(e.target.value) })} className="input" />
      </Field>

      <DynamicFieldsBlock
        entityType="flight_booking"
        value={value.custom_fields}
        onChange={(next) => onChange({ ...value, custom_fields: next })}
      />

      <p className="col-span-2 text-xs" style={{ color: "var(--ink-muted)" }}>
        Total amount: {(Number(value.prepaid_amount) + Number(value.pay_at_counter_amount)).toFixed(2)} (computed)
      </p>
    </fieldset>
  );
}
