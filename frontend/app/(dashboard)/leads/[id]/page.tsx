import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await fetchLead(id);
  if (!lead) notFound();

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
      {lead.service_type && (
        <p className="mt-4 text-sm text-neutral-500">
          {lead.service_type[0].toUpperCase() + lead.service_type.slice(1)} booking module — Phase 3.
        </p>
      )}
    </div>
  );
}
