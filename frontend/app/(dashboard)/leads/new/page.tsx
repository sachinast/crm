"use client";

import { AlertTriangle, Car, CheckCircle2, Hotel, Loader2, Plane, XCircle, ArrowRight, Check } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CountryCode } from "libphonenumber-js";

import CarBookingFields, { EMPTY_CAR_BOOKING, type CarBookingValue } from "@/components/booking/CarBookingFields";
import HotelBookingFields, { EMPTY_HOTEL_BOOKING, type HotelBookingValue } from "@/components/booking/HotelBookingFields";
import FlightBookingFields, { EMPTY_FLIGHT_BOOKING, type FlightBookingValue } from "@/components/booking/FlightBookingFields";
import DynamicFieldsBlock from "@/components/shared/DynamicFieldsBlock";
import Field from "@/components/shared/FormField";
import PhoneInput from "@/components/shared/PhoneInput";
import { isValidEmail } from "@/lib/validation";
import { detectDefaultCountry, isValidNationalNumber, toE164 } from "@/lib/phone";

interface LeadResponse {
  id: string;
  name: string;
  phone: string;
  email: string;
  is_duplicate: boolean;
  duplicate_of_id: string | null;
  duplicate_override_reason: string | null;
  service_type: string | null;
}

interface Candidate {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
}

const SERVICE_TYPES = [
  { value: "car" as const, label: "Car Rental", sublabel: "Chauffeur & Fleet Vehicles", icon: Car },
  { value: "hotel" as const, label: "Hotel", sublabel: "Resorts, Rooms & Stays", icon: Hotel },
  { value: "flight" as const, label: "Flight", sublabel: "PNR, Domestic & International", icon: Plane },
];

type ServiceType = (typeof SERVICE_TYPES)[number]["value"];
type CheckStatus = "idle" | "checking" | "exists" | "available";

function toIsoUtc(localValue: string): string {
  return localValue ? `${localValue}:00Z` : localValue;
}

function CheckTick({ status }: { status: CheckStatus }) {
  if (status === "idle") return null;
  if (status === "checking") return <Loader2 size={14} className="animate-spin text-slate-400" />;
  if (status === "exists") return <XCircle size={14} className="text-[var(--danger)]" />;
  return <CheckCircle2 size={14} className="text-[var(--success)]" />;
}

function useContactCheck(value: string, field: "email" | "phone", formatValid: boolean): CheckStatus {
  const [result, setResult] = useState<{ value: string; exists: boolean } | null>(null);

  useEffect(() => {
    if (!formatValid) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/leads/check-contact?${field}=${encodeURIComponent(value)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (cancelled || !body) return;
          const exists = field === "email" ? body.email_exists : body.phone_exists;
          setResult({ value, exists });
        })
        .catch(() => {
          if (!cancelled) setResult(null);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, field, formatValid]);

  if (!formatValid) return "idle";
  if (result && result.value === value) return result.exists ? "exists" : "available";
  return "checking";
}

export default function NewLeadPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<CountryCode>("US");
  const [nationalNumber, setNationalNumber] = useState("");
  const [name, setName] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [serviceType, setServiceType] = useState<ServiceType | null>("car");
  const [carForm, setCarForm] = useState<CarBookingValue>(EMPTY_CAR_BOOKING);
  const [hotelForm, setHotelForm] = useState<HotelBookingValue>(EMPTY_HOTEL_BOOKING);
  const [flightForm, setFlightForm] = useState<FlightBookingValue>(EMPTY_FLIGHT_BOOKING);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pendingConfirmLead, setPendingConfirmLead] = useState<LeadResponse | null>(null);
  const [pendingCandidates, setPendingCandidates] = useState<Candidate[]>([]);
  const [pendingReason, setPendingReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    detectDefaultCountry().then((detected) => {
      if (!cancelled) setCountry(detected);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const emailFormatOk = isValidEmail(email);
  const phoneFormatOk = isValidNationalNumber(nationalNumber, country);
  const phone = phoneFormatOk ? toE164(nationalNumber, country) : "";

  const emailCheck = useContactCheck(email.trim(), "email", emailFormatOk);
  const phoneCheck = useContactCheck(phone, "phone", phoneFormatOk);

  const hasOverride = overrideReason.trim().length > 0;
  const emailReady = emailCheck === "available" || (emailCheck === "exists" && hasOverride);
  const phoneReady = phoneCheck === "available" || (phoneCheck === "exists" && hasOverride);
  const unlocked = emailReady && phoneReady;
  const showDuplicateWarning = emailCheck === "exists" || phoneCheck === "exists";

  const currentFinancials = () => {
    if (serviceType === "car") {
      const prepaid = Number(carForm.prepaid_amount) || 0;
      const counter = Number(carForm.pay_at_counter_amount) || 0;
      return { prepaid, counter, total: prepaid + counter };
    }
    if (serviceType === "hotel") {
      const prepaid = Number(hotelForm.prepaid_amount) || 0;
      const counter = Number(hotelForm.pay_at_counter_amount) || 0;
      return { prepaid, counter, total: prepaid + counter };
    }
    if (serviceType === "flight") {
      const prepaid = Number(flightForm.prepaid_amount) || 0;
      const counter = Number(flightForm.pay_at_counter_amount) || 0;
      return { prepaid, counter, total: prepaid + counter };
    }
    return { prepaid: 0, counter: 0, total: 0 };
  };

  const updateFinancials = (prepaid: number, counter: number) => {
    if (serviceType === "car") {
      setCarForm({ ...carForm, prepaid_amount: prepaid, pay_at_counter_amount: counter });
    } else if (serviceType === "hotel") {
      setHotelForm({ ...hotelForm, prepaid_amount: prepaid, pay_at_counter_amount: counter });
    } else if (serviceType === "flight") {
      setFlightForm({ ...flightForm, prepaid_amount: prepaid, pay_at_counter_amount: counter });
    }
  };

  const { prepaid, counter, total } = currentFinancials();

  async function finishServiceTypeAndBooking(leadId: string) {
    if (!serviceType) {
      setError("Choose a service type");
      setSubmitting(false);
      return;
    }

    const stResp = await fetch(`/api/leads/${leadId}/service-type`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_type: serviceType }),
    });
    if (!stResp.ok) {
      const body = await stResp.json().catch(() => ({}));
      setError(body.detail ?? "Could not set service type");
      setSubmitting(false);
      return;
    }

    const bookingPath = serviceType === "car" ? "car-booking" : serviceType === "hotel" ? "hotel-booking" : "flight-booking";
    const bookingPayload =
      serviceType === "car"
        ? { ...carForm, pickup_datetime: toIsoUtc(carForm.pickup_datetime), return_datetime: toIsoUtc(carForm.return_datetime), prepaid_amount: Number(carForm.prepaid_amount), pay_at_counter_amount: Number(carForm.pay_at_counter_amount) }
        : serviceType === "hotel"
          ? { ...hotelForm, prepaid_amount: Number(hotelForm.prepaid_amount), pay_at_counter_amount: Number(hotelForm.pay_at_counter_amount) }
          : { ...flightForm, prepaid_amount: Number(flightForm.prepaid_amount), pay_at_counter_amount: Number(flightForm.pay_at_counter_amount) };

    const bookingResp = await fetch(`/api/leads/${leadId}/${bookingPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingPayload),
    });
    const bookingBody = await bookingResp.json();
    setSubmitting(false);

    if (!bookingResp.ok) {
      setError(typeof bookingBody.detail === "string" ? bookingBody.detail : "Could not save the booking");
      return;
    }

    router.push(`/leads/${leadId}`);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, custom_fields: customFields }),
    });
    const body: LeadResponse = await resp.json();

    if (!resp.ok) {
      setError((body as unknown as { detail?: string }).detail ?? "Could not create lead");
      setSubmitting(false);
      return;
    }

    if (body.is_duplicate && !hasOverride) {
      const dupResp = await fetch(`/api/leads/${body.id}/duplicate-check`);
      const dupBody = await dupResp.json().catch(() => ({ candidates: [] }));
      setPendingCandidates(dupBody.candidates ?? []);
      setPendingConfirmLead(body);
      setSubmitting(false);
      return;
    }

    if (body.is_duplicate && hasOverride) {
      const confirmResp = await fetch(`/api/leads/${body.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: overrideReason }),
      });
      if (!confirmResp.ok) {
        const confirmBody = await confirmResp.json().catch(() => ({}));
        setError(confirmBody.detail ?? "Could not confirm duplicate");
        setSubmitting(false);
        return;
      }
    }

    await finishServiceTypeAndBooking(body.id);
  }

  async function handlePendingConfirm() {
    if (!pendingConfirmLead || !pendingReason.trim()) return;
    setSubmitting(true);
    setError(null);

    const confirmResp = await fetch(`/api/leads/${pendingConfirmLead.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: pendingReason }),
    });
    if (!confirmResp.ok) {
      const confirmBody = await confirmResp.json().catch(() => ({}));
      setError(confirmBody.detail ?? "Could not confirm duplicate");
      setSubmitting(false);
      return;
    }

    await finishServiceTypeAndBooking(pendingConfirmLead.id);
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3.5 pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">New Lead Intake</h1>
          <p className="text-[11px] text-slate-400">
            Single-step client verification and unified booking dispatch.
          </p>
        </div>

        <Link href="/leads" className="btn-secondary btn-sm text-xs">
          Cancel Intake
        </Link>
      </div>

      {pendingConfirmLead ? (
        <div className="card flex flex-col gap-3">
          <div
            className="flex items-start gap-2.5 rounded-xl p-3 text-xs"
            style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>A similarly-named client already exists — do you still want to proceed?</span>
          </div>
          <ul className="flex flex-col gap-2 text-xs">
            {pendingCandidates.map((c) => (
              <li key={c.id} className="card-flat py-2.5">
                <p className="font-medium text-white">{c.name}</p>
                <p className="text-slate-400">
                  {c.phone} · {c.email} · {c.status}
                </p>
              </li>
            ))}
          </ul>
          <Field label="Reason for proceeding">
            <input
              required
              value={pendingReason}
              onChange={(e) => setPendingReason(e.target.value)}
              placeholder="e.g. different customer, shared office line"
              className="input"
            />
          </Field>
          {error && (
            <p className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handlePendingConfirm}
            disabled={submitting || !pendingReason.trim()}
            className="btn-primary text-xs"
          >
            {submitting ? "Confirming…" : "Yes, proceed anyway"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* STEP 1: Client Information Card */}
          <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-4 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Client Information
              </span>
              <span className="text-[10px] text-slate-400">
                Verified against duplicates
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Email Address">
                <div className="relative">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="input pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <CheckTick status={emailCheck} />
                  </span>
                </div>
                {email.trim().length > 0 && !emailFormatOk && (
                  <span className="mt-1 block text-[10px] text-[var(--danger)]">
                    Enter a valid email address
                  </span>
                )}
                {emailCheck === "exists" && (
                  <span className="mt-1 block text-[10px] text-[var(--danger)]">
                    A lead with this email already exists
                  </span>
                )}
              </Field>

              <Field label="Phone Number">
                <div className="relative">
                  <PhoneInput
                    country={country}
                    nationalNumber={nationalNumber}
                    onCountryChange={setCountry}
                    onNationalNumberChange={setNationalNumber}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <CheckTick status={phoneCheck} />
                  </span>
                </div>
                {nationalNumber.trim().length > 0 && !phoneFormatOk && (
                  <span className="mt-1 block text-[10px] text-[var(--danger)]">
                    Enter a valid number
                  </span>
                )}
                {phoneCheck === "exists" && (
                  <span className="mt-1 block text-[10px] text-[var(--danger)]">
                    A lead with this number already exists
                  </span>
                )}
              </Field>

              <Field label="Customer Name">
                <input
                  required
                  disabled={!unlocked}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ravendra Singh"
                  className="input font-medium"
                />
              </Field>
            </div>

            {showDuplicateWarning && (
              <div
                className="mt-3 flex flex-col gap-1.5 rounded-xl p-2.5 text-xs"
                style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
              >
                <div className="flex items-start gap-2 font-medium">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>This contact is already on file. Provide an override reason to proceed:</span>
                </div>
                <input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. different customer, corporate group booking"
                  className="input text-xs"
                />
              </div>
            )}

            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <DynamicFieldsBlock entityType="lead" value={customFields} onChange={setCustomFields} />
            </div>
          </div>

          {/* Gated Booking Container */}
          <fieldset disabled={!unlocked} className="space-y-3.5" style={!unlocked ? { opacity: 0.4 } : undefined}>
            {/* STEP 2: Service Selection Card */}
            <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-3.5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {SERVICE_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = serviceType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setServiceType(t.value)}
                      className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        active
                          ? "border-[#d3ab5e] bg-[#182136] shadow-md ring-1 ring-[#d3ab5e]"
                          : "border-[#232e47] bg-[#0d1220] hover:border-[#38486e]"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          active
                            ? "bg-[#d3ab5e] text-slate-900 shadow-sm"
                            : "bg-[#161d30] text-[#d3ab5e] border border-[#2a3652]"
                        }`}
                      >
                        <Icon size={17} strokeWidth={2} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{t.label}</span>
                          {active && <Check size={13} className="text-[#d3ab5e]" />}
                        </div>
                        <p className="text-[10px] text-slate-400">{t.sublabel}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 3: Booking Specifications Card */}
            {serviceType && (
              <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-4">
                  {serviceType === "car" && <CarBookingFields value={carForm} onChange={setCarForm} />}
                  {serviceType === "hotel" && <HotelBookingFields value={hotelForm} onChange={setHotelForm} />}
                  {serviceType === "flight" && <FlightBookingFields value={flightForm} onChange={setFlightForm} />}
                </div>
              </div>
            )}

            {/* STEP 4: Financial Summary & Actions Toolbar */}
            <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-3.5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Financial Breakdown Inputs */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-[#0d1220] px-3 py-1.5 border border-[#232e47]">
                    <span className="text-[11px] font-semibold text-slate-300">Prepaid ($):</span>
                    <input
                      required
                      type="number"
                      min={0}
                      step="0.01"
                      value={prepaid}
                      onChange={(e) => updateFinancials(Number(e.target.value), counter)}
                      className="w-20 rounded-lg border border-[#313f61] bg-[#141b2d] px-2 py-0.5 font-mono text-xs font-bold text-white outline-none focus:border-[#d3ab5e]"
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-[#0d1220] px-3 py-1.5 border border-[#232e47]">
                    <span className="text-[11px] font-semibold text-slate-300">Pay at Counter ($):</span>
                    <input
                      required
                      type="number"
                      min={0}
                      step="0.01"
                      value={counter}
                      onChange={(e) => updateFinancials(prepaid, Number(e.target.value))}
                      className="w-20 rounded-lg border border-[#313f61] bg-[#141b2d] px-2 py-0.5 font-mono text-xs font-bold text-white outline-none focus:border-[#d3ab5e]"
                    />
                  </div>

                  {/* Grand Total Badge */}
                  <div className="flex items-center gap-2 rounded-xl bg-[#2a2311] px-3.5 py-1.5 border border-[#d3ab5e]/40">
                    <span className="text-[11px] font-medium text-[#f7e9c9]">Total Booking Value:</span>
                    <span className="font-mono text-sm font-extrabold text-[#d3ab5e]">
                      ${total.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Right-aligned Submit & Cancel Actions */}
                <div className="flex items-center gap-2.5">
                  <Link href="/leads" className="btn-secondary btn-sm text-xs">
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={submitting || !serviceType || !unlocked}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d3ab5e] to-[#e0bc78] px-5 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>{submitting ? "Processing…" : "Create Lead"}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {error && (
                <p className="mt-2 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--danger)]" style={{ background: "var(--danger-soft)" }}>
                  {error}
                </p>
              )}
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
