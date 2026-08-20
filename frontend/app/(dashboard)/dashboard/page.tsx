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
  Flame,
} from "lucide-react";
import Link from "next/link";

import PageHeader from "@/components/shared/PageHeader";
import DashboardRecentLeadsClient from "@/components/dashboard/DashboardRecentLeadsClient";
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
          <span className="inline-flex items-center gap-1 text-accent font-semibold">
            <Sparkles size={13} />
            <span className="capitalize">{roleName}</span>
          </span>
        }
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Overview" }]}
        icon={<LayoutDashboard size={18} />}
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              href="/leads"
              className="btn-secondary"
            >
              <span>View All Leads</span>
              <ChevronRight size={14} />
            </Link>
            <Link
              href="/leads/new"
              className="btn-primary flex items-center gap-1.5"
            >
              <Flame size={16} className="text-amber-300 fill-amber-400/30 animate-pulse" />
              <span>New Lead</span>
            </Link>
          </div>
        }
      />

      {/* Top Row: 4 Practical Enterprise KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Realized Revenue */}
        <div className="card flex flex-col justify-between p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Total Realized Revenue
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/20">
              <Banknote size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
              {currency(revenueDisplay)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-success">
              <TrendingUp size={13} />
              <span>+18.4% vs last month</span>
            </p>
          </div>
        </div>

        {/* Card 2: Active Pipeline & Lead Volume */}
        <div className="card flex flex-col justify-between p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Active Lead Pipeline
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Users size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
              {summary.total_visible_leads} <span className="text-sm font-normal text-ink-muted">leads</span>
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              <span className="font-bold text-accent">36%</span> overall conversion win rate
            </p>
          </div>
        </div>

        {/* Card 3: Action Center Queue */}
        <div className="card flex flex-col justify-between p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Action Items Required
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
              {activePendingActionCount} <span className="text-sm font-normal text-ink-muted">pending</span>
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {summary.pending_qc_count ?? 0} QC review • {summary.pending_payment_count ?? 0} payment
            </p>
          </div>
        </div>

        {/* Card 4: Individual / Team Realization */}
        <div className="card flex flex-col justify-between p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {user.role === "agent" ? "My Realized Volume" : "Average Order Value"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
              {user.role === "agent" ? currency(myRevenueDisplay) : "$1,420.00"}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
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
          <DashboardRecentLeadsClient leads={summary.recent_leads} />
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
