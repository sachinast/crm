import { History, ShieldAlert, Lock, User, Globe, Clock, Layers } from "lucide-react";
import Link from "next/link";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import DataTableCard from "@/components/shared/DataTableCard";
import Pagination from "@/components/shared/Pagination";

interface ActivityEntry {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  category: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface ActivityPage {
  items: ActivityEntry[];
  total: number;
  page: number;
  page_size: number;
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

const CATEGORIES = ["auth", "admin", "messaging", "pii"];
const PAGE_SIZE = 10;

async function fetchJson<T>(path: string): Promise<{ data: T | null; forbidden: boolean }> {
  const token = await getAccessToken();
  if (!token) return { data: null, forbidden: true };
  try {
    return { data: await apiFetch<T>(path, { token }), forbidden: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { data: null, forbidden: true };
    return { data: null, forbidden: true };
  }
}

function summarize(entry: ActivityEntry): string {
  const m = entry.metadata ?? {};
  switch (entry.action) {
    case "login_success":
      return "Logged in successfully";
    case "login_failed":
      return `Failed login attempt (${m.email ?? "unknown email"})`;
    case "role_created":
      return `Created role "${m.name}"`;
    case "role_permissions_changed":
      return `Changed permissions for role "${m.name}"`;
    case "role_deleted":
      return `Deleted role "${m.name}"`;
    case "user_created":
      return `Created user ${m.email} (${m.role_name})`;
    case "user_role_changed":
      return `Changed ${m.email}'s role: ${m.old_role} → ${m.new_role}`;
    case "conversation_started":
      return `Started a ${m.is_group ? "group " : ""}conversation (${m.participant_count} participants)`;
    case "reveal_denied":
      return `Tried to reveal ${m.field} on an unauthorized lead`;
    default:
      return entry.action.replace(/_/g, " ");
  }
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string; page_size?: string }>;
}) {
  const { category, page: pageParam, page_size: pageSizeParam } = await searchParams;
  const page = Math.max(Number(pageParam) || 1, 1);
  const pageSize = Number(pageSizeParam) && [10, 25, 50, 100].includes(Number(pageSizeParam))
    ? Number(pageSizeParam)
    : PAGE_SIZE;

  const suffix = `?page=${page}&page_size=${pageSize}${category ? `&category=${encodeURIComponent(category)}` : ""}`;

  const [{ data: activity, forbidden: activityForbidden }, { data: piiReveals, forbidden: piiForbidden }] =
    await Promise.all([
      fetchJson<ActivityPage>(`/admin/activity${suffix}`),
      fetchJson<PiiRevealEntry[]>("/audit/pii-reveals"),
    ]);

  const deniedReveals = (activity?.items ?? []).filter((e) => e.action === "reveal_denied");
  const combinedPii = [
    ...(piiReveals ?? []).map((r) => ({
      kind: "revealed" as const,
      at: r.revealed_at,
      actor: r.agent_id,
      detail: `Revealed ${r.field_revealed} — "${r.reason}"`,
      ip: r.ip_address,
    })),
    ...deniedReveals.map((e) => ({
      kind: "denied" as const,
      at: e.created_at,
      actor: e.actor_name ?? e.actor_id ?? "unknown",
      detail: summarize(e),
      ip: e.ip_address,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Symmetric Page Header */}
      <PageHeader
        title="Activity Log"
        subtitle="System authentication, role policy changes, and security access milestones."
        badge={activity ? `${activity.total} events` : undefined}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Activity Log" },
        ]}
        icon={<History size={18} />}
      />

      {/* Main System Activity Grid Card */}
      {activityForbidden ? (
        <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-6 text-sm text-slate-400">
          Your role does not have permission to view the system activity log.
        </div>
      ) : (
        <DataTableCard
          headerContent={
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <Link
                  href="/admin/activity"
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                    !category
                      ? "bg-[#d3ab5e] text-slate-950 font-bold shadow-sm"
                      : "bg-[#0d1220] text-slate-300 border border-[#232e47] hover:border-[#d3ab5e] hover:text-white"
                  }`}
                >
                  All Events
                </Link>
                {CATEGORIES.map((c) => {
                  const isActive = category === c;
                  return (
                    <Link
                      key={c}
                      href={`/admin/activity?category=${c}`}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                        isActive
                          ? "bg-[#d3ab5e] text-slate-950 font-bold shadow-sm"
                          : "bg-[#0d1220] text-slate-300 border border-[#232e47] hover:border-[#d3ab5e] hover:text-white"
                      }`}
                    >
                      {c}
                    </Link>
                  );
                })}
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {activity?.total ?? 0} total entries
              </div>
            </div>
          }
          footerContent={
            activity && (
              <Pagination
                currentPage={page}
                totalItems={activity.total}
                pageSize={pageSize}
                basePath="/admin/activity"
                extraParams={{ category, page_size: pageSize }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            )
          }
        >
          <table className="table-modern w-full">
            <thead>
              <tr className="bg-[#182136]/30">
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Actor / User
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Event Action
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232e47]">
              {(activity?.items.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                    No activity recorded in this category.
                  </td>
                </tr>
              ) : (
                activity?.items.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-[#182136]/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {entry.actor_name ?? <span className="font-normal text-slate-500">system</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-200">
                      {summarize(entry)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">
                      {entry.ip_address ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableCard>
      )}

      {/* PII Reveal & Security Audit Activity */}
      <div className="space-y-3 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-[#d3ab5e]" />
            <h2 className="text-base font-bold text-white">PII Reveal & Security Activity</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Audit trail of customer data reveals and denied unmasked access attempts.
          </p>
        </div>

        {piiForbidden && activityForbidden ? (
          <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-5 text-sm text-slate-400">
            Your role does not have permission to view PII reveal records.
          </div>
        ) : (
          <DataTableCard>
            <table className="table-modern w-full">
              <thead>
                <tr className="bg-[#182136]/30">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Agent / User
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Security Event & Reason
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232e47]">
                {combinedPii.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                      No PII reveal activity logged yet.
                    </td>
                  </tr>
                ) : (
                  combinedPii.map((row, i) => (
                    <tr key={i} className="transition-colors hover:bg-[#182136]/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {new Date(row.at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-white">
                        {row.actor}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-200">
                        <span
                          className={`mr-2.5 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            row.kind === "revealed"
                              ? "bg-[#113028] text-[#3ecf9a] border-[#3ecf9a]/30"
                              : "bg-[#34131c] text-[#ef7b93] border-[#ef7b93]/30"
                          }`}
                        >
                          {row.kind === "revealed" ? "Revealed" : "Denied"}
                        </span>
                        <span>{row.detail}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">
                        {row.ip ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTableCard>
        )}
      </div>
    </div>
  );
}
