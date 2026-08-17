import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

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
  created_at: string;
  updated_at: string;
}

interface BookingSummary {
  booking_reference: string;
  total_amount: number;
  [key: string]: unknown;
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

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await fetchLead(id);
  if (!lead) notFound();

  const booking = lead.service_type ? await fetchBooking(id, lead.service_type) : null;

  return (
    <div className="max-w-lg">
      <Link href="/leads" className="text-sm text-neutral-500 hover:underline">
        ← Leads
      </Link>
      <h1 className="mb-1 mt-2 text-lg font-semibold">{lead.name}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {lead.phone} · {lead.email}
      </p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-4 text-sm">
        <dt className="text-neutral-500">Status</dt>
        <dd>{lead.status}</dd>

        <dt className="text-neutral-500">Service type</dt>
        <dd>{lead.service_type ?? "not selected yet"}</dd>

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
    </div>
  );
}
