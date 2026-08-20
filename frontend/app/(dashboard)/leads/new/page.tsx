"use client";

import { AlertTriangle, Car, CheckCircle2, Hotel, Loader2, Plane, XCircle, ArrowRight, Check, Flame } from "lucide-react";
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
  if (status === "checking") return <Loader2 size={16} className="animate-spin text-ink-muted" />;
  if (status === "exists") return <XCircle size={16} className="text-danger" />;
  return <CheckCircle2 size={16} className="text-success" />;
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
    <div className="w-full max-w-7xl mx-auto space-y-4 pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs">
              <Flame size={20} className="fill-amber-500/20 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">New Lead Intake</h1>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Single-step client verification and unified booking dispatch.
          </p>
        </div>

        <Link href="/leads" className="btn-secondary btn-sm">
          Cancel Intake
        </Link>
      </div>

      {pendingConfirmLead ? (
        <div className="card flex flex-col gap-4">
          <div className="alert-warning">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>A similarly-named client already exists — do you still want to proceed?</span>
          </div>
          <ul className="flex flex-col gap-2.5 text-sm">
            {pendingCandidates.map((c) => (
              <li key={c.id} className="card-flat py-3">
                <p className="font-semibold text-ink">{c.name}</p>
                <p className="text-sm text-ink-muted">
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
            <p className="alert-danger">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handlePendingConfirm}
            disabled={submitting || !pendingReason.trim()}
            className="btn-primary"
          >
            {submitting ? "Confirming…" : "Yes, proceed anyway"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* STEP 1: Client Information Card */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Client Information
              </span>
              <span className="text-xs font-medium text-ink-faint">
                Verified against duplicates
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckTick status={emailCheck} />
                  </span>
                </div>
                {email.trim().length > 0 && !emailFormatOk && (
                  <span className="mt-1 block text-xs text-danger">
                    Enter a valid email address
                  </span>
                )}
                {emailCheck === "exists" && (
                  <span className="mt-1 block text-xs text-danger">
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
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckTick status={phoneCheck} />
                  </span>
                </div>
                {nationalNumber.trim().length > 0 && !phoneFormatOk && (
                  <span className="mt-1 block text-xs text-danger">
                    Enter a valid number
                  </span>
                )}
                {phoneCheck === "exists" && (
                  <span className="mt-1 block text-xs text-danger">
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
              <div className="alert-warning flex flex-col gap-2">
                <div className="flex items-start gap-2 font-semibold">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                  <span>This contact is already on file. Provide an override reason to proceed:</span>
                </div>
                <input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. different customer, corporate group booking"
                  className="input"
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DynamicFieldsBlock entityType="lead" value={customFields} onChange={setCustomFields} />
            </div>
          </div>

          {/* Gated Booking Section */}
          {!unlocked && (
            <div className="alert-info">
              <span>Enter and verify valid client email & phone number above to configure booking details.</span>
            </div>
          )}

          <fieldset disabled={!unlocked} className={`space-y-4 transition-opacity duration-200 ${!unlocked ? "opacity-60 pointer-events-none select-none" : "opacity-100"}`}>
            {/* STEP 2: Service Selection Card */}
            <div className="card">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                {SERVICE_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = serviceType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setServiceType(t.value)}
                      className={`group flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all ${
                        active
                          ? "border-accent bg-accent-soft shadow-md ring-1 ring-accent"
                          : "border-hairline bg-surface hover:border-hairline-strong hover:bg-surface-raised"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          active
                            ? "bg-accent text-accent-ink shadow-sm"
                            : "bg-surface-raised text-accent border border-hairline"
                        }`}
                      >
                        <Icon size={19} strokeWidth={2} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${active ? "text-accent-ink" : "text-ink"}`}>{t.label}</span>
                          {active && <Check size={15} className="text-accent" />}
                        </div>
                        <p className="text-xs text-ink-muted">{t.sublabel}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 3: Booking Specifications Card */}
            {serviceType && (
              <div className="card">
                <div className="grid grid-cols-1 gap-4">
                  {serviceType === "car" && <CarBookingFields value={carForm} onChange={setCarForm} />}
                  {serviceType === "hotel" && <HotelBookingFields value={hotelForm} onChange={setHotelForm} />}
                  {serviceType === "flight" && <FlightBookingFields value={flightForm} onChange={setFlightForm} />}
                </div>
              </div>
            )}

            {/* STEP 4: Financial Summary & Actions Toolbar */}
            <div className="card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Financial Breakdown Inputs */}
                <div className="flex flex-wrap items-center gap-3.5">
                  <div className="flex items-center gap-2 rounded-xl bg-surface-sunken px-3.5 py-2 border border-hairline">
                    <span className="text-xs font-semibold text-ink-muted">Prepaid ($):</span>
                    <input
                      required
                      type="number"
                      min={0}
                      step="0.01"
                      value={prepaid}
                      onChange={(e) => updateFinancials(Number(e.target.value), counter)}
                      className="w-24 rounded-lg border border-hairline-strong bg-surface px-2.5 py-1 font-mono text-sm font-bold text-ink outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-surface-sunken px-3.5 py-2 border border-hairline">
                    <span className="text-xs font-semibold text-ink-muted">Pay at Counter ($):</span>
                    <input
                      required
                      type="number"
                      min={0}
                      step="0.01"
                      value={counter}
                      onChange={(e) => updateFinancials(prepaid, Number(e.target.value))}
                      className="w-24 rounded-lg border border-hairline-strong bg-surface px-2.5 py-1 font-mono text-sm font-bold text-ink outline-none focus:border-accent"
                    />
                  </div>

                  {/* Grand Total Badge */}
                  <div className="flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-2 border border-accent/40">
                    <span className="text-xs font-semibold text-accent-ink">Total Value:</span>
                    <span className="font-mono text-base font-extrabold text-accent">
                      ${total.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Right-aligned Submit & Cancel Actions */}
                <div className="flex items-center gap-3">
                  <Link href="/leads" className="btn-secondary">
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={submitting || !serviceType || !unlocked}
                    className="btn-primary"
                  >
                    <span>{submitting ? "Processing…" : "Create Lead"}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              {error && (
                <p className="mt-3 alert-danger">
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
