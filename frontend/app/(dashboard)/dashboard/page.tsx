import { Banknote, CalendarClock, Gift, Plug, ShieldCheck, Trophy, Users, Wallet } from "lucide-react";
import Link from "next/link";

import StatCard from "@/components/ui/StatCard";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { statusBadgeStyle } from "@/lib/status-colors";
import { formatStatus, STATUS_COLOR_HINTS } from "@/lib/status-meta";

interface LeadSummaryRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
}

interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  revenue: number;
  bookings_count: number;
}

interface DashboardSummary {
  role: string;
  total_visible_leads: number;
  leads_by_status: Record<string, number>;
  recent_leads: LeadSummaryRow[];
  pending_qc_count: number | null;
  pending_payment_count: number | null;
  my_processed_revenue: number | null;
  total_revenue: number | null;
  total_users: number | null;
  active_integrations: number | null;
  future_credits_issued_count: number | null;
  future_credits_total_value: number | null;
  leaderboard: LeaderboardEntry[] | null;
}

const MEDALS = ["🥇", "🥈", "🥉"];

async function fetchSummary(): Promise<DashboardSummary | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await apiFetch<DashboardSummary>("/dashboard/summary", { token });
  } catch {
    return null;
  }
}

function currency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const LEADS_LABEL_BY_ROLE: Record<string, string> = {
  agent: "My Leads",
  super_admin: "All Leads",
  admin: "All Leads",
  tl: "All Leads",
};

export default async function DashboardPage() {
  const [summary, user] = await Promise.all([fetchSummary(), getCurrentUser()]);

  if (!summary || !user) {
    return <p className="text-sm" style={{ color: "var(--ink-faint)" }}>Could not load dashboard.</p>;
  }

  const statusEntries = Object.entries(summary.leads_by_status).sort((a, b) => b[1] - a[1]);
  const leadsLabel = LEADS_LABEL_BY_ROLE[summary.role] ?? "Visible Leads";

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <p className="section-label">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          Here&apos;s what&apos;s relevant to your <span className="capitalize">{user.role.replace(/_/g, " ")}</span>{" "}
          role today.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label={leadsLabel} value={summary.total_visible_leads} icon={Users} accent />

        {summary.pending_qc_count !== null && (
          <StatCard label="Pending QC" value={summary.pending_qc_count} icon={ShieldCheck} />
        )}
        {summary.pending_payment_count !== null && (
          <StatCard label="Pending Payment" value={summary.pending_payment_count} icon={CalendarClock} />
        )}
        {summary.my_processed_revenue !== null && (
          <StatCard label="My Processed Revenue" value={currency(summary.my_processed_revenue)} icon={Wallet} />
        )}
        {summary.total_revenue !== null && (
          <StatCard label="Total Revenue" value={currency(summary.total_revenue)} icon={Banknote} accent />
        )}
        {summary.total_users !== null && (
          <StatCard label="Total Users" value={summary.total_users} icon={Users} />
        )}
        {summary.active_integrations !== null && (
          <StatCard label="Active Integrations" value={summary.active_integrations} icon={Plug} />
        )}
        {summary.future_credits_issued_count !== null && (
          <StatCard
            label="Future Credits Issued"
            value={summary.future_credits_issued_count}
            icon={Gift}
            hint={
              summary.future_credits_total_value !== null
                ? `${currency(summary.future_credits_total_value)} total value`
                : undefined
            }
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Leads by status</h2>
          {statusEntries.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
              Nothing in view yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {statusEntries.map(([status, count]) => {
                const style = statusBadgeStyle(STATUS_COLOR_HINTS[status] ?? "grey");
                const pct = Math.round((count / summary.total_visible_leads) * 100);
                return (
                  <li key={status}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="capitalize" style={{ color: "var(--ink-muted)" }}>
                        {formatStatus(status)}
                      </span>
                      <span className="font-medium" style={{ color: "var(--ink)" }}>
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--background)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: style.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent leads</h2>
            <Link href="/leads" className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              View all →
            </Link>
          </div>
          {summary.recent_leads.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
              No leads visible yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {summary.recent_leads.map((lead) => {
                const style = statusBadgeStyle(STATUS_COLOR_HINTS[lead.status] ?? "grey");
                return (
                  <li key={lead.id} className="border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--hairline)" }}>
                    <Link href={`/leads/${lead.id}`} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{lead.name}</p>
                        <p className="truncate text-xs" style={{ color: "var(--ink-faint)" }}>
                          {lead.email}
                        </p>
                      </div>
                      <span className="badge shrink-0" style={style}>
                        {formatStatus(lead.status)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {summary.leaderboard !== null && (
        <div className="card mt-6">
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={16} style={{ color: "var(--accent)" }} />
            <h2 className="text-sm font-semibold">Top 5 Performers</h2>
          </div>
          {summary.leaderboard.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
              No charged bookings yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {summary.leaderboard.map((entry, i) => (
                <li
                  key={entry.agent_id}
                  className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 shrink-0 text-center text-sm">{MEDALS[i] ?? `#${i + 1}`}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{entry.agent_name}</p>
                      <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                        {entry.bookings_count} {entry.bookings_count === 1 ? "booking" : "bookings"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold" style={{ color: "var(--accent)" }}>
                    {currency(entry.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
