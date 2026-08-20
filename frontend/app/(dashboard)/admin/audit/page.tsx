import { ScrollText, Search, ShieldAlert, Eye, Lock, Filter } from "lucide-react";
import Link from "next/link";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import DataTableCard from "@/components/shared/DataTableCard";
import Pagination from "@/components/shared/Pagination";

interface ProcessLogEntry {
  id: string;
  lead_id: string;
  actor_id: string;
  action: string;
  field_changed: string | null;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
}

interface PiiRevealEntry {
  id: string;
  lead_id: string;
  agent_id: string;
  field_revealed: string;
  reason: string;
  ip_address: string;
  revealed_at: string;
}

interface AccessLogEntry {
  id: string;
  lead_id: string;
  opened_by: string;
  opened_at: string;
}

const PAGE_SIZE_DEFAULT = 10;

async function fetchAudit<T>(path: string): Promise<{ rows: T[]; forbidden: boolean }> {
  const token = await getAccessToken();
  if (!token) return { rows: [], forbidden: true };
  try {
    return { rows: await apiFetch<T[]>(path, { token }), forbidden: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { rows: [], forbidden: true };
    return { rows: [], forbidden: true };
  }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ lead_id?: string; tab?: string; page?: string; page_size?: string }>;
}) {
  const { lead_id, tab = "process", page: pageParam, page_size: pageSizeParam } = await searchParams;
  const page = Math.max(Number(pageParam) || 1, 1);
  const pageSize = Number(pageSizeParam) && [10, 25, 50, 100].includes(Number(pageSizeParam))
    ? Number(pageSizeParam)
    : PAGE_SIZE_DEFAULT;

  const suffix = lead_id ? `?lead_id=${encodeURIComponent(lead_id)}` : "";

  const [processLog, piiReveals, accessLog] = await Promise.all([
    fetchAudit<ProcessLogEntry>(`/audit/process-log${suffix}`),
    fetchAudit<PiiRevealEntry>(`/audit/pii-reveals${suffix}`),
    fetchAudit<AccessLogEntry>(`/audit/access-log${suffix}`),
  ]);

  if (processLog.forbidden) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Audit & Quality Control"
          subtitle="Admin & Super Admin oversight portal."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Admin" }, { label: "Audit" }]}
          icon={<ScrollText size={18} />}
        />
        <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-6 text-sm text-slate-400">
          Your account role does not have permission to view audit reports.
        </div>
      </div>
    );
  }

  // Active dataset according to tab
  const activeTab = ["process", "pii", "access"].includes(tab) ? tab : "process";

  let currentItemsCount = 0;
  if (activeTab === "process") currentItemsCount = processLog.rows.length;
  else if (activeTab === "pii") currentItemsCount = piiReveals.rows.length;
  else if (activeTab === "access") currentItemsCount = accessLog.rows.length;

  const pagedProcess = processLog.rows.slice((page - 1) * pageSize, page * pageSize);
  const pagedPii = piiReveals.rows.slice((page - 1) * pageSize, page * pageSize);
  const pagedAccess = accessLog.rows.slice((page - 1) * pageSize, page * pageSize);

  const TABS = [
    { id: "process", label: "Booking Process Log", count: processLog.rows.length },
    { id: "pii", label: "PII Unmasking Log", count: piiReveals.rows.length },
    { id: "access", label: "Record Access Log", count: accessLog.rows.length },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Symmetric Page Header */}
      <PageHeader
        title="Audit & Quality Control"
        subtitle="Master booking process log, PII unmasking trail, and record access inspection."
        badge={`${processLog.rows.length + piiReveals.rows.length + accessLog.rows.length} total events`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Audit & QC" },
        ]}
        icon={<ScrollText size={18} />}
      />

      {/* Main Aligned DataTableCard Grid with Tabs & Pagination */}
      <DataTableCard
        headerContent={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {TABS.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <Link
                    key={t.id}
                    href={`/admin/audit?tab=${t.id}${lead_id ? `&lead_id=${encodeURIComponent(lead_id)}` : ""}`}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-2 ${
                      isActive
                        ? "bg-accent text-white font-bold shadow-xs"
                        : "bg-surface text-ink-muted border border-hairline hover:bg-surface-raised hover:text-ink"
                    }`}
                  >
                    <span>{t.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                        isActive ? "bg-white/20 text-white font-bold" : "bg-surface-raised text-ink-faint"
                      }`}
                    >
                      {t.count}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Lead Search Filter */}
            <form className="flex items-center gap-2" method="GET">
              <input type="hidden" name="tab" value={activeTab} />
              <div className="relative min-w-[220px]">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  name="lead_id"
                  defaultValue={lead_id}
                  placeholder="Filter by Lead UUID..."
                  className="input w-full pl-8 text-xs font-mono"
                />
              </div>
              <button type="submit" className="btn-secondary btn-sm text-xs">
                Filter
              </button>
              {lead_id && (
                <Link href={`/admin/audit?tab=${activeTab}`} className="btn-ghost btn-sm text-xs">
                  Clear
                </Link>
              )}
            </form>
          </div>
        }
        footerContent={
          <Pagination
            currentPage={page}
            totalItems={currentItemsCount}
            pageSize={pageSize}
            basePath="/admin/audit"
            extraParams={{ tab: activeTab, lead_id, page_size: pageSize }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        }
      >
        {activeTab === "process" && (
          <table className="table-modern w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Action / Mutation</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Target Lead</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Attribute Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {pagedProcess.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-ink-muted">No process entries found.</td>
                </tr>
              ) : (
                pagedProcess.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-surface-raised">
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-sm text-ink">{r.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-accent">
                      <Link href={`/leads/${r.lead_id}`} className="hover:underline">
                        {r.lead_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {r.field_changed ? (
                        <span>
                          <span className="font-semibold text-ink">{r.field_changed}</span>: {JSON.stringify(r.old_value)} → {JSON.stringify(r.new_value)}
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === "pii" && (
          <table className="table-modern w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Field Revealed</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Reason & Agent</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-faint">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {pagedPii.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-ink-muted">No PII unmasking entries.</td>
                </tr>
              ) : (
                pagedPii.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-surface-raised">
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{new Date(r.revealed_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {r.field_revealed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      &ldquo;{r.reason}&rdquo; · agent <span className="font-mono text-ink">{r.agent_id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-ink-muted">{r.ip_address}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === "access" && (
          <table className="table-modern w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Opened Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Target Lead</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-faint">Agent ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {pagedAccess.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-sm text-ink-muted">No record access events.</td>
                </tr>
              ) : (
                pagedAccess.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-surface-raised">
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{new Date(r.opened_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-accent">
                      <Link href={`/leads/${r.lead_id}`} className="hover:underline">
                        {r.lead_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-ink-muted">{r.opened_by}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </DataTableCard>
    </div>
  );
}
