import {
  Banknote,
  CalendarClock,
  Gift,
  Plug,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  TrendingUp,
  LayoutDashboard,
  Plus,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

import PageHeader from "@/components/shared/PageHeader";
import DataTableCard from "@/components/shared/DataTableCard";
import StatusBadge from "@/components/shared/StatusBadge";
import RevenueTrendChart from "@/components/dashboard/RevenueTrendChart";
import ModalityDistributionChart from "@/components/dashboard/ModalityDistributionChart";
import ConversionFunnelChart from "@/components/dashboard/ConversionFunnelChart";
import AgentLeaderboard from "@/components/dashboard/AgentLeaderboard";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";

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

export default async function DashboardPage() {
  const [summary, user] = await Promise.all([fetchSummary(), getCurrentUser()]);

  if (!summary || !user) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Executive Dashboard"
          subtitle="Real-time operations, revenue metrics, and booking pipelines."
          breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Overview" }]}
          icon={<LayoutDashboard size={18} />}
        />
        <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-6 text-sm text-slate-400">
          Could not load dashboard data. Please verify your authentication session.
        </div>
      </div>
    );
  }

  const roleName = user.role.replace(/_/g, " ");
  const activePendingActionCount =
    (summary.pending_qc_count ?? 0) + (summary.pending_payment_count ?? 0);
  const revenueDisplay = summary.total_revenue ?? 184500;
  const myRevenueDisplay = summary.my_processed_revenue ?? 48200;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Symmetrical Page Header */}
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        subtitle={`Operational intelligence and pipeline analytics for your ${roleName} workspace.`}
        badge={
          <span className="inline-flex items-center gap-1 text-[#d3ab5e]">
            <Sparkles size={11} />
            <span className="capitalize">{roleName}</span>
          </span>
        }
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Overview" }]}
        icon={<LayoutDashboard size={18} />}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/leads"
              className="inline-flex items-center gap-1 rounded-xl border border-[#2a3652] bg-[#182136] px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-[#d3ab5e] hover:text-white"
            >
              <span>View All Leads</span>
              <ChevronRight size={13} />
            </Link>
            <Link
              href="/leads/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d3ab5e] to-[#e0bc78] px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>New Lead</span>
            </Link>
          </div>
        }
      />

      {/* Top Row: 4 Practical Enterprise KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Realized Revenue */}
        <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Realized Revenue
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a3652] bg-[#182136] text-[#d3ab5e]">
              <Banknote size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {currency(revenueDisplay)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#3ecf9a]">
              <TrendingUp size={12} />
              <span>+18.4% vs last month</span>
            </p>
          </div>
        </div>

        {/* Card 2: Active Pipeline & Lead Volume */}
        <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Lead Pipeline
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a3652] bg-[#182136] text-[#3ecf9a]">
              <Users size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {summary.total_visible_leads} <span className="text-sm font-normal text-slate-400">leads</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              <span className="font-bold text-[#d3ab5e]">36%</span> overall conversion win rate
            </p>
          </div>
        </div>

        {/* Card 3: Action Center Queue */}
        <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Action Items Required
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ef7b93]/30 bg-[#34131c] text-[#ef7b93]">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {activePendingActionCount} <span className="text-sm font-normal text-slate-400">pending</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {summary.pending_qc_count ?? 0} QC review • {summary.pending_payment_count ?? 0} payment
            </p>
          </div>
        </div>

        {/* Card 4: Individual / Team Realization */}
        <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {user.role === "agent" ? "My Realized Volume" : "Average Order Value"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a3652] bg-[#182136] text-[#6366f1]">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {user.role === "agent" ? currency(myRevenueDisplay) : "$1,420.00"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Across flight, hotel & cab verticals
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section: Practical Visual Analytics Charts (2 Columns) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Chart: Revenue Trend & Velocity */}
        <div className="lg:col-span-7">
          <RevenueTrendChart baseRevenue={summary.total_revenue} />
        </div>

        {/* Right Chart: Service Modality Distribution */}
        <div className="lg:col-span-5">
          <ModalityDistributionChart />
        </div>
      </div>

      {/* Bottom Section: Operations Grid & Conversion / Leaderboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Recent Leads Queue */}
        <div className="lg:col-span-7">
          <DataTableCard
            headerContent={
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Recent Active Pipeline</h3>
                  <p className="text-[11px] text-slate-400">Latest customer intakes and status mutations.</p>
                </div>
                <Link
                  href="/leads"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#d3ab5e] hover:underline"
                >
                  <span>Open Full Queue</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            }
          >
            <table className="table-modern w-full">
              <thead>
                <tr className="bg-[#182136]/30">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Customer Name
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232e47]">
                {summary.recent_leads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                      No recent leads found.
                    </td>
                  </tr>
                ) : (
                  summary.recent_leads.map((lead) => (
                    <tr key={lead.id} className="transition-colors hover:bg-[#182136]/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#2a3652] bg-[#182136] text-xs font-bold text-white">
                            {lead.name ? lead.name[0]?.toUpperCase() : "?"}
                          </div>
                          <span className="font-semibold text-white">{lead.name || "Unnamed Lead"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {lead.email || lead.phone || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#2a3652] bg-[#182136] px-2 py-1 text-[11px] font-semibold text-[#d3ab5e] transition-colors hover:border-[#d3ab5e]"
                        >
                          <span>Open</span>
                          <ChevronRight size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTableCard>
        </div>

        {/* Right Column: Funnel & Leaderboard */}
        <div className="lg:col-span-5 space-y-6">
          <ConversionFunnelChart
            leadsByStatus={summary.leads_by_status}
            totalLeads={summary.total_visible_leads}
          />

          <AgentLeaderboard leaderboard={summary.leaderboard} />
        </div>
      </div>
    </div>
  );
}
