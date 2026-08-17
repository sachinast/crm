"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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

const SERVICE_TYPES: { value: string; label: string }[] = [
  { value: "car", label: "Car Rental" },
  { value: "hotel", label: "Hotel" },
  { value: "flight", label: "Flight" },
];

export default function NewLeadPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intake");
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [lead, setLead] = useState<LeadResponse | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleIntakeSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
      <h1 className="mb-1 text-lg font-semibold">New lead</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Step {step === "intake" ? "1" : step === "duplicate-prompt" ? "2–3" : "4"} of 4 — PRD §4.1
      </p>

      {step === "intake" && (
        <form onSubmit={handleIntakeSubmit} className="flex flex-col gap-3 rounded-lg border p-4">
          <label className="text-sm">
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Number
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? "Checking…" : "Continue"}
          </button>
        </form>
      )}

      {step === "duplicate-prompt" && lead && (
        <form onSubmit={handleConfirm} className="flex flex-col gap-4 rounded-lg border p-4">
          <div className="rounded bg-amber-50 p-3 text-sm text-amber-900">
            Client already existed — do you still want to proceed?
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {candidates.map((c) => (
              <li key={c.id} className="rounded border p-2">
                <p className="font-medium">{c.name}</p>
                <p className="text-neutral-500">
                  {c.phone} · {c.email} · {c.status}
                </p>
              </li>
            ))}
          </ul>
          <label className="text-sm">
            Reason for proceeding
            <input
              required
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. different customer, shared office line"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? "Confirming…" : "Yes, proceed anyway"}
          </button>
        </form>
      )}

      {step === "service-type" && lead && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <p className="text-sm text-neutral-500">Select a service type to unlock the booking form.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            {SERVICE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={submitting}
                onClick={() => handleServiceType(t.value)}
                className="rounded border px-3 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
