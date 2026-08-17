import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";

import RevealField from "@/components/pii/RevealField";
import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { statusColor } from "@/lib/status-colors";

import CancellationPanel from "./CancellationPanel";
import ModificationsPanel from "./ModificationsPanel";
import PaymentActions from "./PaymentActions";
import StatusActions from "./StatusActions";

// PRD groups "modification/cancellation requests" under Change Dep/CS, with
// Admin/Super Admin oversight — mirrors MODIFICATION_ROLES/CANCELLATION_ROLES
// in the backend (backend/app/api/v1/modifications.py, cancellations.py).
// This only controls whether the *form* renders; the backend is still the
// actual authority (403s regardless of what this hides).
const MODIFICATION_ROLES = new Set(["change_dep", "cs", "admin", "super_admin"]);

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

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

// Falls back to a neutral color for statuses this page doesn't otherwise know
// the PRD §6.1 color for (only reachable if status_lookup and BookingStatus
// ever drift out of sync).
const STATUS_COLOR_HINTS: Record<string, string> = {
  authorization_pending: "grey",
  client_approved: "blue",
  transferred_to_billing: "purple",
  card_charged: "green",
  card_declined: "red",
  tag_change_dep: "yellow",
  tag_cr_booking: "orange",
  tag_auditor: "cyan",
  qc_done: "dark_green",
  tag_refund: "red",
  tag_rdr: "black",
  tag_chargeback: "black",
};

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

  const canModify = currentUser !== null && MODIFICATION_ROLES.has(currentUser.role) && booking !== null;

  // card_charged/card_declined are handled by the dedicated PaymentActions
  // form below (which also records a PaymentTransaction), not the generic
  // one-click status button — both would otherwise offer the same transition
  // through two different code paths.
  const canProcessPayment = allTransitions.some((t) => t.status === "card_charged" || t.status === "card_declined");
  const transitions = allTransitions.filter((t) => t.status !== "card_charged" && t.status !== "card_declined");

  return (
    <div className="max-w-lg">
      <Link href="/leads" className="text-sm text-neutral-500 hover:underline">
        ← Leads
      </Link>
      <h1 className="mb-1 mt-2 text-lg font-semibold">{lead.name}</h1>
      <p className="mb-6 flex flex-wrap items-center gap-x-2 text-sm text-neutral-500">
        <RevealField leadId={id} field="phone" maskedValue={lead.phone} />
        <span>·</span>
        <RevealField leadId={id} field="email" maskedValue={lead.email} />
      </p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-4 text-sm">
        <dt className="text-neutral-500">Status</dt>
        <dd>
          <span
            className="rounded px-2 py-0.5 text-xs text-white"
            style={{ backgroundColor: statusColor(STATUS_COLOR_HINTS[lead.status] ?? "grey") }}
          >
            {formatStatus(lead.status)}
          </span>
        </dd>

        <dt className="text-neutral-500">Service type</dt>
        <dd>{lead.service_type ?? "not selected yet"}</dd>

        {lead.source && (
          <>
            <dt className="text-neutral-500">Source</dt>
            <dd>{lead.source}</dd>
          </>
        )}

        <dt className="text-neutral-500">Duplicate match</dt>
        <dd>
          {lead.is_duplicate ? (
            <span>
              Yes — {lead.duplicate_override_reason ? "confirmed" : "unconfirmed"}
              {lead.duplicate_override_reason && (
                <span className="block text-neutral-500">“{lead.duplicate_override_reason}”</span>
              )}
            </span>
          ) : (
            "No"
          )}
        </dd>

        <dt className="text-neutral-500">Created</dt>
        <dd>{new Date(lead.created_at).toLocaleString()}</dd>
      </dl>

      <div className="mt-4 rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">Status actions</h2>
        <StatusActions leadId={id} transitions={transitions} />
      </div>

      {canProcessPayment && (
        <div className="mt-4">
          <PaymentActions leadId={id} />
        </div>
      )}

      {lead.status === "authorization_pending" && booking && (
        <div className="mt-4 rounded-lg border border-dashed p-4 text-sm">
          <h2 className="mb-2 font-medium">Send for customer authorization</h2>
          <p className="mb-2 text-neutral-500">
            Share this link with the customer to collect their &ldquo;I Authorize&rdquo; consent (PRD §8):
          </p>
          <a href={`/authorize/${id}`} target="_blank" rel="noreferrer" className="break-all text-blue-600 underline">
            /authorize/{id}
          </a>
        </div>
      )}

      {!lead.service_type && (
        <p className="mt-4 text-sm text-neutral-500">
          Booking form is locked until a service type is selected —{" "}
          <Link href="/leads/new" className="underline">
            continue the intake flow
          </Link>
          .
        </p>
      )}

      {lead.service_type && !booking && (
        <div className="mt-4 rounded-lg border border-dashed p-4 text-sm">
          <p className="mb-3 text-neutral-500">
            Service type is <strong>{lead.service_type}</strong> — booking details haven&apos;t been entered yet.
          </p>
          <Link
            href={`/leads/${id}/booking/${lead.service_type}`}
            className="inline-block rounded bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            Complete {lead.service_type} booking
          </Link>
        </div>
      )}

      {lead.service_type && booking && (
        <div className="mt-4 rounded-lg border p-4 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">
              {lead.service_type[0].toUpperCase() + lead.service_type.slice(1)} booking · {booking.booking_reference}
            </h2>
            <Link href={`/leads/${id}/booking/${lead.service_type}`} className="text-xs underline">
              Edit
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            {BOOKING_SUMMARY_FIELDS[lead.service_type]?.map((f) => (
              <Fragment key={f.key}>
                <dt className="text-neutral-500">{f.label}</dt>
                <dd>{String(booking[f.key] ?? "—")}</dd>
              </Fragment>
            ))}
            <dt className="text-neutral-500">Total</dt>
            <dd>{booking.total_amount}</dd>
          </dl>
        </div>
      )}

      {payments.length > 0 && (
        <div className="mt-4 rounded-lg border p-4 text-sm">
          <h2 className="mb-2 font-medium">Payment history</h2>
          <ul className="flex flex-col gap-1 text-xs text-neutral-500">
            {payments.map((p) => (
              <li key={p.id}>
                <span className={p.outcome === "charged" ? "text-green-700" : "text-red-700"}>{p.outcome}</span>
                {" · $"}
                {p.total_amount.toFixed(2)}
                {` · ${p.card_display}`}
                {" · "}
                {new Date(p.processed_at ?? p.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(canModify || modifications.length > 0) && (
        <div className="mt-4">
          <ModificationsPanel leadId={id} canModify={canModify} history={modifications} />
        </div>
      )}

      {(canModify || cancellation) && (
        <div className="mt-4">
          <CancellationPanel leadId={id} canCancel={canModify && !cancellation} cancellation={cancellation} />
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 rounded-lg border p-4 text-sm">
          <h2 className="mb-2 font-medium">Status history</h2>
          <ul className="flex flex-col gap-1 text-xs text-neutral-500">
            {history.map((h) => (
              <li key={h.id}>
                {h.from_status ? `${formatStatus(h.from_status)} → ` : ""}
                {formatStatus(h.to_status)} · {new Date(h.changed_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
