"use client";

import { AlertTriangle, Car, CheckCircle2, Hotel, Loader2, Plane, XCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import CarBookingFields, { EMPTY_CAR_BOOKING, type CarBookingValue } from "@/components/booking/CarBookingFields";
import HotelBookingFields, { EMPTY_HOTEL_BOOKING, type HotelBookingValue } from "@/components/booking/HotelBookingFields";
import FlightBookingFields, { EMPTY_FLIGHT_BOOKING, type FlightBookingValue } from "@/components/booking/FlightBookingFields";
import DynamicFieldsBlock from "@/components/shared/DynamicFieldsBlock";
import Field from "@/components/shared/FormField";
import { isValidEmail, isValidPhone, sanitizePhoneInput } from "@/lib/validation";

// Single-step intake: every field for the customer + their booking shows at
// once (no wizard) — the only thing gated is *when* the rest of the form
// unlocks. Email and Phone are checked live (exact match, GET
// /leads/check-contact) as the agent types; the rest of the fields stay
// disabled until both come back clear, or the agent provides an explicit
// override reason for a flagged match (PRD §4.1 Step 3's "yes, proceed
// anyway", now inline instead of a separate step).
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
  { value: "car" as const, label: "Car Rental", icon: Car },
  { value: "hotel" as const, label: "Hotel", icon: Hotel },
  { value: "flight" as const, label: "Flight", icon: Plane },
];

type ServiceType = (typeof SERVICE_TYPES)[number]["value"];
type CheckStatus = "idle" | "checking" | "exists" | "available";

// datetime-local inputs give "YYYY-MM-DDTHH:mm" with no timezone. Treating
// that as UTC is a Phase 3 simplification (the DB column is timezone-aware).
function toIsoUtc(localValue: string): string {
  return localValue ? `${localValue}:00Z` : localValue;
}

function CheckTick({ status }: { status: CheckStatus }) {
  if (status === "idle") return null;
  if (status === "checking") return <Loader2 size={15} className="animate-spin" style={{ color: "var(--ink-faint)" }} />;
  if (status === "exists") return <XCircle size={15} style={{ color: "var(--danger)" }} />;
  return <CheckCircle2 size={15} style={{ color: "var(--success)" }} />;
}

/** Live green/red tick, debounced against GET /leads/check-contact — a fast,
 * exact-match-only hint distinct from the fuzzy, authoritative duplicate
 * search POST /leads itself still runs on submit. "checking"/"idle" are
 * derived by comparing the last-resolved value against the current one
 * (never set imperatively) so this doesn't trip the set-state-in-effect
 * lint rule. */
function useContactCheck(value: string, field: "email" | "phone", minLength: number): CheckStatus {
  const [result, setResult] = useState<{ value: string; exists: boolean } | null>(null);
  const trimmed = value.trim();

  useEffect(() => {
    if (trimmed.length < minLength) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/leads/check-contact?${field}=${encodeURIComponent(trimmed)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (cancelled || !body) return;
          const exists = field === "email" ? body.email_exists : body.phone_exists;
          setResult({ value: trimmed, exists });
        })
        .catch(() => {
          if (!cancelled) setResult(null);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, field, minLength]);

  if (trimmed.length < minLength) return "idle";
  if (result && result.value === trimmed) return result.exists ? "exists" : "available";
  return "checking";
}

export default function NewLeadPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [carForm, setCarForm] = useState<CarBookingValue>(EMPTY_CAR_BOOKING);
  const [hotelForm, setHotelForm] = useState<HotelBookingValue>(EMPTY_HOTEL_BOOKING);
  const [flightForm, setFlightForm] = useState<FlightBookingValue>(EMPTY_FLIGHT_BOOKING);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Set only if POST /leads flags a match our exact-match pre-check missed
  // (e.g. a fuzzy name-similarity match with a different email/phone) —
  // the lead already exists at this point; we're just waiting on a reason
  // before calling POST /leads/{id}/confirm and continuing.
  const [pendingConfirmLead, setPendingConfirmLead] = useState<LeadResponse | null>(null);
  const [pendingCandidates, setPendingCandidates] = useState<Candidate[]>([]);
  const [pendingReason, setPendingReason] = useState("");

  const emailCheck = useContactCheck(email, "email", 5);
  const phoneCheck = useContactCheck(phone, "phone", 7);
  const emailFormatOk = email.trim().length === 0 || isValidEmail(email);
  const phoneFormatOk = phone.trim().length === 0 || isValidPhone(phone);

  const hasOverride = overrideReason.trim().length > 0;
  const emailReady = emailFormatOk && (emailCheck === "available" || (emailCheck === "exists" && hasOverride));
  const phoneReady = phoneFormatOk && (phoneCheck === "available" || (phoneCheck === "exists" && hasOverride));
  const unlocked = emailReady && phoneReady;
  const showDuplicateWarning = emailCheck === "exists" || phoneCheck === "exists";

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
      // Our exact-match pre-check said email/phone were clear, but the
      // backend's fuzzy name-similarity search still flagged something —
      // stop and get an explicit reason before proceeding, same as the
      // pre-check's own override flow.
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
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New lead</h1>

      {pendingConfirmLead ? (
        <div className="card flex flex-col gap-4">
          <div
            className="flex items-start gap-2.5 rounded-lg p-3 text-sm"
            style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>A similarly-named client already exists — do you still want to proceed?</span>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {pendingCandidates.map((c) => (
              <li key={c.id} className="card-flat py-3">
                <p className="font-medium">{c.name}</p>
                <p style={{ color: "var(--ink-muted)" }}>
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
            <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
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
        <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
          <Field label="Email">
            <div className="relative">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pr-9"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckTick status={emailCheck} />
              </span>
            </div>
            {!emailFormatOk && (
              <span className="mt-1 block text-xs" style={{ color: "var(--danger)" }}>
                Enter a valid email address
              </span>
            )}
            {emailCheck === "exists" && (
              <span className="mt-1 block text-xs" style={{ color: "var(--danger)" }}>
                A lead with this email already exists
              </span>
            )}
          </Field>

          <Field label="Phone">
            <div className="relative">
              <input
                required
                value={phone}
                onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                className="input pr-9"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckTick status={phoneCheck} />
              </span>
            </div>
            {!phoneFormatOk && (
              <span className="mt-1 block text-xs" style={{ color: "var(--danger)" }}>
                Enter a valid phone number (digits only, at least 7)
              </span>
            )}
            {phoneCheck === "exists" && (
              <span className="mt-1 block text-xs" style={{ color: "var(--danger)" }}>
                A lead with this number already exists
              </span>
            )}
          </Field>

          {showDuplicateWarning && (
            <div
              className="flex flex-col gap-2 rounded-lg p-3 text-sm"
              style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <span>This email or number is already on file. Provide a reason to proceed anyway.</span>
              </div>
              <input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. different customer, shared office line"
                className="input"
              />
            </div>
          )}

          <fieldset disabled={!unlocked} className="flex flex-col gap-4" style={!unlocked ? { opacity: 0.5 } : undefined}>
            <Field label="Customer Name">
              <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </Field>

            <DynamicFieldsBlock entityType="lead" value={customFields} onChange={setCustomFields} />

            <div>
              <p className="mb-2 text-sm font-medium">Service type</p>
              <div className="grid grid-cols-3 gap-3">
                {SERVICE_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = serviceType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setServiceType(t.value)}
                      className="flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors"
                      style={{ borderColor: active ? "var(--accent)" : "var(--hairline-strong)", background: active ? "var(--accent-soft)" : undefined }}
                    >
                      <Icon size={22} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {serviceType && (
              <div className="grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
                {serviceType === "car" && <CarBookingFields value={carForm} onChange={setCarForm} />}
                {serviceType === "hotel" && <HotelBookingFields value={hotelForm} onChange={setHotelForm} />}
                {serviceType === "flight" && <FlightBookingFields value={flightForm} onChange={setFlightForm} />}
              </div>
            )}

            {error && (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting || !serviceType} className="btn-primary">
              {submitting ? "Creating…" : "Create lead"}
            </button>
          </fieldset>

          {!unlocked && (
            <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
              Enter a unique email and phone number to unlock the rest of the form.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
