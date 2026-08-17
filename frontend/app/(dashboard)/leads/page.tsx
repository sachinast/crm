import Link from "next/link";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_type: string | null;
  status: string;
  is_duplicate: boolean;
  created_at: string;
}

interface SearchParams {
  email?: string;
  mobile?: string;
}

async function fetchLeads(params: SearchParams): Promise<LeadRow[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const query = new URLSearchParams();
  if (params.email) query.set("email", params.email);
  if (params.mobile) query.set("mobile", params.mobile);
  const suffix = query.toString() ? `?${query.toString()}` : "";

  try {
    return await apiFetch<LeadRow[]>(`/leads${suffix}`, { token });
  } catch {
    return [];
  }
}

// Lead list + filters (Date/Email/Mobile) — TECHNICAL_SPEC.md §5, row-filtered
// server-side per role (app/api/deps.py:apply_lead_visibility in the backend).
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const leads = await fetchLeads(params);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Leads</h1>
        <Link href="/leads/new" className="rounded bg-neutral-900 px-3 py-2 text-sm text-white">
          New lead
        </Link>
      </div>

      <form className="mb-4 flex gap-2" method="GET">
        <input
          name="email"
          defaultValue={params.email}
          placeholder="Filter by email"
          className="rounded border px-3 py-2 text-sm"
        />
        <input
          name="mobile"
          defaultValue={params.mobile}
          placeholder="Filter by mobile"
          className="rounded border px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded border px-3 py-2 text-sm hover:bg-neutral-100">
          Filter
        </button>
        {(params.email || params.mobile) && (
          <Link href="/leads" className="rounded border px-3 py-2 text-sm hover:bg-neutral-100">
            Clear
          </Link>
        )}
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-neutral-500">
            <th className="py-2 font-medium">Name</th>
            <th className="font-medium">Phone</th>
            <th className="font-medium">Email</th>
            <th className="font-medium">Service</th>
            <th className="font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-neutral-400">
                No leads yet.
              </td>
            </tr>
          )}
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b">
              <td className="py-2">
                <Link href={`/leads/${lead.id}`} className="hover:underline">
                  {lead.name}
                </Link>
                {lead.is_duplicate && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">dup</span>
                )}
              </td>
              <td>{lead.phone}</td>
              <td>{lead.email}</td>
              <td>{lead.service_type ?? "—"}</td>
              <td>{lead.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
