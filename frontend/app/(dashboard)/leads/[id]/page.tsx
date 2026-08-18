import { CalendarClock, Car, CreditCard, Hotel, Link as LinkIcon, Plane, Repeat } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";

import RevealField from "@/components/pii/RevealField";
import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { statusBadgeStyle } from "@/lib/status-colors";
import { formatStatus, STATUS_COLOR_HINTS } from "@/lib/status-meta";

import CancellationPanel from "./CancellationPanel";
import LeadCustomFieldsPanel from "./LeadCustomFieldsPanel";
import ModificationsPanel from "./ModificationsPanel";
import PaymentActions from "./PaymentActions";
import StatusActions from "./StatusActions";

// mirrors modifications.manage / cancellations.manage in the backend
// (backend/app/api/v1/modifications.py, cancellations.py) — whichever roles
// currently hold those permissions, not a hardcoded role list. This only
// controls whether the *form* renders; the backend is still the actual
// authority (403s regardless of what this hides).

interface LeadDetail {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_type: string | null;
  status: string;
  agent_id: string;
  is_duplicate: boolean;
  duplicate_of_id: string | null;
  duplicate_override_reason: string | null;
  source: string | null; // set for leads captured externally via POST /leads/capture (Phase 8)
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface BookingSummary {
  booking_reference: string;
  total_amount: number;
  [key: string]: unknown;
}

interface Transition {
  status: string;
  label: string;
  ui_color: string;
}

interface StatusHistoryEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  changed_at: string;
}

interface PaymentEntry {
  id: string;
  outcome: string;
  card_display: string; // masked by default (PRD §9.1) — e.g. "****-****-****-4242"
  total_amount: number;
  processed_at: string | null;
  created_at: string;
}

interface ModificationEntry {
  id: string;
  field_name: string;
  original_value: unknown;
  revised_value: unknown;
  modification_amount: number;
  created_at: string;
}

interface CancellationEntry {
  original_prepaid_amount: number;
  cancellation_penalty_fee: number;
  refund_amount: number;
  final_retained_amount: number;
  created_at: string;
}

async function fetchLead(id: string): Promise<LeadDetail | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    // Every fetch here also logs an access_notification_log row + notifies
    // the admin/owning agent server-side — TECHNICAL_SPEC.md §5.
    return await apiFetch<LeadDetail>(`/leads/${id}`, { token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function fetchBooking(id: string, serviceType: string): Promise<BookingSummary | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await apiFetch<BookingSummary>(`/leads/${id}/${serviceType}-booking`, { token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function fetchAvailableTransitions(id: string): Promise<Transition[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<Transition[]>(`/leads/${id}/available-transitions`, { token });
  } catch {
    return [];
  }
}

async function fetchStatusHistory(id: string): Promise<StatusHistoryEntry[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<StatusHistoryEntry[]>(`/leads/${id}/status-history`, { token });
  } catch {
    return [];
  }
}

async function fetchPayments(id: string): Promise<PaymentEntry[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<PaymentEntry[]>(`/leads/${id}/payments`, { token });
  } catch {
    return [];
  }
}

async function fetchModifications(id: string): Promise<ModificationEntry[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<ModificationEntry[]>(`/leads/${id}/modifications`, { token });
  } catch {
    return [];
  }
}

async function fetchCancellation(id: string): Promise<CancellationEntry | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await apiFetch<CancellationEntry>(`/leads/${id}/cancellation`, { token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    return null;
  }
}

const BOOKING_SUMMARY_FIELDS: Record<string, { key: string; label: string }[]> = {
  car: [
    { key: "car_provider", label: "Provider" },
    { key: "vehicle_type", label: "Vehicle" },
    { key: "pickup_location", label: "Pick-up" },
    { key: "return_location", label: "Return" },
  ],
  hotel: [
    { key: "hotel_name", label: "Hotel" },
    { key: "room_type", label: "Room" },
    { key: "check_in_date", label: "Check-in" },
    { key: "check_out_date", label: "Check-out" },
  ],
  flight: [
    { key: "airline", label: "Airline" },
    { key: "pnr", label: "PNR" },
    { key: "origin", label: "Origin" },
    { key: "destination", label: "Destination" },
  ],
};

const SERVICE_ICON: Record<string, typeof Car> = { car: Car, hotel: Hotel, flight: Plane };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await fetchLead(id);
  if (!lead) notFound();

  const [booking, allTransitions, history, payments, modifications, cancellation, currentUser] = await Promise.all([
    lead.service_type ? fetchBooking(id, lead.service_type) : Promise.resolve(null),
    fetchAvailableTransitions(id),
    fetchStatusHistory(id),
    fetchPayments(id),
    fetchModifications(id),
    fetchCancellation(id),
    getCurrentUser(),
  ]);

  const canModify =
    currentUser !== null &&
    hasPermission(currentUser, "modifications.manage", "cancellations.manage") &&
    booking !== null;

  // card_charged/card_declined are handled by the dedicated PaymentActions
  // form below (which also records a PaymentTransaction), not the generic
  // one-click status button — both would otherwise offer the same transition
  // through two different code paths.
  const canProcessPayment = allTransitions.some((t) => t.status === "card_charged" || t.status === "card_declined");
  const transitions = allTransitions.filter((t) => t.status !== "card_charged" && t.status !== "card_declined");

  const ServiceIcon = lead.service_type ? SERVICE_ICON[lead.service_type] : null;

  return (
    <div className="max-w-2xl">
      <Link href="/leads" className="link-muted text-sm">
        ← Leads
      </Link>

      <div className="mb-6 mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm" style={{ color: "var(--ink-muted)" }}>
            <RevealField leadId={id} field="phone" maskedValue={lead.phone} />
            <span>·</span>
            <RevealField leadId={id} field="email" maskedValue={lead.email} />
          </p>
        </div>
        <span className="badge shrink-0" style={statusBadgeStyle(STATUS_COLOR_HINTS[lead.status] ?? "grey")}>
          {formatStatus(lead.status)}
        </span>
      </div>

      <dl className="card mb-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt style={{ color: "var(--ink-faint)" }}>Service type</dt>
        <dd className="flex items-center gap-1.5 capitalize">
          {ServiceIcon && <ServiceIcon size={14} style={{ color: "var(--accent)" }} />}
          {lead.service_type ?? "not selected yet"}
        </dd>

        {lead.source && (
          <>
            <dt style={{ color: "var(--ink-faint)" }}>Source</dt>
            <dd>{lead.source}</dd>
          </>
        )}

        <dt style={{ color: "var(--ink-faint)" }}>Duplicate match</dt>
        <dd>
          {lead.is_duplicate ? (
            <span>
              Yes — {lead.duplicate_override_reason ? "confirmed" : "unconfirmed"}
              {lead.duplicate_override_reason && (
                <span className="block" style={{ color: "var(--ink-muted)" }}>
                  “{lead.duplicate_override_reason}”
                </span>
              )}
            </span>
          ) : (
            "No"
          )}
        </dd>

        <dt style={{ color: "var(--ink-faint)" }}>Created</dt>
        <dd>{new Date(lead.created_at).toLocaleString()}</dd>
      </dl>

      <LeadCustomFieldsPanel
        leadId={id}
        initialCustomFields={lead.custom_fields}
        canEdit={hasPermission(currentUser, "leads.create")}
      />

      <div className="card mb-4">
        <h2 className="section-label mb-3">Status actions</h2>
        <StatusActions leadId={id} transitions={transitions} />
      </div>

      {canProcessPayment && (
        <div className="mb-4">
          <PaymentActions leadId={id} />
        </div>
      )}

      {lead.status === "authorization_pending" && booking && (
        <div className="card mb-4 flex items-start gap-3 text-sm" style={{ borderStyle: "dashed" }}>
          <LinkIcon size={18} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
          <div>
            <h2 className="mb-1 font-medium">Send for customer authorization</h2>
            <p className="mb-2" style={{ color: "var(--ink-muted)" }}>
              Share this link with the customer to collect their &ldquo;I Authorize&rdquo; consent (PRD §8):
            </p>
            <a
              href={`/authorize/${id}`}
              target="_blank"
              rel="noreferrer"
              className="break-all underline"
              style={{ color: "var(--accent)" }}
            >
              /authorize/{id}
            </a>
          </div>
        </div>
      )}

      {!lead.service_type && (
        <p className="mb-4 text-sm" style={{ color: "var(--ink-muted)" }}>
          Booking form is locked until a service type is selected —{" "}
          <Link href="/leads/new" className="underline" style={{ color: "var(--accent)" }}>
            continue the intake flow
          </Link>
          .
        </p>
      )}

      {lead.service_type && !booking && (
        <div className="card mb-4 text-sm" style={{ borderStyle: "dashed" }}>
          <p className="mb-3" style={{ color: "var(--ink-muted)" }}>
            Service type is <strong>{lead.service_type}</strong> — booking details haven&apos;t been entered yet.
          </p>
          <Link href={`/leads/${id}/booking/${lead.service_type}`} className="btn-primary">
            Complete {lead.service_type} booking
          </Link>
        </div>
      )}

      {lead.service_type && booking && (
        <div className="card mb-4 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-medium">
              {ServiceIcon && <ServiceIcon size={15} style={{ color: "var(--accent)" }} />}
              {lead.service_type[0].toUpperCase() + lead.service_type.slice(1)} booking · {booking.booking_reference}
            </h2>
            <Link href={`/leads/${id}/booking/${lead.service_type}`} className="link-muted text-xs underline">
              Edit
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {BOOKING_SUMMARY_FIELDS[lead.service_type]?.map((f) => (
              <Fragment key={f.key}>
                <dt style={{ color: "var(--ink-faint)" }}>{f.label}</dt>
                <dd>{String(booking[f.key] ?? "—")}</dd>
              </Fragment>
            ))}
            <dt style={{ color: "var(--ink-faint)" }}>Total</dt>
            <dd className="font-medium">{booking.total_amount}</dd>
          </dl>
        </div>
      )}

      {payments.length > 0 && (
        <div className="card mb-4 text-sm">
          <h2 className="section-label mb-3 flex items-center gap-1.5">
            <CreditCard size={13} />
            Payment history
          </h2>
          <ul className="flex flex-col gap-2 text-xs" style={{ color: "var(--ink-muted)" }}>
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-1.5">
                <span
                  className="badge"
                  style={p.outcome === "charged" ? statusBadgeStyle("green") : statusBadgeStyle("red")}
                >
                  {p.outcome}
                </span>
                <span>${p.total_amount.toFixed(2)}</span>
                <span>· {p.card_display}</span>
                <span>· {new Date(p.processed_at ?? p.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(canModify || modifications.length > 0) && (
        <div className="mb-4">
          <ModificationsPanel leadId={id} canModify={canModify} history={modifications} />
        </div>
      )}

      {(canModify || cancellation) && (
        <div className="mb-4">
          <CancellationPanel leadId={id} canCancel={canModify && !cancellation} cancellation={cancellation} />
        </div>
      )}

      {history.length > 0 && (
        <div className="card mb-4 text-sm">
          <h2 className="section-label mb-3 flex items-center gap-1.5">
            <CalendarClock size={13} />
            Status history
          </h2>
          <ul className="flex flex-col gap-2 text-xs" style={{ color: "var(--ink-muted)" }}>
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-1.5">
                <Repeat size={12} className="shrink-0" style={{ color: "var(--ink-faint)" }} />
                {h.from_status ? `${formatStatus(h.from_status)} → ` : ""}
                {formatStatus(h.to_status)}
                <span style={{ color: "var(--ink-faint)" }}>· {new Date(h.changed_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
