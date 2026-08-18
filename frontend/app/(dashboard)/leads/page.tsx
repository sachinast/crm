import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { statusBadgeStyle } from "@/lib/status-colors";
import { formatStatus, STATUS_COLOR_HINTS } from "@/lib/status-meta";

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            {leads.length} {leads.length === 1 ? "record" : "records"} in view
          </p>
        </div>
        <Link href="/leads/new" className="btn-primary">
          <Plus size={16} strokeWidth={2.5} />
          New lead
        </Link>
      </div>

      <form className="mb-5 flex flex-wrap gap-2" method="GET">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-faint)" }} />
          <input
            name="email"
            defaultValue={params.email}
            placeholder="Filter by email"
            className="input w-56 pl-8"
          />
        </div>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-faint)" }} />
          <input
            name="mobile"
            defaultValue={params.mobile}
            placeholder="Filter by mobile"
            className="input w-56 pl-8"
          />
        </div>
        <button type="submit" className="btn-secondary">
          Filter
        </button>
        {(params.email || params.mobile) && (
          <Link href="/leads" className="btn-ghost">
            Clear
          </Link>
        )}
      </form>

      <div className="card-flat overflow-x-auto p-0">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Service</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center" style={{ color: "var(--ink-faint)" }}>
                  No leads yet.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                    {lead.name}
                  </Link>
                  {lead.is_duplicate && (
                    <span className="badge ml-2" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                      dup
                    </span>
                  )}
                </td>
                <td style={{ color: "var(--ink-muted)" }}>{lead.phone}</td>
                <td style={{ color: "var(--ink-muted)" }}>{lead.email}</td>
                <td className="capitalize" style={{ color: "var(--ink-muted)" }}>
                  {lead.service_type ?? "—"}
                </td>
                <td>
                  <span className="badge" style={statusBadgeStyle(STATUS_COLOR_HINTS[lead.status] ?? "grey")}>
                    {formatStatus(lead.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
