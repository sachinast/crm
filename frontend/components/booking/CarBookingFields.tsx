"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Car,
  Sparkles,
  UserCheck,
  FileText,
  CreditCard,
  Info,
  Calendar,
  Layers,
  Calculator,
} from "lucide-react";

import Field from "@/components/shared/FormField";
import DynamicFieldsBlock from "@/components/shared/DynamicFieldsBlock";
import MasterSelect from "@/components/shared/MasterSelect";
import ModernDateTimePicker from "@/components/shared/ModernDateTimePicker";
import RichTextEditor from "@/components/shared/RichTextEditor";
import PaymentSummarySection, {
  type PaymentSummaryData,
  type RemarkHistoryItem,
} from "./PaymentSummarySection";

export interface CarBookingValue extends PaymentSummaryData {
  booking_reference: string;
  booking_platform: string;
  booking_source?: string | null;
  transaction_type?: string | null;
  transaction_status?: string | null;
  status?: string | null;
  car_provider: string;
  car_model?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_license?: string | null;
  fuel_mileage?: string | null;
  booking_confirmation?: string | null;
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
  other_details?: string | null;
  remarks?: string | null;
  custom_fields: Record<string, unknown>;
}

export function generateRandomCRMID(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CRM-${code}`;
}

export const EMPTY_CAR_BOOKING: CarBookingValue = {
  booking_reference: "",
  booking_platform: "",
  booking_source: "ZAD CARS",
  transaction_type: "New",
  transaction_status: "Pending",
  status: "Authorization pending",
  car_provider: "",
  car_model: "",
  driver_name: "",
  driver_phone: "",
  driver_license: "",
  fuel_mileage: "Unlimited",
  booking_confirmation: "",
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
  other_details: "",
  remarks: "",
  card_holder_name: "",
  card_number: "",
  card_type: "Visa",
  billing_address: "",
  cvv: "",
  card_expiry: "",
  charge_name: "Car Rental Base + Taxes",
  charge_amount: 0,
  company_amount: 0,
  platform_amount: 0,
  remarks_history: [],
  custom_fields: {},
};

export default function CarBookingFields({
  value,
  onChange,
  onSave,
  onSaveAndEmail,
  onBack,
  disabled = false,
  submitting = false,
}: {
  value: CarBookingValue;
  onChange: (next: CarBookingValue) => void;
  onSave?: () => void;
  onSaveAndEmail?: () => void;
  onBack?: () => void;
  disabled?: boolean;
  submitting?: boolean;
}) {
  const [sameLocation, setSameLocation] = useState(
    !value.return_location || value.return_location === value.pickup_location,
  );

  function handlePickupLocationChange(loc: string) {
    if (sameLocation) {
      onChange({ ...value, pickup_location: loc, return_location: loc });
    } else {
      onChange({ ...value, pickup_location: loc });
    }
  }

  function handleSameLocationToggle(checked: boolean) {
    setSameLocation(checked);
    if (checked) {
      onChange({ ...value, return_location: value.pickup_location });
    }
  }

  useEffect(() => {
    if (!value.booking_reference) {
      onChange({ ...value, booking_reference: generateRandomCRMID() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function autoGenRef() {
    onChange({ ...value, booking_reference: generateRandomCRMID() });
  }

  function handleAmountChange(prepaid: number, counter: number) {
    const p = Math.max(0, prepaid);
    const c = Math.max(0, counter);
    onChange({
      ...value,
      prepaid_amount: p,
      pay_at_counter_amount: c,
      company_amount: p,
      platform_amount: c,
      charge_amount: p,
    });
  }

  const totalBookingCost = (Number(value.prepaid_amount) || 0) + (Number(value.pay_at_counter_amount) || 0);

  return (
    <fieldset disabled={disabled} className="col-span-full space-y-6">
      {/* ========================================================================= */}
      {/* SECTION 1: BOOKING INFO */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-visible relative">
        <div className="flex items-center justify-between bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline rounded-t-2xl">
          <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink">
            <span className="p-1 rounded-lg bg-accent-soft text-accent">
              <Info size={17} />
            </span>
            <span>1. Booking Info</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Booking Source">
            <MasterSelect
              fieldKey="booking_source"
              optionType="master"
              value={value.booking_source}
              onChange={(v) => onChange({ ...value, booking_source: v })}
              placeholder="Select Booking Source…"
            />
          </Field>

          <Field label="Transaction Type">
            <MasterSelect
              fieldKey="transaction_type"
              optionType="master"
              value={value.transaction_type}
              onChange={(v) => onChange({ ...value, transaction_type: v })}
              placeholder="Select Transaction Type…"
            />
          </Field>

          <Field label="Transaction Status">
            <input
              value={value.transaction_status ?? ""}
              onChange={(e) => onChange({ ...value, transaction_status: e.target.value })}
              className="input text-xs"
              placeholder="e.g. Completed / Pending / Charged"
            />
          </Field>

          <Field label="Booking Reference / CRMID (System Locked)" required>
            <input
              readOnly
              disabled
              value={value.booking_reference}
              className="input font-mono font-bold uppercase text-accent bg-surface-sunken cursor-not-allowed opacity-90 select-all"
              placeholder="CRN-9ELTVA"
              title="System CRM ID is permanently locked and cannot be modified."
            />
          </Field>

          <Field label="Booking Confirmation">
            <input
              value={value.booking_confirmation ?? ""}
              onChange={(e) => onChange({ ...value, booking_confirmation: e.target.value })}
              className="input font-mono"
              placeholder="e.g. CONF-8902"
            />
          </Field>

          <Field label="Booking Platform" required>
            <MasterSelect
              fieldKey="booking_platform"
              optionType="master"
              allowOther={true}
              value={value.booking_platform}
              onChange={(v) => onChange({ ...value, booking_platform: v })}
              placeholder="Booking Platform…"
            />
          </Field>

          <Field label="Booking Status">
            <MasterSelect
              fieldKey="booking_status"
              optionType="master"
              value={value.status}
              onChange={(v) => onChange({ ...value, status: v })}
              placeholder="Select Status…"
            />
          </Field>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: RENTER & DRIVER DETAILS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-visible relative">
        <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline rounded-t-2xl">
          <span className="p-1 rounded-lg bg-accent-soft text-accent">
            <UserCheck size={17} />
          </span>
          <span>2. Renter & Driver Details</span>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Renter Date of Birth" required>
            <ModernDateTimePicker
              required
              mode="date"
              value={value.renter_dob}
              onChange={(v) => onChange({ ...value, renter_dob: v })}
              placeholder="Select birth date…"
            />
          </Field>

          <Field label="Driver Full Name" required>
            <input
              required
              value={value.driver_name ?? ""}
              onChange={(e) => onChange({ ...value, driver_name: e.target.value })}
              className="input"
              placeholder="Driver Full Name"
            />
          </Field>

          <Field label="Driver Phone / Mobile" required>
            <input
              required
              type="tel"
              inputMode="tel"
              value={value.driver_phone ?? ""}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/[^\d+()-\s]/g, "");
                onChange({ ...value, driver_phone: sanitized });
              }}
              className="input font-mono"
              placeholder="+1 (555) 019-9283"
            />
          </Field>

          <Field label="Driver License / ID" required>
            <input
              required
              value={value.driver_license ?? ""}
              onChange={(e) => onChange({ ...value, driver_license: e.target.value })}
              className="input font-mono"
              placeholder="License Number"
            />
          </Field>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: CAR DETAILS & SCHEDULE / ROUTING */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-visible relative">
        <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline rounded-t-2xl">
          <span className="p-1 rounded-lg bg-accent-soft text-accent">
            <Car size={17} />
          </span>
          <span>3. Car Details & Schedule</span>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Car Provider" required>
              <MasterSelect
                fieldKey="car_provider"
                optionType="master"
                value={value.car_provider}
                onChange={(v) => onChange({ ...value, car_provider: v })}
                placeholder="Select Car Provider…"
              />
            </Field>

            <Field label="Car Model">
              <input
                value={value.car_model ?? ""}
                onChange={(e) => onChange({ ...value, car_model: e.target.value })}
                className="input"
                placeholder="e.g. Ford Explorer / Toyota RAV4"
              />
            </Field>

            <Field label="Vehicle Type" required>
              <MasterSelect
                fieldKey="vehicle_type"
                optionType="master"
                value={value.vehicle_type}
                onChange={(v) => onChange({ ...value, vehicle_type: v })}
                placeholder="Select Vehicle Type…"
              />
            </Field>

            <Field label="Transmission" required>
              <MasterSelect
                fieldKey="transmission"
                optionType="master"
                value={value.transmission}
                onChange={(v) => onChange({ ...value, transmission: v })}
                placeholder="Select Transmission…"
              />
            </Field>

            <Field label="Fuel Mileage / Limit">
              <input
                value={value.fuel_mileage ?? ""}
                onChange={(e) => onChange({ ...value, fuel_mileage: e.target.value })}
                className="input"
                placeholder="e.g. Unlimited / 200 mi/day"
              />
            </Field>
          </div>

          {/* Schedule & Routing with Pick-up and Drop-off Always Displayed */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-hairline">
            {/* Pick-up Box */}
            <div className="rounded-xl border border-hairline bg-surface-raised/40 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <MapPin size={14} />
                <span>Pick-up Details</span>
              </div>
              <Field label="Pick-up Location" required>
                <input
                  required
                  value={value.pickup_location}
                  onChange={(e) => handlePickupLocationChange(e.target.value)}
                  className="input"
                  placeholder="Airport Terminal / City Hub"
                />
              </Field>
              <Field label="Pick-up Date & Time" required>
                <ModernDateTimePicker
                  required
                  mode="datetime"
                  value={value.pickup_datetime}
                  onChange={(v) => onChange({ ...value, pickup_datetime: v })}
                  placeholder="Select pick-up date & time…"
                />
              </Field>
            </div>

            {/* Drop-off Box — Always Displayed */}
            <div className="rounded-xl border border-hairline bg-surface-raised/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <MapPin size={14} />
                  <span>Drop-off / Return Details</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer text-accent font-semibold">
                  <input
                    type="checkbox"
                    checked={sameLocation}
                    onChange={(e) => handleSameLocationToggle(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-hairline text-accent focus:ring-accent"
                  />
                  <span>Same as Pick-up</span>
                </label>
              </div>

              <Field label="Drop-off / Return Location" required>
                <input
                  required
                  value={sameLocation ? value.pickup_location : value.return_location}
                  disabled={sameLocation}
                  onChange={(e) => onChange({ ...value, return_location: e.target.value })}
                  className={`input ${sameLocation ? "opacity-75 bg-surface-sunken cursor-not-allowed" : ""}`}
                  placeholder="Drop-off Return Location"
                />
              </Field>

              <Field label="Return Date & Time" required>
                <ModernDateTimePicker
                  required
                  mode="datetime"
                  value={value.return_datetime}
                  onChange={(v) => onChange({ ...value, return_datetime: v })}
                  placeholder="Select return date & time…"
                />
              </Field>
            </div>
          </div>

          {/* Rental Fare Summary (Live Auto-Calculated) */}
          <div className="rounded-xl border border-hairline bg-surface-raised/40 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <Calculator size={14} />
              <span>Rental Fare & Charges Breakdown (Auto-Calculated)</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Prepaid Amount ($)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={value.prepaid_amount}
                  onChange={(e) => handleAmountChange(Number(e.target.value), value.pay_at_counter_amount)}
                  className="input font-mono font-bold"
                />
              </Field>

              <Field label="Pay at Counter Amount ($)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={value.pay_at_counter_amount}
                  onChange={(e) => handleAmountChange(value.prepaid_amount, Number(e.target.value))}
                  className="input font-mono font-bold"
                />
              </Field>

              <Field label="Total Rental Amount ($) (Auto)">
                <input
                  readOnly
                  type="number"
                  step="0.01"
                  value={totalBookingCost.toFixed(2)}
                  className="input font-mono font-extrabold bg-accent-soft text-accent cursor-not-allowed"
                />
              </Field>
            </div>
          </div>

          {/* Other details with RichTextEditor */}
          <div className="pt-2 border-t border-hairline space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
              Other Details / Special Instructions
            </label>
            <RichTextEditor
              value={value.other_details ?? ""}
              onChange={(val) => onChange({ ...value, other_details: val })}
              placeholder="Flight arrival details, child seat, booster seat notes, special instructions…"
              rows={4}
            />
          </div>

          <div>
            <DynamicFieldsBlock
              entityType="car_booking"
              value={value.custom_fields}
              onChange={(next) => onChange({ ...value, custom_fields: next })}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: PAYMENT SUMMARY */}
      {/* ========================================================================= */}
      <PaymentSummarySection
        data={value}
        onChange={(updates) => onChange({ ...value, ...updates })}
        onSave={onSave}
        onSaveAndEmail={onSaveAndEmail}
        onBack={onBack}
        submitting={submitting}
      />
    </fieldset>
  );
}
