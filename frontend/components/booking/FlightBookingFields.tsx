"use client";

import { useState } from "react";
import { Plane, MapPin } from "lucide-react";

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
    <fieldset disabled={disabled} className="col-span-full grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* LEFT COLUMN: Airline & Carrier Specs (7 columns) */}
      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-raised)] p-3.5 lg:col-span-7">
        <div className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
          <Plane size={14} />
          <span>Flight & Carrier Specifications</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Field label="Booking reference">
            <input
              required
              value={value.booking_reference}
              onChange={(e) => onChange({ ...value, booking_reference: e.target.value })}
              className="input"
              placeholder="e.g. FL-8812"
            />
          </Field>

          <Field label="Booking platform">
            <MasterSelect
              fieldKey="booking_platform"
              value={value.booking_platform}
              onChange={(v) => onChange({ ...value, booking_platform: v })}
            />
          </Field>

          <Field label="PNR code">
            <input
              required
              value={value.pnr}
              onChange={(e) => onChange({ ...value, pnr: e.target.value })}
              className="input font-mono uppercase"
              placeholder="e.g. 689968"
            />
          </Field>

          <Field label="Airline">
            <MasterSelect
              fieldKey="airline"
              value={value.airline}
              onChange={(v) => onChange({ ...value, airline: v })}
            />
          </Field>

          <Field label="Cabin class">
            <MasterSelect
              fieldKey="cabin_class"
              value={value.cabin_class}
              onChange={(v) => onChange({ ...value, cabin_class: v })}
            />
          </Field>

          <Field label="Flight number(s)">
            <input
              required
              value={flightNumbersText}
              onChange={(e) => handleFlightNumbersChange(e.target.value)}
              className="input font-mono"
              placeholder="DL123, DL456"
            />
          </Field>
        </div>

        <div className="mt-2.5">
          <DynamicFieldsBlock
            entityType="flight_booking"
            value={value.custom_fields}
            onChange={(next) => onChange({ ...value, custom_fields: next })}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Flight Routing (5 columns) */}
      <div className="space-y-3 lg:col-span-5">
        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-raised)] p-3.5">
          <div className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-200">
            <MapPin size={13} className="text-[var(--accent)]" />
            <span>Flight Routing</span>
          </div>

          <div className="space-y-2.5">
            <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-2.5 space-y-2">
              <Field label="Origin airport / city">
                <input
                  required
                  value={value.origin}
                  onChange={(e) => onChange({ ...value, origin: e.target.value })}
                  className="input"
                  placeholder="DEL / JFK"
                />
              </Field>

              <Field label="Destination airport / city">
                <input
                  required
                  value={value.destination}
                  onChange={(e) => onChange({ ...value, destination: e.target.value })}
                  className="input"
                  placeholder="LHR / LAX"
                />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
