
import { Flame } from "lucide-react";
import Link from "next/link";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import LeadsTableClient, { type LeadRow } from "@/components/leads/LeadsTableClient";

interface SearchParams {
  email?: string;
  mobile?: string;
  page?: string;
  page_size?: string;
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

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const leads = await fetchLeads(params);

  const page = Math.max(Number(params.page) || 1, 1);
  const pageSize = Number(params.page_size) && [10, 25, 50, 100].includes(Number(params.page_size))
    ? Number(params.page_size)
    : 10;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Symmetric Page Header */}
      <PageHeader
        title="Leads"
        subtitle="Manage inbound customer pipelines, duplicate checks, and booking workflows."
        badge={`${leads.length} ${leads.length === 1 ? "record" : "records"}`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Leads" }]}
        actions={
          <Link
            href="/leads/new"
            className="btn-primary flex items-center gap-1.5"
          >
            <Flame size={16} className="text-amber-300 fill-amber-400/30 animate-pulse" />
            <span>New Lead</span>
          </Link>
        }
      />

      {/* Sortable & Filterable Data Table Client */}
      <LeadsTableClient initialLeads={leads} initialPage={page} initialPageSize={pageSize} />
    </div>
  );
}
