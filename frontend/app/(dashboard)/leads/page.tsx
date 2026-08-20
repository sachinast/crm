import { Plus, Search, Car, Hotel, Plane, ChevronRight, User, Phone, Mail, Filter } from "lucide-react";
import Link from "next/link";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import DataTableCard from "@/components/shared/DataTableCard";
import StatusBadge from "@/components/shared/StatusBadge";
import Pagination from "@/components/shared/Pagination";

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

function ServiceTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-slate-500">—</span>;

  if (type === "car") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a3652] bg-[#182136] px-2.5 py-1 text-xs font-semibold text-slate-200">
        <Car size={13} className="text-[#d3ab5e]" />
        <span>Car Rental</span>
      </span>
    );
  }

  if (type === "hotel") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a3652] bg-[#182136] px-2.5 py-1 text-xs font-semibold text-slate-200">
        <Hotel size={13} className="text-[#d3ab5e]" />
        <span>Hotel</span>
      </span>
    );
  }

  if (type === "flight") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a3652] bg-[#182136] px-2.5 py-1 text-xs font-semibold text-slate-200">
        <Plane size={13} className="text-[#d3ab5e]" />
        <span>Flight</span>
      </span>
    );
  }

  return <span className="text-xs font-medium capitalize text-slate-300">{type}</span>;
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
  const total = leads.length;
  const pagedLeads = leads.slice((page - 1) * pageSize, page * pageSize);

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
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d3ab5e] to-[#e0bc78] px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Lead</span>
          </Link>
        }
      />

      {/* Symmetric Data Grid Card */}
      <DataTableCard
        headerContent={
          <form className="flex w-full flex-wrap items-center justify-between gap-3" method="GET">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="email"
                  defaultValue={params.email}
                  placeholder="Filter by email address..."
                  className="input w-full pl-8 text-xs"
                />
              </div>

              <div className="relative min-w-[200px]">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="mobile"
                  defaultValue={params.mobile}
                  placeholder="Filter by mobile number..."
                  className="input w-full pl-8 text-xs"
                />
              </div>

              <button type="submit" className="btn-secondary btn-sm flex items-center gap-1.5 text-xs">
                <Filter size={12} />
                <span>Apply Filters</span>
              </button>

              {(params.email || params.mobile) && (
                <Link href="/leads" className="btn-ghost btn-sm text-xs">
                  Clear Filters
                </Link>
              )}
            </div>

            <div className="text-xs text-slate-400 font-medium">
              {leads.length} total leads
            </div>
          </form>
        }
        footerContent={
          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            basePath="/leads"
            extraParams={{ email: params.email, mobile: params.mobile, page_size: pageSize }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        }
      >
        <table className="table-modern w-full">
          <thead>
            <tr className="bg-[#182136]/30">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Customer Name
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Contact Details
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Service Type
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Workflow Status
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Intake Date
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232e47]">
            {pagedLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#232e47] bg-[#182136] text-slate-400">
                      <Search size={20} />
                    </div>
                    <p className="text-sm font-semibold text-white">No matching leads found</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try adjusting your search criteria or create a new lead intake record.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              pagedLeads.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-[#182136]/60">
                  {/* Customer Name & Duplicate Pill */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#2a3652] bg-[#182136] text-xs font-bold text-white">
                        {lead.name ? lead.name[0]?.toUpperCase() : "?"}
                      </div>
                      <div>
                        <span className="font-semibold text-white">{lead.name || "Unnamed Lead"}</span>
                        {lead.is_duplicate && (
                          <span className="ml-2 inline-flex items-center rounded-full border border-[#ef7b93]/30 bg-[#34131c] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ef7b93]">
                            Duplicate
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Contact Details */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-xs">
                      {lead.phone && (
                        <span className="font-mono text-slate-300">
                          {lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="font-mono text-xs text-slate-400">
                          {lead.email}
                        </span>
                      )}
                      {!lead.phone && !lead.email && (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                  </td>

                  {/* Service Type */}
                  <td className="px-4 py-3">
                    <ServiceTypeBadge type={lead.service_type} />
                  </td>

                  {/* Workflow Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>

                  {/* Created At */}
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {new Date(lead.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Action Link */}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#2a3652] bg-[#182136] px-2.5 py-1 text-xs font-semibold text-[#d3ab5e] transition-colors hover:border-[#d3ab5e] hover:bg-[#1f2b47]"
                    >
                      <span>Workspace</span>
                      <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableCard>
    </div>
  );
}
