"use client";

import { MapPin, Car } from "lucide-react";

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
    <fieldset disabled={disabled} className="col-span-full grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* LEFT COLUMN: Vehicle & Rental Specifications (7 columns) */}
      <div className="rounded-2xl border border-hairline bg-surface p-4 lg:col-span-7 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
          <Car size={15} />
          <span>Vehicle & Rental Specifications</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Booking reference">
            <input
              required
              value={value.booking_reference}
              onChange={(e) => onChange({ ...value, booking_reference: e.target.value })}
              className="input"
              placeholder="e.g. CR-9021"
            />
          </Field>

          <Field label="Booking platform">
            <MasterSelect
              fieldKey="booking_platform"
              value={value.booking_platform}
              onChange={(v) => onChange({ ...value, booking_platform: v })}
            />
          </Field>

          <Field label="Car provider">
            <MasterSelect
              fieldKey="car_provider"
              value={value.car_provider}
              onChange={(v) => onChange({ ...value, car_provider: v })}
            />
          </Field>

          <Field label="Vehicle type">
            <MasterSelect
              fieldKey="vehicle_type"
              value={value.vehicle_type}
              onChange={(v) => onChange({ ...value, vehicle_type: v })}
            />
          </Field>

          <Field label="Transmission">
            <MasterSelect
              fieldKey="transmission"
              value={value.transmission}
              onChange={(v) => onChange({ ...value, transmission: v })}
            />
          </Field>

          <Field label="Fuel policy">
            <MasterSelect
              fieldKey="fuel_policy"
              value={value.fuel_policy ?? ""}
              onChange={(v) => onChange({ ...value, fuel_policy: v })}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Renter date of birth">
              <input
                required
                type="date"
                value={value.renter_dob}
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => onChange({ ...value, renter_dob: e.target.value })}
                className="input font-mono"
              />
            </Field>
          </div>
        </div>

        <div>
          <DynamicFieldsBlock
            entityType="car_booking"
            value={value.custom_fields}
            onChange={(next) => onChange({ ...value, custom_fields: next })}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Schedule & Journey Routing (5 columns) */}
      <div className="space-y-3 lg:col-span-5">
        <div className="rounded-2xl border border-hairline bg-surface p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
            <MapPin size={15} />
            <span>Schedule & Routing</span>
          </div>

          <div className="space-y-3">
            {/* Pick-up Block */}
            <div className="rounded-xl border border-hairline bg-surface-raised p-3.5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-accent">
                Pick-up Details
              </div>
              <Field label="Pick-up location">
                <input
                  required
                  value={value.pickup_location}
                  onChange={(e) => onChange({ ...value, pickup_location: e.target.value })}
                  className="input"
                  placeholder="Airport Terminal / City Hub"
                />
              </Field>
              <Field label="Pick-up date / time">
                <input
                  required
                  type="datetime-local"
                  value={value.pickup_datetime}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => onChange({ ...value, pickup_datetime: e.target.value })}
                  className="input font-mono"
                />
              </Field>
            </div>

            {/* Drop-off Block */}
            <div className="rounded-xl border border-hairline bg-surface-raised p-3.5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Drop-off / Return Details
              </div>
              <Field label="Return location">
                <input
                  required
                  value={value.return_location}
                  onChange={(e) => onChange({ ...value, return_location: e.target.value })}
                  className="input"
                  placeholder="Drop-off location"
                />
              </Field>
              <Field label="Return date / time">
                <input
                  required
                  type="datetime-local"
                  value={value.return_datetime}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => onChange({ ...value, return_datetime: e.target.value })}
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
