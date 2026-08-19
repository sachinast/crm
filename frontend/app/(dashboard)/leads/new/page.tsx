"use client";

import { AlertTriangle, Car, CheckCircle2, Hotel, Loader2, Plane, XCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import DynamicFieldsBlock from "@/components/shared/DynamicFieldsBlock";

// PRD §4.1 "Lead-First" flow:
//   Step 1 intake -> Step 2 automatic duplicate search (server-side, on create)
//   -> Step 3 conditional confirm prompt -> Step 4 service-type unlock.
type Step = "intake" | "duplicate-prompt" | "service-type";

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
  { value: "car", label: "Car Rental", icon: Car },
  { value: "hotel", label: "Hotel", icon: Hotel },
  { value: "flight", label: "Flight", icon: Plane },
] as const;

const STEP_NUMBER: Record<Step, number> = { intake: 1, "duplicate-prompt": 3, "service-type": 4 };

type CheckStatus = "idle" | "checking" | "exists" | "available";

/** Live green/red tick next to a field, debounced against GET
 * /leads/check-contact — a fast, exact-match-only hint (does a lead already
 * exist with this exact value) shown as the agent types, distinct from the
 * fuzzy, authoritative duplicate search POST /leads itself still runs on
 * submit. Purely advisory: a red tick doesn't block Continue — the
 * confirm-to-proceed flow (Step 3) is still what actually gates it. */
function CheckTick({ status }: { status: CheckStatus }) {
  if (status === "idle") return null;
  if (status === "checking") return <Loader2 size={15} className="animate-spin" style={{ color: "var(--ink-faint)" }} />;
  if (status === "exists") return <XCircle size={15} style={{ color: "var(--danger)" }} />;
  return <CheckCircle2 size={15} style={{ color: "var(--success)" }} />;
}

function useContactCheck(value: string, field: "email" | "phone", minLength: number): CheckStatus {
  // `result` only ever gets set from inside the debounced fetch's callback
  // (never synchronously in the effect body) — "checking" below is derived
  // by comparing the last-resolved value against the current one, not set
  // imperatively, since a bare `setState` in an effect body causes
  // cascading renders.
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
  const [step, setStep] = useState<Step>("intake");
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [lead, setLead] = useState<LeadResponse | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const phoneCheck = useContactCheck(form.phone, "phone", 7);
  const emailCheck = useContactCheck(form.email, "email", 5);

  async function handleIntakeSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, custom_fields: customFields }),
    });
    const body = await resp.json();
    setSubmitting(false);

    if (!resp.ok) {
      setError(body.detail ?? "Could not create lead");
      return;
    }

    setLead(body);

    if (body.is_duplicate) {
      const dupResp = await fetch(`/api/leads/${body.id}/duplicate-check`);
      const dupBody = await dupResp.json();
      setCandidates(dupBody.candidates ?? []);
      setStep("duplicate-prompt");
    } else {
      setStep("service-type");
    }
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    if (!lead) return;
    setSubmitting(true);
    setError(null);

    const resp = await fetch(`/api/leads/${lead.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: overrideReason }),
    });
    const body = await resp.json();
    setSubmitting(false);

    if (!resp.ok) {
      setError(body.detail ?? "Could not confirm");
      return;
    }

    setLead(body);
    setStep("service-type");
  }

  async function handleServiceType(serviceType: string) {
    if (!lead) return;
    setSubmitting(true);
    setError(null);

    const resp = await fetch(`/api/leads/${lead.id}/service-type`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_type: serviceType }),
    });
    const body = await resp.json();
    setSubmitting(false);

    if (!resp.ok) {
      setError(body.detail ?? "Could not set service type");
      return;
    }

    router.push(`/leads/${lead.id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">New lead</h1>
      <div className="mb-6 mt-3 flex items-center gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: n <= STEP_NUMBER[step] ? "var(--accent)" : "var(--hairline-strong)" }}
          />
        ))}
      </div>

      {step === "intake" && (
        <form onSubmit={handleIntakeSubmit} className="card flex flex-col gap-4">
          <label className="text-sm font-medium">
            Customer Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input mt-1.5"
            />
          </label>
          <label className="text-sm font-medium">
            Number
            <div className="relative mt-1.5">
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input pr-9"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckTick status={phoneCheck} />
              </span>
            </div>
            {phoneCheck === "exists" && (
              <span className="mt-1 block text-xs" style={{ color: "var(--danger)" }}>
                A lead with this number already exists
              </span>
            )}
          </label>
          <label className="text-sm font-medium">
            Email
            <div className="relative mt-1.5">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input pr-9"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckTick status={emailCheck} />
              </span>
            </div>
            {emailCheck === "exists" && (
              <span className="mt-1 block text-xs" style={{ color: "var(--danger)" }}>
                A lead with this email already exists
              </span>
            )}
          </label>
          <DynamicFieldsBlock entityType="lead" value={customFields} onChange={setCustomFields} />
          {error && (
            <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Checking…" : "Continue"}
          </button>
        </form>
      )}

      {step === "duplicate-prompt" && lead && (
        <form onSubmit={handleConfirm} className="card flex flex-col gap-4">
          <div
            className="flex items-start gap-2.5 rounded-lg p-3 text-sm"
            style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>Client already existed — do you still want to proceed?</span>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {candidates.map((c) => (
              <li key={c.id} className="card-flat py-3">
                <p className="font-medium">{c.name}</p>
                <p style={{ color: "var(--ink-muted)" }}>
                  {c.phone} · {c.email} · {c.status}
                </p>
              </li>
            ))}
          </ul>
          <label className="text-sm font-medium">
            Reason for proceeding
            <input
              required
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. different customer, shared office line"
              className="input mt-1.5"
            />
          </label>
          {error && (
            <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Confirming…" : "Yes, proceed anyway"}
          </button>
        </form>
      )}

      {step === "service-type" && lead && (
        <div className="card flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Select a service type to unlock the booking form.
          </p>
          {error && (
            <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <div className="grid grid-cols-3 gap-3">
            {SERVICE_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleServiceType(t.value)}
                  className="flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ borderColor: "var(--hairline-strong)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--hairline-strong)")}
                >
                  <Icon size={22} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
