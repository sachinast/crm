"use client";

import { useState, useEffect } from "react";
import {
  Plane,
  MapPin,
  DollarSign,
  Tag,
  Sparkles,
  Layers,
  FileText,
  Info,
  Users,
  CreditCard,
  Building2,
  Trash2,
  Plus,
  Calculator,
} from "lucide-react";

import Field from "@/components/shared/FormField";
import DynamicFieldsBlock from "@/components/shared/DynamicFieldsBlock";
import MasterSelect from "@/components/shared/MasterSelect";
import RichTextEditor from "@/components/shared/RichTextEditor";
import PaymentSummarySection, {
  type PaymentSummaryData,
} from "./PaymentSummarySection";

export const FLIGHT_SUB_CATEGORIES: Record<string, string[]> = {
  New: [
    "In order to process your New Booking",
    "In order to process Booking through future credit or Voucher",
  ],
  Changes: [
    "In order to process Change in your existing flight ticket",
  ],
  Cancel: [
    "In order to process Cancellation of your existing ticket",
    "In order to process Cancellation of your existing ticket Against Refund",
    "In order to process Cancellation of your existing ticket Against future Credit",
  ],
  "Add On Services": [
    "Add On Services",
  ],
};

export interface FlightPassenger {
  title: string;
  first_name: string;
  last_name: string;
  dob: string;
  e_ticket_number?: string;
  airline?: string;
  confirmation_no?: string;
}

export interface SpecialNoteItem {
  sl_no: number;
  special_note: string;
  updated_on: string;
  updated_by: string;
}

export interface FlightBookingValue extends PaymentSummaryData {
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
  main_category?: string | null;
  sub_category?: string | null;
  account_name?: string | null;
  booking_source_email?: string | null;
  source_text?: string | null;
  priority?: string | null;
  trip_type?: string | null;
  hk_gk?: string | null;
  currency?: string | null;
  ticket_cost?: number | null;
  mco_charge?: number | null;
  merchant_fee: number;
  cvv_fee: number;
  total_auth_amount?: number | null;
  margin?: number | null;
  attachment_url?: string | null;
  important: boolean;
  other_details?: string | null;
  remarks?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  passengers?: FlightPassenger[] | null;
  special_notes?: SpecialNoteItem[] | null;
  booking_source?: string | null;
  transaction_type?: string | null;
  transaction_status?: string | null;
  lead_tag?: string | null;
  leads_booking_source?: string | null;
  title?: string | null;
  class_of_service?: string | null;
  add_on_services?: string | null;
  status?: string | null;
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

export const EMPTY_FLIGHT_BOOKING: FlightBookingValue = {
  booking_reference: "",
  booking_platform: "Amadeus GDS",
  pnr: "",
  airline: "",
  flight_numbers: [],
  origin: "",
  destination: "",
  cabin_class: "Economy",
  prepaid_amount: 0,
  pay_at_counter_amount: 0,
  main_category: "New",
  sub_category: "In order to process your New Booking",
  account_name: "",
  booking_source_email: "",
  source_text: "",
  priority: "Low",
  trip_type: "One Way",
  hk_gk: "HK",
  currency: "$",
  ticket_cost: 0,
  mco_charge: 0,
  merchant_fee: 15,
  cvv_fee: 0,
  total_auth_amount: 15,
  margin: 15,
  attachment_url: "",
  important: false,
  other_details: "",
  remarks: "",
  contact_email: "",
  contact_phone: "",
  passengers: [],
  special_notes: [],
  booking_source: "Flight Ticket Desk",
  transaction_type: "New",
  transaction_status: "Pending",
  lead_tag: "Flight",
  leads_booking_source: "Amadeus PNR",
  title: "Mr",
  class_of_service: "Economy",
  add_on_services: "",
  status: "Authorization pending",
  card_holder_name: "",
  card_number: "",
  card_type: "Visa",
  billing_address: "",
  cvv: "",
  card_expiry: "",
  charge_name: "Flight Airfare + Ancillaries",
  charge_amount: 15,
  company_amount: 15,
  platform_amount: 0,
  remarks_history: [],
  custom_fields: {},
};

export default function FlightBookingFields({
  value,
  onChange,
  onSave,
  onSaveAndEmail,
  onBack,
  agentName = "Current Agent",
  disabled = false,
  submitting = false,
}: {
  value: FlightBookingValue;
  onChange: (next: FlightBookingValue) => void;
  onSave?: () => void;
  onSaveAndEmail?: () => void;
  onBack?: () => void;
  agentName?: string;
  disabled?: boolean;
  submitting?: boolean;
}) {
  const [flightNumInput, setFlightNumInput] = useState(
    value.flight_numbers.join(", "),
  );

  // Temporary state for adding a passenger
  const [newTitle, setNewTitle] = useState("Mr");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newDob, setNewDob] = useState("");

  const passengerList = value.passengers ?? [];
  const specialNotesList = value.special_notes ?? [];

  function autoGenRef() {
    onChange({ ...value, booking_reference: generateRandomCRMID() });
  }

  function handleFlightNumbersBlur() {
    const list = flightNumInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ ...value, flight_numbers: list });
  }

  function handleMainCategoryChange(newMainCat: string) {
    const availableSubs = FLIGHT_SUB_CATEGORIES[newMainCat] || [];
    const defaultSub = availableSubs.length > 0 ? availableSubs[0] : "";
    onChange({
      ...value,
      main_category: newMainCat,
      sub_category: defaultSub,
    });
  }

  function handleAddPassenger() {
    if (!newFirstName.trim() || !newLastName.trim()) {
      alert("Please enter First Name and Last Name.");
      return;
    }
    const newPax: FlightPassenger = {
      title: newTitle,
      first_name: newFirstName.trim(),
      last_name: newLastName.trim(),
      dob: newDob,
      e_ticket_number: "",
      airline: value.airline || "",
      confirmation_no: value.pnr || "",
    };
    onChange({
      ...value,
      passengers: [...passengerList, newPax],
    });
    setNewFirstName("");
    setNewLastName("");
    setNewDob("");
  }

  function handleRemovePassenger(idx: number) {
    const updated = passengerList.filter((_, i) => i !== idx);
    onChange({ ...value, passengers: updated });
  }

  // Live Auto-Calculation of Fare Details
  function recalculateFare(updates: Partial<FlightBookingValue>) {
    const merged = { ...value, ...updates };
    const ticket = Number(merged.ticket_cost) || 0;
    const mco = Number(merged.mco_charge) || 0;
    const merch = Number(merged.merchant_fee) || 0;
    const cvv = Number(merged.cvv_fee) || 0;
    const totalAuth = Math.round((ticket + mco + merch + cvv) * 100) / 100;
    const margin = Math.round((mco + merch) * 100) / 100;
    const platformAmt = Number(merged.platform_amount) || 0;

    onChange({
      ...merged,
      total_auth_amount: totalAuth,
      margin: margin,
      prepaid_amount: totalAuth,
      charge_amount: totalAuth,
      company_amount: totalAuth,
    });
  }

  const currentMainCat = value.main_category || "New";
  const subCategoryOptions = FLIGHT_SUB_CATEGORIES[currentMainCat] || [];

  return (
    <fieldset disabled={disabled} className="col-span-full space-y-6">
      {/* ========================================================================= */}
      {/* SECTION 1: BOOKING SOURCE DETAILS (MATCHING SCREENSHOTS) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-hidden">
        <div className="flex items-center justify-between bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline">
          <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink">
            <span className="p-1 rounded-lg bg-accent-soft text-accent">
              <Info size={17} />
            </span>
            <span>Booking Source Details</span>
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

        <div className="p-4 sm:p-6 space-y-4">
          {/* Main Category & Sub Category Row (12-column grid layout for wide Sub Category options) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 items-start">
            <div className="lg:col-span-3 min-w-0">
              <Field label="Main Category" required>
                <select
                  value={value.main_category ?? "New"}
                  onChange={(e) => handleMainCategoryChange(e.target.value)}
                  className="select w-full min-w-0 font-medium truncate"
                >
                  <option value="New">New</option>
                  <option value="Changes">Changes</option>
                  <option value="Cancel">Cancel</option>
                  <option value="Add On Services">Add On Services</option>
                </select>
              </Field>
            </div>

            <div className="lg:col-span-5 min-w-0">
              <Field label="Sub Category" required>
                <select
                  required
                  value={value.sub_category ?? ""}
                  onChange={(e) => onChange({ ...value, sub_category: e.target.value })}
                  className="select w-full min-w-0 truncate"
                  title={value.sub_category ?? ""}
                >
                  <option value="" disabled>
                    --Select--
                  </option>
                  {subCategoryOptions.map((opt) => (
                    <option key={opt} value={opt} title={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="lg:col-span-2 min-w-0">
              <Field label="Account Name">
                <input
                  value={value.account_name ?? ""}
                  onChange={(e) => onChange({ ...value, account_name: e.target.value })}
                  className="input w-full min-w-0"
                  placeholder="Account Name"
                />
              </Field>
            </div>

            <div className="lg:col-span-2 min-w-0">
              <Field label="Booking Source Email">
                <input
                  type="email"
                  value={value.booking_source_email ?? ""}
                  onChange={(e) => onChange({ ...value, booking_source_email: e.target.value })}
                  className="input w-full min-w-0 font-mono"
                  placeholder="source@booking.com"
                />
              </Field>
            </div>
          </div>

          {/* Reference & Master Dropdowns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-hairline">
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

            <Field label="PNR / GDS Record Locator" required>
              <input
                required
                value={value.pnr}
                onChange={(e) => onChange({ ...value, pnr: e.target.value.toUpperCase() })}
                className="input font-mono font-bold uppercase"
                placeholder="6-char PNR (e.g. 7X9KLP)"
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
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: PASSENGER DETAILS (MATCHING SCREENSHOT) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-hidden">
        <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline">
          <span className="p-1 rounded-lg bg-accent-soft text-accent">
            <Users size={17} />
          </span>
          <span>Passenger Details</span>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Add Passenger Form Row */}
          <div className="rounded-xl border border-hairline bg-surface-raised/40 p-3.5 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">Add New Passenger</div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12 items-end">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-ink-muted block mb-1">Title</label>
                <select
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="select text-xs"
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Master">Master</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-ink-muted block mb-1">First Name</label>
                <input
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="input text-xs"
                  placeholder="First Name"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-ink-muted block mb-1">Last Name</label>
                <input
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="input text-xs"
                  placeholder="Last Name"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-ink-muted block mb-1">DOB [MM-DD-YYYY]</label>
                <input
                  type="date"
                  value={newDob}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => setNewDob(e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddPassenger}
                  className="btn-primary w-full py-2 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center"
                  title="Add Passenger"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Passenger Table */}
          <div className="rounded-xl border border-hairline overflow-hidden bg-surface shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-raised border-b border-hairline text-ink-muted font-bold">
                <tr>
                  <th className="px-3 py-2 w-16">Title</th>
                  <th className="px-3 py-2">First Name</th>
                  <th className="px-3 py-2">Last Name</th>
                  <th className="px-3 py-2">E-Ticket Number</th>
                  <th className="px-3 py-2">Airline</th>
                  <th className="px-3 py-2">Confirmation No</th>
                  <th className="px-3 py-2">DOB</th>
                  <th className="px-3 py-2 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {passengerList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-ink-faint">
                      No passengers added yet. Use the form above to add passengers.
                    </td>
                  </tr>
                ) : (
                  passengerList.map((pax, idx) => (
                    <tr key={idx} className="hover:bg-surface-raised/50 transition-colors">
                      <td className="px-3 py-2 font-medium text-ink">{pax.title}</td>
                      <td className="px-3 py-2 font-semibold text-ink">{pax.first_name}</td>
                      <td className="px-3 py-2 font-semibold text-ink">{pax.last_name}</td>
                      <td className="px-3 py-2 font-mono text-ink-muted">{pax.e_ticket_number || "—"}</td>
                      <td className="px-3 py-2 text-ink-muted">{pax.airline || value.airline || "—"}</td>
                      <td className="px-3 py-2 font-mono text-ink-muted">{pax.confirmation_no || value.pnr || "—"}</td>
                      <td className="px-3 py-2 font-mono text-ink-muted">{pax.dob || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePassenger(idx)}
                          className="text-ink-muted hover:text-rose-500 p-1 rounded transition-colors"
                          title="Remove Passenger"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: FLIGHT & ROUTING DETAILS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-hidden">
        <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline">
          <span className="p-1 rounded-lg bg-accent-soft text-accent">
            <Plane size={17} />
          </span>
          <span>Flight & Travel Dates / Routing Details</span>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Airline" required>
            <MasterSelect
              fieldKey="airline"
              optionType="master"
              value={value.airline}
              onChange={(v) => onChange({ ...value, airline: v })}
              placeholder="Airline / Carrier…"
            />
          </Field>

          <Field label="Cabin Class" required>
            <MasterSelect
              fieldKey="cabin_class"
              optionType="master"
              value={value.cabin_class}
              onChange={(v) => onChange({ ...value, cabin_class: v })}
              placeholder="Select Cabin…"
            />
          </Field>

          <Field label="Origin Airport" required>
            <input
              required
              value={value.origin}
              onChange={(e) => onChange({ ...value, origin: e.target.value.toUpperCase() })}
              className="input font-mono uppercase"
              placeholder="e.g. JFK / LHR"
            />
          </Field>

          <Field label="Destination Airport" required>
            <input
              required
              value={value.destination}
              onChange={(e) => onChange({ ...value, destination: e.target.value.toUpperCase() })}
              className="input font-mono uppercase"
              placeholder="e.g. LAX / DXB"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Flight Numbers (comma-separated)" required>
              <input
                required
                value={flightNumInput}
                onChange={(e) => setFlightNumInput(e.target.value)}
                onBlur={handleFlightNumbersBlur}
                className="input font-mono"
                placeholder="AA100, BA289"
              />
            </Field>
          </div>

          <Field label="Trip Type">
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-ink">
                <input
                  type="radio"
                  name="trip_type"
                  checked={value.trip_type === "One Way"}
                  onChange={() => onChange({ ...value, trip_type: "One Way" })}
                />
                <span>One Way</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-ink">
                <input
                  type="radio"
                  name="trip_type"
                  checked={value.trip_type === "Round Trip"}
                  onChange={() => onChange({ ...value, trip_type: "Round Trip" })}
                />
                <span>Round Trip</span>
              </label>
            </div>
          </Field>

          <Field label="Class of Service">
            <MasterSelect
              fieldKey="class_of_service"
              optionType="master"
              value={value.class_of_service}
              onChange={(v) => onChange({ ...value, class_of_service: v })}
              placeholder="Class of Service…"
            />
          </Field>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: ANCILLARIES & FARE SUMMARY (AUTO-CALCULATED) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-hidden">
        <div className="flex items-center justify-between bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline">
          <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink">
            <span className="p-1 rounded-lg bg-accent-soft text-accent">
              <DollarSign size={17} />
            </span>
            <span>Fare Summary & Ancillaries</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-accent">
            <Calculator size={14} />
            <span>Auto-Calculating Live</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="HK / GK Code">
              <MasterSelect
                fieldKey="hk_gk"
                optionType="addon"
                value={value.hk_gk}
                onChange={(v) => onChange({ ...value, hk_gk: v })}
                placeholder="HK/GK…"
              />
            </Field>

            <Field label="Add-on Services">
              <MasterSelect
                fieldKey="add_on_services"
                optionType="addon"
                value={value.add_on_services}
                onChange={(v) => onChange({ ...value, add_on_services: v })}
                placeholder="Add-on…"
              />
            </Field>

            <Field label="Currency">
              <MasterSelect
                fieldKey="currency"
                optionType="addon"
                value={value.currency}
                onChange={(v) => onChange({ ...value, currency: v })}
                placeholder="$ / USD"
              />
            </Field>

            <Field label="Ticket Cost ($)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={value.ticket_cost ?? 0}
                onChange={(e) => recalculateFare({ ticket_cost: Number(e.target.value) })}
                className="input font-mono font-bold text-ink"
              />
            </Field>

            <Field label="MCO Charge ($)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={value.mco_charge ?? 0}
                onChange={(e) => recalculateFare({ mco_charge: Number(e.target.value) })}
                className="input font-mono font-bold text-ink"
              />
            </Field>

            <Field label="Merchant Fee ($)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={value.merchant_fee ?? 15}
                onChange={(e) => recalculateFare({ merchant_fee: Number(e.target.value) })}
                className="input font-mono font-bold text-ink"
              />
            </Field>

            <Field label="CVV Fee ($)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={value.cvv_fee ?? 0}
                onChange={(e) => recalculateFare({ cvv_fee: Number(e.target.value) })}
                className="input font-mono font-bold text-ink"
              />
            </Field>

            <Field label="Total Auth Amount ($) (Auto)">
              <input
                readOnly
                type="number"
                step="0.01"
                value={Number(value.total_auth_amount ?? 0).toFixed(2)}
                className="input font-mono font-extrabold bg-accent-soft text-accent cursor-not-allowed"
              />
            </Field>

            <Field label="Margin / Profit ($) (Auto)">
              <input
                readOnly
                type="number"
                step="0.01"
                value={Number(value.margin ?? 0).toFixed(2)}
                className="input font-mono font-extrabold bg-emerald-500/10 text-emerald-500 cursor-not-allowed"
              />
            </Field>
          </div>

          <div>
            <DynamicFieldsBlock
              entityType="flight_booking"
              value={value.custom_fields}
              onChange={(next) => onChange({ ...value, custom_fields: next })}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5: FOR OFFICE USE (MATCHING SCREENSHOT 1) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-hidden">
        <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline">
          <span className="p-1 rounded-lg bg-accent-soft text-accent">
            <Building2 size={17} />
          </span>
          <span>For Office Use</span>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
              Mention All Remarks Here
            </label>
            <RichTextEditor
              value={value.remarks ?? ""}
              onChange={(val) => onChange({ ...value, remarks: val })}
              placeholder="Enter internal office remarks, special clauses, routing notes…"
              rows={4}
            />
          </div>

          {/* Important? checkbox with red text (from screenshot 1!) */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-xs font-bold text-rose-500">Important?</span>
              <input
                type="checkbox"
                checked={value.important}
                onChange={(e) => onChange({ ...value, important: e.target.checked })}
                className="h-4 w-4 rounded border-hairline text-rose-500 focus:ring-rose-500"
              />
            </label>
          </div>

          {/* Special Notes Table (from screenshot 1!) */}
          <div className="rounded-xl border border-hairline overflow-hidden bg-surface shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-raised border-b border-hairline text-ink-muted font-bold">
                <tr>
                  <th className="px-3 py-2 w-16">Sl No</th>
                  <th className="px-3 py-2">Special Note</th>
                  <th className="px-3 py-2 w-36">Updated on</th>
                  <th className="px-3 py-2 w-32">Updated By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {specialNotesList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-ink-faint">
                      No special notes recorded.
                    </td>
                  </tr>
                ) : (
                  specialNotesList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface-raised/50 transition-colors">
                      <td className="px-3 py-2 font-mono text-ink-muted">{item.sl_no ?? idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-ink">{item.special_note}</td>
                      <td className="px-3 py-2 font-mono text-ink-muted">{item.updated_on}</td>
                      <td className="px-3 py-2 text-ink-muted">{item.updated_by}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 6: BILLING DETAILS & PAYMENT SUMMARY (MATCHING SCREENSHOT 1) */}
      {/* ========================================================================= */}
      <PaymentSummarySection
        data={value}
        onChange={(updates) => onChange({ ...value, ...updates })}
        onSave={onSave}
        onSaveAndEmail={onSaveAndEmail}
        onBack={onBack}
        agentName={agentName}
        submitting={submitting}
      />
    </fieldset>
  );
}
