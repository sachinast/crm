"use client";

import React, { useState, useMemo } from "react";
import { TrendingUp, BarChart3 } from "lucide-react";

export type TimeframeRange = "1D" | "2D" | "1W" | "1M" | "1Y";

export interface TrendLead {
  id?: string;
  created_at: string;
  status: string;
  custom_fields?: Record<string, unknown> | null;
}

interface TrendPoint {
  label: string;
  revenue: number;
  leads: number;
}

function getLeadAmount(lead: TrendLead): number {
  if (!lead.custom_fields) return 0;
  const cf = lead.custom_fields;
  const val = cf.charge_amount ?? cf.total_amount ?? cf.total_auth_amount ?? cf.prepaid_amount ?? 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

export default function RevenueTrendChart({
  leads = [],
  activeTimeframe = "1W",
  onTimeframeChange,
}: {
  baseRevenue?: number | null;
  totalLeads?: number;
  leads?: TrendLead[];
  activeTimeframe?: TimeframeRange;
  onTimeframeChange?: (tf: TimeframeRange) => void;
}) {
  const [localRange, setLocalRange] = useState<TimeframeRange>("1W");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const range = onTimeframeChange ? activeTimeframe : localRange;
  const setRange = (r: TimeframeRange) => {
    setLocalRange(r);
    onTimeframeChange?.(r);
  };

  // Real grouping algorithm based on actual timestamps of leads in this timeframe
  const data: TrendPoint[] = useMemo(() => {
    if (range === "1D") {
      const slots = [
        { label: "00:00", startHour: 0, endHour: 4, leads: 0, revenue: 0 },
        { label: "04:00", startHour: 4, endHour: 8, leads: 0, revenue: 0 },
        { label: "08:00", startHour: 8, endHour: 12, leads: 0, revenue: 0 },
        { label: "12:00", startHour: 12, endHour: 16, leads: 0, revenue: 0 },
        { label: "16:00", startHour: 16, endHour: 20, leads: 0, revenue: 0 },
        { label: "20:00", startHour: 20, endHour: 24, leads: 0, revenue: 0 },
      ];
      leads.forEach((l) => {
        const dt = new Date(l.created_at);
        if (isNaN(dt.getTime())) return;
        const hr = dt.getHours();
        const slot = slots.find((s) => hr >= s.startHour && hr < s.endHour) || slots[slots.length - 1];
        slot.leads += 1;
        slot.revenue += getLeadAmount(l);
      });
      return slots.map(({ label, leads, revenue }) => ({ label, leads, revenue }));
    }

    if (range === "2D") {
      const now = new Date();
      const todayDate = now.getDate();
      const slots = [
        { label: "Yesterday AM", isToday: false, isAM: true, leads: 0, revenue: 0 },
        { label: "Yesterday PM", isToday: false, isAM: false, leads: 0, revenue: 0 },
        { label: "Today AM", isToday: true, isAM: true, leads: 0, revenue: 0 },
        { label: "Today PM", isToday: true, isAM: false, leads: 0, revenue: 0 },
      ];
      leads.forEach((l) => {
        const dt = new Date(l.created_at);
        if (isNaN(dt.getTime())) return;
        const isToday = dt.getDate() === todayDate;
        const isAM = dt.getHours() < 12;
        const slot = slots.find((s) => s.isToday === isToday && s.isAM === isAM) || slots[0];
        slot.leads += 1;
        slot.revenue += getLeadAmount(l);
      });
      return slots.map(({ label, leads, revenue }) => ({ label, leads, revenue }));
    }

    if (range === "1M") {
      const slots = [
        { label: "Week 1", startDay: 1, endDay: 7, leads: 0, revenue: 0 },
        { label: "Week 2", startDay: 8, endDay: 14, leads: 0, revenue: 0 },
        { label: "Week 3", startDay: 15, endDay: 21, leads: 0, revenue: 0 },
        { label: "Week 4", startDay: 22, endDay: 31, leads: 0, revenue: 0 },
      ];
      leads.forEach((l) => {
        const dt = new Date(l.created_at);
        if (isNaN(dt.getTime())) return;
        const day = dt.getDate();
        const slot = slots.find((s) => day >= s.startDay && day <= s.endDay) || slots[slots.length - 1];
        slot.leads += 1;
        slot.revenue += getLeadAmount(l);
      });
      return slots.map(({ label, leads, revenue }) => ({ label, leads, revenue }));
    }

    if (range === "1Y") {
      const slots = [
        { label: "Q1 (Jan-Mar)", startMonth: 0, endMonth: 2, leads: 0, revenue: 0 },
        { label: "Q2 (Apr-Jun)", startMonth: 3, endMonth: 5, leads: 0, revenue: 0 },
        { label: "Q3 (Jul-Sep)", startMonth: 6, endMonth: 8, leads: 0, revenue: 0 },
        { label: "Q4 (Oct-Dec)", startMonth: 9, endMonth: 11, leads: 0, revenue: 0 },
      ];
      leads.forEach((l) => {
        const dt = new Date(l.created_at);
        if (isNaN(dt.getTime())) return;
        const m = dt.getMonth();
        const slot = slots.find((s) => m >= s.startMonth && m <= s.endMonth) || slots[slots.length - 1];
        slot.leads += 1;
        slot.revenue += getLeadAmount(l);
      });
      return slots.map(({ label, leads, revenue }) => ({ label, leads, revenue }));
    }

    // Default 1W: Group Mon-Sun
    const daysMap = [
      { label: "Sun", dayIdx: 0, leads: 0, revenue: 0 },
      { label: "Mon", dayIdx: 1, leads: 0, revenue: 0 },
      { label: "Tue", dayIdx: 2, leads: 0, revenue: 0 },
      { label: "Wed", dayIdx: 3, leads: 0, revenue: 0 },
      { label: "Thu", dayIdx: 4, leads: 0, revenue: 0 },
      { label: "Fri", dayIdx: 5, leads: 0, revenue: 0 },
      { label: "Sat", dayIdx: 6, leads: 0, revenue: 0 },
    ];
    leads.forEach((l) => {
      const dt = new Date(l.created_at);
      if (isNaN(dt.getTime())) return;
      const d = dt.getDay();
      const slot = daysMap.find((s) => s.dayIdx === d);
      if (slot) {
        slot.leads += 1;
        slot.revenue += getLeadAmount(l);
      }
    });

    // Order Monday to Sunday
    const ordered = [daysMap[1], daysMap[2], daysMap[3], daysMap[4], daysMap[5], daysMap[6], daysMap[0]];
    return ordered.map(({ label, leads, revenue }) => ({ label, leads, revenue }));
  }, [range, leads]);

  const totalPeriodRevenue = useMemo(() => leads.reduce((acc, l) => acc + getLeadAmount(l), 0), [leads]);
  const totalPeriodLeads = leads.length;

  const maxLeadCount = Math.max(...data.map((d) => d.leads), 1);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="card space-y-4">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-violet-500" />
            <h3 className="text-sm font-bold text-ink">Revenue & Pipeline Velocity</h3>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            Live database booking volume and intake velocity trends.
          </p>
        </div>

        {/* Timeframe Filter Pills */}
        <div className="flex items-center gap-1 rounded-xl border border-hairline bg-surface-sunken p-1">
          {(["1D", "2D", "1W", "1M", "1Y"] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r);
                setHoveredIndex(null);
              }}
              className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition-all ${
                range === r
                  ? "bg-violet-600 text-white shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 gap-3 border-y border-hairline py-3 sm:grid-cols-3">
        <div>
          <span className="text-xs font-semibold text-ink-muted">Period Revenue</span>
          <p className="mt-0.5 text-lg font-extrabold text-ink font-mono">
            ${totalPeriodRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <span className="text-xs font-semibold text-ink-muted">Intake Volume</span>
          <p className="mt-0.5 text-lg font-extrabold text-violet-500 font-mono">
            {totalPeriodLeads} leads
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-ink-muted">Active Pipeline</span>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-success">
            <TrendingUp size={14} />
            <span>100% Real DB Records</span>
          </p>
        </div>
      </div>

      {/* Interactive SVG Bar & Trend Graph with Violet Shading */}
      <div className="relative pt-2">
        <div className="flex h-44 items-end gap-2 sm:gap-3">
          {data.map((point, i) => {
            // Height based on real lead counts in this time bucket
            const heightPct = point.leads > 0 
              ? Math.max(18, Math.round((point.leads / maxLeadCount) * 100))
              : 8;
            const isHovered = hoveredIndex === i;

            return (
              <div
                key={point.label}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
              >
                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute -top-12 z-20 whitespace-nowrap rounded-xl border border-violet-500/40 bg-surface-sunken px-3 py-1 text-center shadow-lg pointer-events-none animate-fadeIn">
                    <p className="text-xs font-bold text-ink font-mono">
                      {point.leads} bookings ({point.revenue > 0 ? `$${point.revenue.toFixed(2)}` : "Intake"})
                    </p>
                    <p className="text-[10px] text-violet-400 font-semibold">
                      {point.label}
                    </p>
                  </div>
                )}

                {/* Vertical Bar with Violet Gradient Shading */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-lg transition-all duration-300 ${
                    isHovered
                      ? "bg-gradient-to-t from-violet-600/30 to-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                      : point.leads > 0
                        ? "bg-gradient-to-t from-violet-600/20 to-violet-500 group-hover:to-violet-400"
                        : "bg-surface-sunken opacity-40"
                  }`}
                />

                {/* X-Axis Label */}
                <span
                  className={`mt-2 text-[11px] font-mono font-semibold transition-colors text-center ${
                    isHovered ? "text-violet-400 font-bold" : "text-ink-muted"
                  }`}
                >
                  {point.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
