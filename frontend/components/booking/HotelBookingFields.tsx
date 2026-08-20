"use client";

import { Hotel, Calendar } from "lucide-react";

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
    <fieldset disabled={disabled} className="col-span-full grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* LEFT COLUMN: Hotel Property & Room Details (7 columns) */}
      <div className="rounded-2xl border border-hairline bg-surface p-4 lg:col-span-7 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
          <Hotel size={15} />
          <span>Property & Room Details</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Booking reference">
            <input
              required
              value={value.booking_reference}
              onChange={(e) => onChange({ ...value, booking_reference: e.target.value })}
              className="input"
              placeholder="e.g. HT-4029"
            />
          </Field>

          <Field label="Booking platform">
            <MasterSelect
              fieldKey="booking_platform"
              value={value.booking_platform}
              onChange={(v) => onChange({ ...value, booking_platform: v })}
            />
          </Field>

          <Field label="Hotel name">
            <MasterSelect
              fieldKey="hotel_name"
              value={value.hotel_name}
              onChange={(v) => onChange({ ...value, hotel_name: v })}
            />
          </Field>

          <Field label="Room type">
            <MasterSelect
              fieldKey="room_type"
              value={value.room_type}
              onChange={(v) => onChange({ ...value, room_type: v })}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Location / City">
              <input
                required
                value={value.location}
                onChange={(e) => onChange({ ...value, location: e.target.value })}
                className="input"
                placeholder="City / Destination"
              />
            </Field>
          </div>
        </div>

        <div>
          <DynamicFieldsBlock
            entityType="hotel_booking"
            value={value.custom_fields}
            onChange={(next) => onChange({ ...value, custom_fields: next })}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Stay Schedule & Dates (5 columns) */}
      <div className="space-y-3 lg:col-span-5">
        <div className="rounded-2xl border border-hairline bg-surface p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
            <Calendar size={15} />
            <span>Stay Schedule</span>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-hairline bg-surface-raised p-3.5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-accent">
                Check-in / Check-out
              </div>
              <Field label="Check-in date">
                <input
                  required
                  type="date"
                  value={value.check_in_date}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => onChange({ ...value, check_in_date: e.target.value })}
                  className="input font-mono"
                />
              </Field>
              <Field label="Check-out date">
                <input
                  required
                  type="date"
                  value={value.check_out_date}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => onChange({ ...value, check_out_date: e.target.value })}
                  className="input font-mono"
                />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
