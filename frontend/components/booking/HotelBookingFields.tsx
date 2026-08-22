"use client";

import { Hotel, Calendar, FileText, Users, Tag, Sparkles, Info, MapPin, UserCheck, ShieldCheck, Calculator } from "lucide-react";

import Field from "@/components/shared/FormField";
import DynamicFieldsBlock from "@/components/shared/DynamicFieldsBlock";
import MasterSelect from "@/components/shared/MasterSelect";
import RichTextEditor from "@/components/shared/RichTextEditor";
import PaymentSummarySection, {
  type PaymentSummaryData,
} from "./PaymentSummarySection";

export interface HotelBookingValue extends PaymentSummaryData {
  booking_reference: string;
  booking_platform: string;
  booking_source?: string | null;
  transaction_type?: string | null;
  transaction_status?: string | null;
  status?: string | null;
  hotel_name: string;
  room_type: string;
  bed_type?: string | null;
  call_type?: string | null;
  itinerary_number?: string | null;
  num_guests?: number | null;
  num_rooms?: number | null;
  primary_guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  location: string;
  check_in_date: string;
  check_out_date: string;
  prepaid_amount: number;
  pay_at_counter_amount: number;
  attachment_url?: string | null;
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

export const EMPTY_HOTEL_BOOKING: HotelBookingValue = {
  booking_reference: "",
  booking_platform: "Booking.com Desk",
  booking_source: "eReserve Desk",
  transaction_type: "New",
  transaction_status: "Pending",
  status: "Authorization pending",
  hotel_name: "",
  room_type: "Standard room",
  bed_type: "",
  call_type: "Booking Modification",
  itinerary_number: "",
  num_guests: 1,
  num_rooms: 1,
  primary_guest_name: "",
  guest_email: "",
  guest_phone: "",
  location: "",
  check_in_date: "",
  check_out_date: "",
  prepaid_amount: 0,
  pay_at_counter_amount: 0,
  attachment_url: "",
  other_details: "",
  remarks: "",
  card_holder_name: "",
  card_number: "",
  card_type: "Visa",
  billing_address: "",
  cvv: "",
  card_expiry: "",
  charge_name: "Hotel Stay Charges",
  charge_amount: 0,
  company_amount: 0,
  platform_amount: 0,
  remarks_history: [],
  custom_fields: {},
};

export default function HotelBookingFields({
  value,
  onChange,
  onSave,
  onSaveAndEmail,
  onBack,
  hideGuestDetails = false,
  disabled = false,
  submitting = false,
}: {
  value: HotelBookingValue;
  onChange: (next: HotelBookingValue) => void;
  onSave?: () => void;
  onSaveAndEmail?: () => void;
  onBack?: () => void;
  hideGuestDetails?: boolean;
  disabled?: boolean;
  submitting?: boolean;
}) {
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

  const totalStayCost = (Number(value.prepaid_amount) || 0) + (Number(value.pay_at_counter_amount) || 0);

  return (
    <fieldset disabled={disabled} className="col-span-full space-y-6">
      {/* ========================================================================= */}
      {/* SECTION 1: BOOKING INFO */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-hidden">
        <div className="flex items-center justify-between bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline">
          <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink">
            <span className="p-1 rounded-lg bg-accent-soft text-accent">
              <Info size={17} />
            </span>
            <span>1. Booking Info</span>
          </div>
          <button
            type="button"
            onClick={autoGenRef}
            className="flex items-center gap-1.5 text-xs font-bold text-accent px-3 py-1 rounded-xl bg-accent-soft hover:bg-accent hover:text-white transition-all shadow-xs"
          >
            <Sparkles size={13} />
            <span>Auto-Gen CRMID</span>
          </button>
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
              placeholder="e.g. Completed / Pending"
            />
          </Field>

          <Field label="Booking Reference / CRMID" required>
            <div className="flex items-center gap-1.5">
              <input
                required
                value={value.booking_reference}
                onChange={(e) => onChange({ ...value, booking_reference: e.target.value })}
                className="input font-mono font-bold uppercase text-accent flex-1"
                placeholder="CRM-9021A4"
              />
              <button
                type="button"
                onClick={autoGenRef}
                title="Generate Random CRM ID"
                className="btn-secondary btn-sm px-2.5 shrink-0"
              >
                <Sparkles size={13} />
              </button>
            </div>
          </Field>

          <Field label="Itinerary Number">
            <input
              value={value.itinerary_number ?? ""}
              onChange={(e) => onChange({ ...value, itinerary_number: e.target.value })}
              className="input font-mono"
              placeholder="e.g. ITIN-994821"
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
      {/* SECTION 2: GUEST DETAILS (MATCHING SCREENSHOT) */}
      {/* ========================================================================= */}
      {!hideGuestDetails && (
        <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-hidden">
          <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline">
            <span className="p-1 rounded-lg bg-accent-soft text-accent">
              <UserCheck size={17} />
            </span>
            <span>Guest Details</span>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Primary Guest Name" required>
              <input
                required
                value={value.primary_guest_name ?? ""}
                onChange={(e) => onChange({ ...value, primary_guest_name: e.target.value })}
                className="input"
                placeholder="Primary Guest Full Name"
              />
            </Field>

            <Field label="Email-Id" required>
              <input
                required
                type="email"
                value={value.guest_email ?? ""}
                onChange={(e) => onChange({ ...value, guest_email: e.target.value })}
                className="input font-mono"
                placeholder="guest@example.com"
              />
            </Field>

            <Field label="Phone Number" required>
              <input
                required
                type="tel"
                value={value.guest_phone ?? ""}
                onChange={(e) => onChange({ ...value, guest_phone: e.target.value })}
                className="input font-mono"
                placeholder="+1 555-0199"
              />
            </Field>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: HOTEL & ROOM DETAILS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-hidden">
        <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline">
          <span className="p-1 rounded-lg bg-accent-soft text-accent">
            <Hotel size={17} />
          </span>
          <span>Hotel & Room Details</span>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Hotel Name" required>
            <MasterSelect
              fieldKey="hotel_name"
              optionType="master"
              value={value.hotel_name}
              onChange={(v) => onChange({ ...value, hotel_name: v })}
              placeholder="Select Hotel Property…"
            />
          </Field>

          <Field label="Room Type" required>
            <MasterSelect
              fieldKey="room_type"
              optionType="master"
              value={value.room_type}
              onChange={(v) => onChange({ ...value, room_type: v })}
              placeholder="Room Type…"
            />
          </Field>

          <Field label="Bed Type">
            <input
              value={value.bed_type ?? ""}
              onChange={(e) => onChange({ ...value, bed_type: e.target.value })}
              className="input"
              placeholder="e.g. 1 King Bed / 2 Queen Beds"
            />
          </Field>

          <Field label="Number of Guests">
            <input
              type="number"
              min={1}
              value={value.num_guests ?? 1}
              onChange={(e) => onChange({ ...value, num_guests: Number(e.target.value) })}
              className="input font-mono"
            />
          </Field>

          <Field label="Number of Rooms">
            <input
              type="number"
              min={1}
              value={value.num_rooms ?? 1}
              onChange={(e) => onChange({ ...value, num_rooms: Number(e.target.value) })}
              className="input font-mono"
            />
          </Field>

          <Field label="Call Type">
            <MasterSelect
              fieldKey="call_type"
              optionType="master"
              value={value.call_type}
              onChange={(v) => onChange({ ...value, call_type: v })}
              placeholder="Select Call Reason…"
            />
          </Field>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: STAY SCHEDULE & LOCATION */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-hidden">
        <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline">
          <span className="p-1 rounded-lg bg-accent-soft text-accent">
            <Calendar size={17} />
          </span>
          <span>Stay Schedule & Location</span>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Hotel City / Location" required>
              <input
                required
                value={value.location}
                onChange={(e) => onChange({ ...value, location: e.target.value })}
                className="input"
                placeholder="City, State / Address"
              />
            </Field>

            <Field label="Check-in Date" required>
              <input
                required
                type="date"
                value={value.check_in_date}
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => onChange({ ...value, check_in_date: e.target.value })}
                className="input font-mono"
              />
            </Field>

            <Field label="Check-out Date" required>
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

          {/* Stay Fare Summary (Live Auto-Calculated) */}
          <div className="rounded-xl border border-hairline bg-surface-raised/40 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <Calculator size={14} />
              <span>Stay Fare & Charges Breakdown (Auto-Calculated)</span>
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

              <Field label="Total Stay Amount ($) (Auto)">
                <input
                  readOnly
                  type="number"
                  step="0.01"
                  value={totalStayCost.toFixed(2)}
                  className="input font-mono font-extrabold bg-accent-soft text-accent cursor-not-allowed"
                />
              </Field>
            </div>
          </div>

          <div className="pt-2 border-t border-hairline space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
              Other Details / Special Instructions
            </label>
            <RichTextEditor
              value={value.other_details ?? ""}
              onChange={(val) => onChange({ ...value, other_details: val })}
              placeholder="Early check-in request, high floor, non-smoking notes, special requests…"
              rows={4}
            />
          </div>

          <div>
            <DynamicFieldsBlock
              entityType="hotel_booking"
              value={value.custom_fields}
              onChange={(next) => onChange({ ...value, custom_fields: next })}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5: PAYMENT SUMMARY */}
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
