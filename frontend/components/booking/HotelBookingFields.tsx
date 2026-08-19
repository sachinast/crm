"use client";

import Field from "@/components/shared/FormField";
import DynamicFieldsBlock from "@/components/shared/DynamicFieldsBlock";
import MasterSelect from "@/components/shared/MasterSelect";

export interface HotelBookingValue {
  booking_reference: string;
  booking_platform: string;
  hotel_name: string;
  room_type: string;
  location: string;
  check_in_date: string;
  check_out_date: string;
  prepaid_amount: number;
  pay_at_counter_amount: number;
  custom_fields: Record<string, unknown>;
}

export const EMPTY_HOTEL_BOOKING: HotelBookingValue = {
  booking_reference: "",
  booking_platform: "",
  hotel_name: "",
  room_type: "",
  location: "",
  check_in_date: "",
  check_out_date: "",
  prepaid_amount: 0,
  pay_at_counter_amount: 0,
  custom_fields: {},
};

/** Hotel booking fields only — no form tag, no submit button. Reused by the
 * standalone edit page (HotelBookingForm.tsx) and the single-step lead
 * intake form (leads/new/page.tsx). */
export default function HotelBookingFields({
  value,
  onChange,
  disabled = false,
}: {
  value: HotelBookingValue;
  onChange: (next: HotelBookingValue) => void;
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
      <Field label="Hotel name">
        <MasterSelect fieldKey="hotel_name" value={value.hotel_name} onChange={(v) => onChange({ ...value, hotel_name: v })} />
      </Field>
      <Field label="Room type">
        <MasterSelect fieldKey="room_type" value={value.room_type} onChange={(v) => onChange({ ...value, room_type: v })} />
      </Field>
      <Field label="Location">
        <input required value={value.location} onChange={(e) => onChange({ ...value, location: e.target.value })} className="input" />
      </Field>
      <div />
      <Field label="Check-in date">
        <input required type="date" value={value.check_in_date} onChange={(e) => onChange({ ...value, check_in_date: e.target.value })} className="input" />
      </Field>
      <Field label="Check-out date">
        <input required type="date" value={value.check_out_date} onChange={(e) => onChange({ ...value, check_out_date: e.target.value })} className="input" />
      </Field>
      <Field label="Prepaid amount">
        <input required type="number" min={0} step="0.01" value={value.prepaid_amount} onChange={(e) => onChange({ ...value, prepaid_amount: Number(e.target.value) })} className="input" />
      </Field>
      <Field label="Pay-at-counter amount">
        <input required type="number" min={0} step="0.01" value={value.pay_at_counter_amount} onChange={(e) => onChange({ ...value, pay_at_counter_amount: Number(e.target.value) })} className="input" />
      </Field>

      <DynamicFieldsBlock
        entityType="hotel_booking"
        value={value.custom_fields}
        onChange={(next) => onChange({ ...value, custom_fields: next })}
      />

      <p className="col-span-2 text-xs" style={{ color: "var(--ink-muted)" }}>
        Total amount: {(Number(value.prepaid_amount) + Number(value.pay_at_counter_amount)).toFixed(2)} (computed)
      </p>
    </fieldset>
  );
}
