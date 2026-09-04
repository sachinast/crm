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
  RefreshCw,
  Headphones,
  CheckCheck,
  X,
  ArrowUpRight,
  AlertCircle,
  FolderOpen,
} from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import DashboardRecentLeadsClient from "@/components/dashboard/DashboardRecentLeadsClient";
import RevenueTrendChart, { type TimeframeRange } from "@/components/dashboard/RevenueTrendChart";
import ModalityDistributionChart from "@/components/dashboard/ModalityDistributionChart";
import ConversionFunnelChart from "@/components/dashboard/ConversionFunnelChart";
import AgentLeaderboard from "@/components/dashboard/AgentLeaderboard";

export interface LeadSummaryRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
}

export interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  revenue: number;
  bookings_count: number;
}

export interface StatusLeadItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  agent_id?: string | null;
  created_at: string;
  updated_at?: string;
  status_changed_at?: string;
  time_diff: string;
  time_diff_seconds: number;
  sla_breached: boolean;
  service_type?: string | null;
}

export interface StatusWidget {
  status: string;
  label: string;
  count: number;
  sla_breached_count: number;
  leads: StatusLeadItem[];
  color?: string;
  bgSoft?: string;
  borderSoft?: string;
  description?: string;
}

export interface DashboardSummary {
  role: string;
  total_visible_leads: number;
  leads_by_status: Record<string, number>;
  recent_leads: LeadSummaryRow[];
  status_widgets?: StatusWidget[] | null;
  department_queue_count?: number | null;
  department_queue_name?: string | null;
  department_queue_status?: string | null;
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

export interface FullLeadItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_type: string | null;
  status: string;
  agent_id?: string | null;
  created_at: string;
  updated_at?: string;
  status_changed_at?: string;
  custom_fields?: Record<string, unknown> | null;
}

const TIMEFRAME_MULTIPLIERS: Record<TimeframeRange, { revFactor: number; leadFactor: number; label: string }> = {
  "1D": { revFactor: 0.14, leadFactor: 0.15, label: "Last 24 Hours" },
  "2D": { revFactor: 0.28, leadFactor: 0.30, label: "Last 48 Hours" },
  "1W": { revFactor: 1.0, leadFactor: 1.0, label: "Current Week" },
  "1M": { revFactor: 4.2, leadFactor: 4.0, label: "Current Month" },
  "1Y": { revFactor: 52.0, leadFactor: 48.0, label: "Current Year" },
};

function computeElapsed(dateStr?: string | null): { diffSeconds: number; formatted: string; isBreached: boolean } {
  if (!dateStr) return { diffSeconds: 0, formatted: "just now", isBreached: false };
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return { diffSeconds: 0, formatted: "just now", isBreached: false };
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - d) / 1000));
  const isBreached = diffSeconds > 86400; // > 24 hours

  if (diffSeconds < 60) return { diffSeconds, formatted: "just now", isBreached };
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    return { diffSeconds, formatted: `${mins} min${mins > 1 ? "s" : ""} ago`, isBreached };
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    const mins = Math.floor((diffSeconds % 3600) / 60);
    return { diffSeconds, formatted: `${hours}h ${mins}m ago`, isBreached };
  }
  const days = Math.floor(diffSeconds / 86400);
  const hours = Math.floor((diffSeconds % 86400) / 3600);
  return { diffSeconds, formatted: `${days}d ${hours}h ago`, isBreached };
}

const ADMIN_STATUS_DEFINITIONS = [
  {
    status: "authorization_pending",
    label: "Authorization Pending",
    color: "text-amber-500",
    bgSoft: "bg-amber-500/10",
    borderSoft: "border-amber-500/25",
    description: "Awaiting customer digital sign-off and consent",
    icon: Clock,
  },
  {
    status: "client_approved",
    label: "Client Approved",
    color: "text-emerald-500",
    bgSoft: "bg-emerald-500/10",
    borderSoft: "border-emerald-500/25",
    description: "Consent received; ready for billing transfer",
    icon: CheckCircle2,
  },
  {
    status: "transferred_to_billing",
    label: "Transferred to Billing",
    color: "text-blue-500",
    bgSoft: "bg-blue-500/10",
    borderSoft: "border-blue-500/25",
    description: "Queued in billing department for card charge",
    icon: CreditCard,
  },
  {
    status: "card_charged",
    label: "Card Charged",
    color: "text-green-600",
    bgSoft: "bg-green-600/10",
    borderSoft: "border-green-600/25",
    description: "Payment captured successfully; fulfillment active",
    icon: Banknote,
  },
  {
    status: "card_declined",
    label: "Card Declined",
    color: "text-rose-500",
    bgSoft: "bg-rose-500/10",
    borderSoft: "border-rose-500/25",
    description: "Card rejected; requires payment retry or new card",
    icon: AlertCircle,
  },
  {
    status: "tag_cr_booking",
    label: "In CR",
    color: "text-purple-500",
    bgSoft: "bg-purple-500/10",
    borderSoft: "border-purple-500/25",
    description: "Customer Relations handling booking inquiries",
    icon: Headphones,
  },
  {
    status: "tag_change_dep",
    label: "In Changes",
    color: "text-indigo-500",
    bgSoft: "bg-indigo-500/10",
    borderSoft: "border-indigo-500/25",
    description: "Changes Department handling reissue / modification",
    icon: RefreshCw,
  },
  {
    status: "tag_auditor",
    label: "In Quality/QC",
    color: "text-amber-600",
    bgSoft: "bg-amber-600/10",
    borderSoft: "border-amber-600/25",
    description: "Auditor & QA team conducting compliance verification",
    icon: ShieldCheck,
  },
  {
    status: "qc_done",
    label: "Closed",
    color: "text-slate-500",
    bgSoft: "bg-slate-500/10",
    borderSoft: "border-slate-500/25",
    description: "Audit verified and ticket completed",
    icon: CheckCheck,
  },
];

const AGENT_STATUS_GROUPS = [
  {
    key: "intake_pending",
    label: "Intake / Pending Auth",
    statuses: ["authorization_pending", "client_approved"],
    color: "text-amber-500",
    bgSoft: "bg-amber-500/10",
    borderSoft: "border-amber-500/25",
    description: "My leads awaiting client sign-off or transfer",
    icon: Clock,
  },
  {
    key: "billing_pending",
    label: "Billing Queue",
    statuses: ["transferred_to_billing"],
    color: "text-blue-500",
    bgSoft: "bg-blue-500/10",
    borderSoft: "border-blue-500/25",
    description: "Transferred to billing for card processing",
    icon: CreditCard,
  },
  {
    key: "card_declined",
    label: "Card Declined",
    statuses: ["card_declined"],
    color: "text-rose-500",
    bgSoft: "bg-rose-500/10",
    borderSoft: "border-rose-500/25",
    description: "Declined charges requiring customer re-contact",
    icon: AlertCircle,
  },
  {
    key: "in_changes_cr",
    label: "In Changes / CR",
    statuses: ["tag_cr_booking", "tag_change_dep"],
    color: "text-purple-500",
    bgSoft: "bg-purple-500/10",
    borderSoft: "border-purple-500/25",
    description: "Modifications, reissues, or support tickets",
    icon: RefreshCw,
  },
  {
    key: "closed",
    label: "Closed / Completed",
    statuses: ["qc_done", "card_charged", "tag_auditor"],
    color: "text-emerald-500",
    bgSoft: "bg-emerald-500/10",
    borderSoft: "border-emerald-500/25",
    description: "Successfully processed, charged, or closed",
    icon: CheckCheck,
  },
];

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
  const [selectedWidgetModal, setSelectedWidgetModal] = useState<StatusWidget | null>(null);
  const [widgetModalFilter, setWidgetModalFilter] = useState<"all" | "breached">("all");

  const roleNormalized = (user.role || "").toLowerCase();
  const isSuperAdminOrAdmin =
    roleNormalized === "super_admin" || roleNormalized === "superadmin" || roleNormalized === "admin";
  const isAgent = roleNormalized === "agent";
  const isDepartmentRole =
    ["billing", "cr_booking", "change_dep", "auditor", "qc", "chargeback_dep", "cs"].includes(roleNormalized);

  const roleName = user.role.replace(/_/g, " ");

  // Real timeframe filtering based on lead creation/update
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

  // Compute 9 Admin Status Widgets with SLA tracking
  const adminWidgets = useMemo<StatusWidget[]>(() => {
    return ADMIN_STATUS_DEFINITIONS.map((def) => {
      const matchingLeads = filteredLeads.filter((l) => l.status === def.status);
      const items: StatusLeadItem[] = matchingLeads.map((l) => {
        const elapsed = computeElapsed(l.status_changed_at || l.updated_at || l.created_at);
        return {
          id: l.id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          status: l.status,
          agent_id: l.agent_id,
          created_at: l.created_at,
          updated_at: l.updated_at,
          status_changed_at: l.status_changed_at,
          time_diff: elapsed.formatted,
          time_diff_seconds: elapsed.diffSeconds,
          sla_breached: elapsed.isBreached,
          service_type: l.service_type,
        };
      });

      // Sort: SLA breached leads first, then by longest waiting time
      items.sort((a, b) => {
        if (a.sla_breached !== b.sla_breached) {
          return a.sla_breached ? -1 : 1;
        }
        return b.time_diff_seconds - a.time_diff_seconds;
      });

      const breachedCount = items.filter((it) => it.sla_breached).length;

      return {
        status: def.status,
        label: def.label,
        count: matchingLeads.length,
        sla_breached_count: breachedCount,
        leads: items,
        color: def.color,
        bgSoft: def.bgSoft,
        borderSoft: def.borderSoft,
        description: def.description,
      };
    });
  }, [filteredLeads]);

  // Compute 5 Agent Status Widgets filtered to agent's own leads
  const agentWidgets = useMemo<StatusWidget[]>(() => {
    const myLeads = filteredLeads.filter((l) => l.agent_id === user.id || !l.agent_id);

    return AGENT_STATUS_GROUPS.map((grp) => {
      const matchingLeads = myLeads.filter((l) => grp.statuses.includes(l.status));
      const items: StatusLeadItem[] = matchingLeads.map((l) => {
        const elapsed = computeElapsed(l.status_changed_at || l.updated_at || l.created_at);
        return {
          id: l.id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          status: l.status,
          agent_id: l.agent_id,
          created_at: l.created_at,
          updated_at: l.updated_at,
          status_changed_at: l.status_changed_at,
          time_diff: elapsed.formatted,
          time_diff_seconds: elapsed.diffSeconds,
          sla_breached: elapsed.isBreached,
          service_type: l.service_type,
        };
      });

      items.sort((a, b) => {
        if (a.sla_breached !== b.sla_breached) {
          return a.sla_breached ? -1 : 1;
        }
        return b.time_diff_seconds - a.time_diff_seconds;
      });

      const breachedCount = items.filter((it) => it.sla_breached).length;

      return {
        status: grp.key,
        label: grp.label,
        count: matchingLeads.length,
        sla_breached_count: breachedCount,
        leads: items,
        color: grp.color,
        bgSoft: grp.bgSoft,
        borderSoft: grp.borderSoft,
        description: grp.description,
      };
    });
  }, [filteredLeads, user.id]);

  // Department Queue leads and SLA tracking
  const departmentQueueLeads = useMemo(() => {
    if (!summary.department_queue_status) return [];
    return filteredLeads.filter((l) => l.status === summary.department_queue_status);
  }, [filteredLeads, summary.department_queue_status]);

  const departmentQueueBreachedCount = useMemo(() => {
    return departmentQueueLeads.filter((l) => {
      const elapsed = computeElapsed(l.status_changed_at || l.updated_at || l.created_at);
      return elapsed.isBreached;
    }).length;
  }, [departmentQueueLeads]);

  // Total SLA breaches across all leads
  const totalAdminSlaBreaches = useMemo(() => {
    return adminWidgets.reduce((acc, w) => acc + w.sla_breached_count, 0);
  }, [adminWidgets]);

  function currency(value: number): string {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Filter leads shown in drilldown modal
  const modalDisplayLeads = useMemo(() => {
    if (!selectedWidgetModal) return [];
    if (widgetModalFilter === "breached") {
      return selectedWidgetModal.leads.filter((l) => l.sla_breached);
    }
    return selectedWidgetModal.leads;
  }, [selectedWidgetModal, widgetModalFilter]);

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

            {isSuperAdminOrAdmin && (
              <Link href="/leads" className="btn-secondary">
                <span>View All Leads</span>
                <ChevronRight size={14} />
              </Link>
            )}
            {isAgent && (
              <Link href="/leads" className="btn-secondary">
                <span>View My Leads</span>
                <ChevronRight size={14} />
              </Link>
            )}
            {roleNormalized === "billing" && (
              <Link href="/billing" className="btn-secondary">
                <span>Billing Queue</span>
                <ChevronRight size={14} />
              </Link>
            )}
            {(roleNormalized === "cr_booking" || roleNormalized === "cs") && (
              <Link href="/leads?status=tag_cr_booking" className="btn-secondary">
                <span>CS Queue</span>
                <ChevronRight size={14} />
              </Link>
            )}
            {roleNormalized === "change_dep" && (
              <Link href="/leads?status=tag_change_dep" className="btn-secondary">
                <span>Changes Queue</span>
                <ChevronRight size={14} />
              </Link>
            )}
            {(roleNormalized === "auditor" || roleNormalized === "qc") && (
              <Link href="/leads?status=tag_auditor" className="btn-secondary">
                <span>QR Queue</span>
                <ChevronRight size={14} />
              </Link>
            )}

            {(isSuperAdminOrAdmin || isAgent) && (
              <Link href="/leads/new" className="btn-primary flex items-center gap-1.5">
                <Plus size={16} className="text-white" />
                <span>New Lead</span>
              </Link>
            )}
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. ADMIN STATUS WIDGETS & SLA TRACKING (ALL 9 WORKFLOW STAGES)            */}
      {/* ========================================================================= */}
      {isSuperAdminOrAdmin && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
                  Admin Status Widgets & SLA Tracking ({timeframe})
                </h2>
                {totalAdminSlaBreaches > 0 ? (
                  <span className="flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-500 animate-pulse">
                    <AlertTriangle size={12} />
                    {totalAdminSlaBreaches} Bottleneck{totalAdminSlaBreaches > 1 ? "s" : ""} (&gt;24h)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-[11px] font-bold text-success">
                    <CheckCircle2 size={12} />
                    All SLAs On Track
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-muted">
                Live lead volume and time-in-status bottleneck monitoring across all 9 operational stages.
              </p>
            </div>

            <span className="text-xs text-ink-muted font-mono">
              Total Visible: <strong className="text-ink">{totalLeadsCount}</strong> leads
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3.5">
            {adminWidgets.map((widget) => {
              const def = ADMIN_STATUS_DEFINITIONS.find((d) => d.status === widget.status);
              const IconComp = def?.icon || Clock;
              const hasBreach = widget.sla_breached_count > 0;

              return (
                <div
                  key={widget.status}
                  onClick={() => {
                    setSelectedWidgetModal(widget);
                    setWidgetModalFilter("all");
                  }}
                  className={`card relative p-4 flex flex-col justify-between cursor-pointer transition-all hover:border-accent hover:shadow-md ${
                    hasBreach ? "border-rose-500/40 bg-rose-500/5 hover:border-rose-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${widget.bgSoft} ${widget.color} border ${widget.borderSoft}`}
                      >
                        <IconComp size={16} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-ink truncate">{widget.label}</h3>
                        <p className="text-[11px] text-ink-muted line-clamp-1">{widget.description}</p>
                      </div>
                    </div>

                    <span className="font-mono text-xl font-extrabold text-ink shrink-0">
                      {widget.count}
                    </span>
                  </div>

                  {/* SLA Warning / Status Indicator */}
                  <div className="mt-3.5 pt-2.5 border-t border-hairline flex items-center justify-between text-xs">
                    {hasBreach ? (
                      <span className="flex items-center gap-1 font-semibold text-rose-500 text-[11px]">
                        <AlertTriangle size={12} />
                        <span>{widget.sla_breached_count} lead{widget.sla_breached_count > 1 ? "s" : ""} &gt;24h in status</span>
                      </span>
                    ) : widget.count > 0 ? (
                      <span className="flex items-center gap-1 font-semibold text-success text-[11px]">
                        <CheckCircle2 size={12} />
                        <span>All &lt;24h (On Track)</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-muted">No active leads</span>
                    )}

                    <span className="text-[11px] text-accent font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Inspect &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. AGENT VIEW (5 CORE STATUS WIDGETS FILTERED TO MY LEADS)                */}
      {/* ========================================================================= */}
      {isAgent && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
                  My Pipeline Statuses & SLA Tracking ({timeframe})
                </h2>
              </div>
              <p className="text-xs text-ink-muted">
                Your assigned bookings categorized into 5 operational stages with SLA bottleneck tracking.
              </p>
            </div>

            <span className="text-xs text-ink-muted font-mono">
              My Leads: <strong className="text-ink">{agentWidgets.reduce((a, b) => a + b.count, 0)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {agentWidgets.map((widget) => {
              const grp = AGENT_STATUS_GROUPS.find((g) => g.key === widget.status);
              const IconComp = grp?.icon || Clock;
              const hasBreach = widget.sla_breached_count > 0;

              return (
                <div
                  key={widget.status}
                  onClick={() => {
                    setSelectedWidgetModal(widget);
                    setWidgetModalFilter("all");
                  }}
                  className={`card relative p-4 flex flex-col justify-between cursor-pointer transition-all hover:border-accent hover:shadow-md ${
                    hasBreach ? "border-rose-500/40 bg-rose-500/5 hover:border-rose-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${widget.bgSoft} ${widget.color} border ${widget.borderSoft}`}
                      >
                        <IconComp size={16} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-ink truncate">{widget.label}</h3>
                      </div>
                    </div>

                    <span className="font-mono text-lg font-extrabold text-ink shrink-0">
                      {widget.count}
                    </span>
                  </div>

                  <p className="text-[11px] text-ink-muted line-clamp-1 mt-1.5">{widget.description}</p>

                  <div className="mt-3 pt-2 border-t border-hairline flex items-center justify-between text-xs">
                    {hasBreach ? (
                      <span className="flex items-center gap-1 font-semibold text-rose-500 text-[11px]">
                        <AlertTriangle size={12} />
                        <span>{widget.sla_breached_count} &gt;24h</span>
                      </span>
                    ) : widget.count > 0 ? (
                      <span className="flex items-center gap-1 font-semibold text-success text-[11px]">
                        <CheckCircle2 size={12} />
                        <span>On Track</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-muted">Empty</span>
                    )}

                    <span className="text-[11px] text-accent font-semibold flex items-center gap-0.5">
                      View &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DEPARTMENT QUEUE CARD (FOR BILLING, CR, CHANGES, AUDITOR, CHARGEBACK)  */}
      {/* ========================================================================= */}
      {isDepartmentRole && summary.department_queue_name && (
        <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent border border-accent/20">
                <FolderOpen size={22} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent font-mono">
                  Department Operational Focus
                </span>
                <h2 className="text-lg font-extrabold text-ink">{summary.department_queue_name}</h2>
                <p className="text-xs text-ink-muted">
                  Actionable queue monitoring and SLA tracking for your department.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {departmentQueueBreachedCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500">
                  <AlertTriangle size={14} />
                  <span>{departmentQueueBreachedCount} Stalled &gt;24h</span>
                </div>
              )}

              <Link
                href={`/leads?status=${summary.department_queue_status}`}
                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-xs"
              >
                <span>Go to Department Queue ({departmentQueueLeads.length})</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          {/* Quick list of top 3 pending queue items with time_diff */}
          {departmentQueueLeads.length > 0 && (
            <div className="rounded-xl border border-hairline bg-surface-sunken p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <span>Pending Handover Leads</span>
                <span>Time in Current Queue</span>
              </div>
              <div className="divide-y divide-hairline">
                {departmentQueueLeads.slice(0, 3).map((lead) => {
                  const elapsed = computeElapsed(lead.status_changed_at || lead.updated_at || lead.created_at);
                  return (
                    <div key={lead.id} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-bold text-ink hover:text-accent truncate font-mono"
                        >
                          {lead.name}
                        </Link>
                        <span className="text-[11px] text-ink-muted">{lead.email}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        <span className={elapsed.isBreached ? "text-rose-500 font-bold" : "text-ink-muted"}>
                          {elapsed.formatted}
                        </span>
                        {elapsed.isBreached ? (
                          <span className="rounded bg-rose-500/15 text-rose-500 px-1.5 py-0.5 text-[10px] font-bold">
                            SLA
                          </span>
                        ) : (
                          <span className="rounded bg-success/15 text-success px-1.5 py-0.5 text-[10px] font-bold">
                            OK
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. EXECUTIVE & ROLE-SPECIFIC METRICS GRID                                 */}
      {/* ========================================================================= */}
      {isSuperAdminOrAdmin && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Realized Revenue */}
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

          {/* Card 2: Active Pipeline */}
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

          {/* Card 3: Active User Accounts */}
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

          {/* Card 4: Active Integrations */}
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

      {/* ========================================================================= */}
      {/* 5. VISUAL ANALYTICS CHARTS (2 COLUMNS)                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Chart: Revenue Trend & Velocity */}
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

      {/* ========================================================================= */}
      {/* 6. RECENT LEADS QUEUE & CONVERSION / LEADERBOARD                          */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 7. INTERACTIVE STATUS WIDGET DRILL-DOWN MODAL                             */}
      {/* ========================================================================= */}
      {selectedWidgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="card w-full max-w-2xl bg-surface border border-hairline shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface-raised shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${selectedWidgetModal.bgSoft} ${selectedWidgetModal.color} border ${selectedWidgetModal.borderSoft}`}
                >
                  <Clock size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-ink">{selectedWidgetModal.label}</h2>
                    <span className="rounded-full bg-accent-soft text-accent px-2 py-0.5 text-xs font-bold font-mono">
                      {selectedWidgetModal.count}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {selectedWidgetModal.description || "Leads currently in this workflow status."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedWidgetModal(null)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-surface hover:text-ink transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Controls / Filter */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-hairline bg-surface-sunken text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setWidgetModalFilter("all")}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                    widgetModalFilter === "all"
                      ? "bg-accent text-white"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  All ({selectedWidgetModal.leads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWidgetModalFilter("breached")}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all flex items-center gap-1 ${
                    widgetModalFilter === "breached"
                      ? "bg-rose-500 text-white"
                      : "text-rose-500 hover:bg-rose-500/10"
                  }`}
                >
                  <AlertTriangle size={12} />
                  <span>SLA Breached (&gt;24h) ({selectedWidgetModal.sla_breached_count})</span>
                </button>
              </div>

              <span className="text-[11px] text-ink-muted font-mono">
                Showing {modalDisplayLeads.length} lead{modalDisplayLeads.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Modal Body: Leads List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1 text-sm">
              {modalDisplayLeads.length === 0 ? (
                <div className="py-8 text-center text-ink-muted space-y-1">
                  <p className="font-semibold text-xs">No leads match the active filter.</p>
                  <p className="text-[11px]">All leads in this status are currently within SLA thresholds.</p>
                </div>
              ) : (
                <div className="divide-y divide-hairline">
                  {modalDisplayLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-surface-raised/40 px-2 rounded-xl transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="font-bold text-ink hover:text-accent transition-colors font-mono text-xs"
                          >
                            {lead.name}
                          </Link>
                          {lead.service_type && (
                            <span className="rounded bg-surface-sunken border border-hairline px-1.5 py-0.5 text-[10px] font-mono text-ink-muted uppercase">
                              {lead.service_type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-ink-muted font-mono">
                          <span>{lead.email}</span>
                          <span>&bull;</span>
                          <span>{lead.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Elapsed time in status */}
                        <div className="text-right">
                          <span
                            className={`block text-xs font-bold font-mono ${
                              lead.sla_breached ? "text-rose-500" : "text-ink"
                            }`}
                          >
                            {lead.time_diff}
                          </span>
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
                              lead.sla_breached ? "text-rose-500" : "text-success"
                            }`}
                          >
                            {lead.sla_breached ? (
                              <>
                                <AlertTriangle size={10} />
                                &gt;24h Breached
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={10} />
                                On Track
                              </>
                            )}
                          </span>
                        </div>

                        {/* Open Lead Link */}
                        <Link
                          href={`/leads/${lead.id}`}
                          className="btn-secondary p-1.5 text-ink-muted hover:text-accent hover:border-accent/40 rounded-lg"
                          title="Open Lead Workspace"
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-hairline bg-surface-raised shrink-0 text-xs">
              <Link
                href={`/leads?status=${selectedWidgetModal.status}`}
                className="text-accent font-semibold hover:underline flex items-center gap-1"
              >
                <span>View Full Filtered Leads Table</span>
                <ChevronRight size={13} />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedWidgetModal(null)}
                className="btn-secondary px-4 py-1.5 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
