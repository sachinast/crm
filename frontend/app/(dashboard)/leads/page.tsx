import { Plus, Search, Car, Hotel, Plane, ChevronRight, User, Phone, Mail, Filter, Flame } from "lucide-react";
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
  if (!type) return <span className="text-[var(--ink-faint)]">—</span>;

  if (type === "car") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--ink)]">
        <Car size={14} className="text-[var(--accent)]" />
        <span>Car Rental</span>
      </span>
    );
  }

  if (type === "hotel") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--ink)]">
        <Hotel size={14} className="text-[var(--accent)]" />
        <span>Hotel</span>
      </span>
    );
  }

  if (type === "flight") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--ink)]">
        <Plane size={14} className="text-[var(--accent)]" />
        <span>Flight</span>
      </span>
    );
  }

  return <span className="text-xs font-semibold capitalize text-[var(--ink-muted)]">{type}</span>;
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
            className="btn-primary flex items-center gap-1.5"
          >
            <Flame size={16} className="text-amber-300 fill-amber-400/30 animate-pulse" />
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
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
                />
                <input
                  name="email"
                  defaultValue={params.email}
                  placeholder="Filter by email address..."
                  className="input w-full pl-9 text-sm"
                />
              </div>

              <div className="relative min-w-[200px]">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
                />
                <input
                  name="mobile"
                  defaultValue={params.mobile}
                  placeholder="Filter by mobile number..."
                  className="input w-full pl-9 text-sm"
                />
              </div>

              <button type="submit" className="btn-secondary btn-sm flex items-center gap-1.5">
                <Filter size={13} />
                <span>Apply Filters</span>
              </button>

              {(params.email || params.mobile) && (
                <Link href="/leads" className="btn-ghost btn-sm">
                  Clear Filters
                </Link>
              )}
            </div>

            <div className="text-sm text-[var(--ink-muted)] font-medium">
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
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                Customer Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                Contact Details
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                Service Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                Workflow Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                Intake Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--hairline)]">
            {pagedLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--hairline)] bg-[var(--surface-raised)] text-[var(--ink-muted)]">
                      <Search size={20} />
                    </div>
                    <p className="text-sm font-semibold text-[var(--ink)]">No matching leads found</p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      Try adjusting your search criteria or create a new lead intake record.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              pagedLeads.map((lead) => {
                const isHot =
                  lead.status.toLowerCase() === "new" ||
                  lead.status.toLowerCase() === "authorization_pending" ||
                  lead.status.toLowerCase() === "pending";

                return (
                  <tr key={lead.id} className="transition-colors hover:bg-surface-raised">
                    {/* Customer Name & Duplicate Pill */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${
                            isHot
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "border-hairline bg-surface-raised text-ink"
                          }`}
                        >
                          {lead.name ? lead.name[0]?.toUpperCase() : "?"}
                          {isHot && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs">
                              <Flame size={9} className="fill-white" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-ink">{lead.name || "Unnamed Lead"}</span>
                          {/* {isHot && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 shadow-xs">
                              <Flame size={12} className="fill-amber-500 text-amber-500 animate-pulse shrink-0" />
                              <span>HOT</span>
                            </span>
                          )} */}
                          {lead.is_duplicate && (
                            <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-danger">
                              Duplicate
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                  {/* Contact Details */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-0.5 text-sm">
                      {lead.phone && (
                        <span className="font-mono text-sm text-[var(--ink)]">
                          {lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="font-mono text-xs text-[var(--ink-muted)]">
                          {lead.email}
                        </span>
                      )}
                      {!lead.phone && !lead.email && (
                        <span className="text-[var(--ink-faint)]">—</span>
                      )}
                    </div>
                  </td>

                  {/* Service Type */}
                  <td className="px-4 py-3.5">
                    <ServiceTypeBadge type={lead.service_type} />
                  </td>

                  {/* Workflow Status */}
                  <td className="px-4 py-3.5">
                    <StatusBadge status={lead.status} />
                  </td>

                  {/* Created At */}
                  <td className="px-4 py-3.5 font-mono text-sm text-[var(--ink-muted)]">
                    {new Date(lead.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Action Link */}
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface)]"
                    >
                      <span>Workspace</span>
                      <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </DataTableCard>
    </div>
  );
}
