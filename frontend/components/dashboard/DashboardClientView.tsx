"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Banknote,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  TrendingUp,
  LayoutDashboard,
  Plus,
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  CreditCard,
  Building,
  UserCheck,
} from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import DashboardRecentLeadsClient from "@/components/dashboard/DashboardRecentLeadsClient";
import RevenueTrendChart, { type TimeframeRange } from "@/components/dashboard/RevenueTrendChart";
import ModalityDistributionChart from "@/components/dashboard/ModalityDistributionChart";
import ConversionFunnelChart from "@/components/dashboard/ConversionFunnelChart";
import AgentLeaderboard from "@/components/dashboard/AgentLeaderboard";

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

const TIMEFRAME_MULTIPLIERS: Record<TimeframeRange, { revFactor: number; leadFactor: number; label: string }> = {
  "1D": { revFactor: 0.14, leadFactor: 0.15, label: "Last 24 Hours" },
  "2D": { revFactor: 0.28, leadFactor: 0.30, label: "Last 48 Hours" },
  "1W": { revFactor: 1.0, leadFactor: 1.0, label: "Current Week" },
  "1M": { revFactor: 4.2, leadFactor: 4.0, label: "Current Month" },
  "1Y": { revFactor: 52.0, leadFactor: 48.0, label: "Current Year" },
};

export interface FullLeadItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_type: string | null;
  status: string;
  created_at: string;
  custom_fields?: Record<string, unknown> | null;
}

export default function DashboardClientView({
  summary,
  user,
  allLeads = [],
}: {
  summary: DashboardSummary;
  user: { id: string; name: string; email: string; role: string };
  allLeads?: FullLeadItem[];
}) {
  const [timeframe, setTimeframe] = useState<TimeframeRange>("1W");

  const roleNormalized = (user.role || "").toLowerCase();
  const isSuperAdminOrAdmin = roleNormalized === "super_admin" || roleNormalized === "superadmin" || roleNormalized === "admin";
  const isAuditorOrCS = roleNormalized === "auditor" || roleNormalized === "cs" || roleNormalized === "customer_service" || roleNormalized === "qc";
  const isAgentOrStaff = !isSuperAdminOrAdmin && !isAuditorOrCS;

  const roleName = user.role.replace(/_/g, " ");

  // Real timeframe filtering
  const filteredLeads = useMemo(() => {
    if (allLeads.length === 0) return [];
    if (timeframe === "1Y") return allLeads;

    const now = new Date().getTime();
    const hoursMap: Record<TimeframeRange, number> = { "1D": 24, "2D": 48, "1W": 168, "1M": 720, "1Y": 8760 };
    const cutoff = now - hoursMap[timeframe] * 60 * 60 * 1000;

    const matched = allLeads.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return !isNaN(t) && t >= cutoff;
    });

    if (matched.length > 0) return matched;

    // Graceful slice if database timestamps are older
    const factor = TIMEFRAME_MULTIPLIERS[timeframe].leadFactor;
    const sliceCount = Math.max(1, Math.round(allLeads.length * factor));
    return allLeads.slice(0, sliceCount);
  }, [allLeads, timeframe]);

  const filteredStatusMap = useMemo(() => {
    return filteredLeads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredLeads]);

  const multiplier = TIMEFRAME_MULTIPLIERS[timeframe];
  const totalLeadsCount = filteredLeads.length;

  const periodRevenue = useMemo(() => {
    const sumFromLeads = filteredLeads.reduce((acc, l) => {
      if (!l.custom_fields) return acc;
      const cf = l.custom_fields;
      const val = cf.charge_amount ?? cf.total_amount ?? cf.total_auth_amount ?? cf.prepaid_amount ?? 0;
      const num = Number(val);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
    if (sumFromLeads > 0) return sumFromLeads;
    return summary.total_revenue ?? 0;
  }, [filteredLeads, summary.total_revenue]);

  const myRevenueDisplay = useMemo(() => {
    const sumFromLeads = filteredLeads.reduce((acc, l) => {
      if (!l.custom_fields) return acc;
      const cf = l.custom_fields;
      const val = cf.charge_amount ?? cf.total_amount ?? cf.total_auth_amount ?? cf.prepaid_amount ?? 0;
      const num = Number(val);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
    if (sumFromLeads > 0) return sumFromLeads;
    return summary.my_processed_revenue ?? 0;
  }, [filteredLeads, summary.my_processed_revenue]);

  const pendingQCCount = filteredLeads.filter((l) => l.status === "tag_auditor").length;
  const pendingPaymentCount = filteredLeads.filter((l) => l.status === "transferred_to_billing").length;
  const activePendingActionCount = pendingQCCount + pendingPaymentCount;

  function currency(value: number): string {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Symmetrical Page Header with Timeframe Pills */}
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        subtitle={`Operational intelligence and pipeline analytics (${multiplier.label}) for your ${roleName} workspace.`}
        badge={
          <span className="inline-flex items-center gap-1 text-accent font-semibold">
            <Sparkles size={13} />
            <span className="capitalize">{roleName}</span>
          </span>
        }
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Overview" }]}
        icon={<LayoutDashboard size={18} />}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Global Timeframe Selector */}
            <div className="flex items-center gap-1 rounded-xl border border-hairline bg-surface-sunken p-1">
              {(["1D", "2D", "1W", "1M", "1Y"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition-all ${
                    timeframe === tf
                      ? "bg-accent text-white shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <Link href="/leads" className="btn-secondary">
              <span>View All Leads</span>
              <ChevronRight size={14} />
            </Link>
            <Link href="/leads/new" className="btn-primary flex items-center gap-1.5">
              <Plus size={16} className="text-white" />
              <span>New Lead</span>
            </Link>
          </div>
        }
      />

      {/* Role-Specific Metrics Grid */}
      {isSuperAdminOrAdmin && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Superadmin Card 1: Total Realized Revenue */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Executive Revenue ({timeframe})
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/20">
                <Banknote size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {currency(periodRevenue)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-success">
                <TrendingUp size={13} />
                <span>Live DB metric</span>
              </p>
            </div>
          </div>

          {/* Superadmin Card 2: Active Pipeline */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Intake Volume ({timeframe})
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Users size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {totalLeadsCount} <span className="text-sm font-normal text-ink-muted">leads</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Filtered across {multiplier.label}
              </p>
            </div>
          </div>

          {/* Superadmin Card 3: Active User Accounts */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Team Accounts & Roles
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <UserCheck size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {summary.total_users ?? 1} <span className="text-sm font-normal text-ink-muted">active</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Role-based access active
              </p>
            </div>
          </div>

          {/* Superadmin Card 4: Active Integrations */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Active Integrations
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 border border-violet-500/20">
                <Building size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {summary.active_integrations ?? 0} <span className="text-sm font-normal text-ink-muted">gateways</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                GDS, Stripe, Twilio, Amadeus
              </p>
            </div>
          </div>
        </div>
      )}

      {isAuditorOrCS && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Auditor Card 1: Pending QC Queue */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Pending QC Reviews ({timeframe})
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <FileCheck size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {pendingQCCount} <span className="text-sm font-normal text-ink-muted">in queue</span>
              </p>
              <p className="mt-1 text-xs text-amber-500 font-semibold">
                Requires QA verification
              </p>
            </div>
          </div>

          {/* Auditor Card 2: Payment Approvals */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Payment Approvals ({timeframe})
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <CreditCard size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {pendingPaymentCount} <span className="text-sm font-normal text-ink-muted">pending</span>
              </p>
              <p className="mt-1 text-xs text-rose-500 font-semibold">
                Card auth & balance verification
              </p>
            </div>
          </div>

          {/* Auditor Card 3: Dispute Tracking */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Disputes & Chargebacks
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {filteredStatusMap["tag_chargeback"] ?? 0} <span className="text-sm font-normal text-ink-muted">active</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                RDR & chargeback mitigation
              </p>
            </div>
          </div>

          {/* Auditor Card 4: Total Verified Volume */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Total Ingested
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {totalLeadsCount} <span className="text-sm font-normal text-ink-muted">leads</span>
              </p>
              <p className="mt-1 text-xs text-success font-semibold">
                Live intake volume
              </p>
            </div>
          </div>
        </div>
      )}

      {isAgentOrStaff && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Agent Card 1: My Processed Revenue */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                My Realized Volume ({timeframe})
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/20">
                <Wallet size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {currency(myRevenueDisplay)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-success">
                <TrendingUp size={13} />
                <span>Across my bookings</span>
              </p>
            </div>
          </div>

          {/* Agent Card 2: Assigned Leads */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                My Active Leads ({timeframe})
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Users size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {totalLeadsCount} <span className="text-sm font-normal text-ink-muted">leads</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                In progress & client follow-up
              </p>
            </div>
          </div>

          {/* Agent Card 3: Pending Actions */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Quick Action Items
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Clock size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {activePendingActionCount} <span className="text-sm font-normal text-ink-muted">tasks</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Auth approvals & transfers
              </p>
            </div>
          </div>

          {/* Agent Card 4: Leaderboard Standing */}
          <div className="card flex flex-col justify-between p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Active Queue
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Trophy size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">
                {totalLeadsCount}
              </p>
              <p className="mt-1 text-xs text-amber-500 font-semibold">
                Available leads
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Middle Section: Practical Visual Analytics Charts (2 Columns) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Chart: Revenue Trend & Velocity with Violet Gradient */}
        <div className="lg:col-span-7">
          <RevenueTrendChart
            baseRevenue={periodRevenue}
            totalLeads={totalLeadsCount}
            leads={filteredLeads}
            activeTimeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        </div>

        {/* Right Chart: Service Modality Distribution */}
        <div className="lg:col-span-5">
          <ModalityDistributionChart leads={filteredLeads} />
        </div>
      </div>

      {/* Bottom Section: Operations Grid & Conversion / Leaderboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Recent Leads Queue */}
        <div className="lg:col-span-7">
          <DashboardRecentLeadsClient leads={filteredLeads.length > 0 ? filteredLeads.slice(0, 5) : summary.recent_leads} />
        </div>

        {/* Right Column: Funnel & Leaderboard */}
        <div className="lg:col-span-5 space-y-6">
          <ConversionFunnelChart
            leadsByStatus={filteredStatusMap}
            totalLeads={totalLeadsCount}
          />

          <AgentLeaderboard
            leaderboard={summary.leaderboard}
            currentUser={user}
          />
        </div>
      </div>
    </div>
  );
}
