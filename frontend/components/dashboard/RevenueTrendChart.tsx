"use client";

import React, { useState, useMemo } from "react";
import { TrendingUp, BarChart3, DollarSign, Users, Sparkles, Filter } from "lucide-react";

export type TimeframeRange = "1D" | "2D" | "1W" | "1M" | "1Y";

export interface TrendLead {
  id?: string;
  created_at: string;
  status: string;
  custom_fields?: Record<string, unknown> | null;
}

interface TrendPoint {
  label: string;
  fullLabel: string;
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
  const [activeMetric, setActiveMetric] = useState<"leads" | "revenue">("leads");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const range = onTimeframeChange ? activeTimeframe : localRange;
  const setRange = (r: TimeframeRange) => {
    setLocalRange(r);
    onTimeframeChange?.(r);
    setSelectedIndex(null);
  };

  // Real grouping algorithm based on actual timestamps of leads in this timeframe
  const data: TrendPoint[] = useMemo(() => {
    if (range === "1D") {
      const slots = [
        { label: "00:00", fullLabel: "12:00 AM - 04:00 AM", startHour: 0, endHour: 4, leads: 0, revenue: 0 },
        { label: "04:00", fullLabel: "04:00 AM - 08:00 AM", startHour: 4, endHour: 8, leads: 0, revenue: 0 },
        { label: "08:00", fullLabel: "08:00 AM - 12:00 PM", startHour: 8, endHour: 12, leads: 0, revenue: 0 },
        { label: "12:00", fullLabel: "12:00 PM - 04:00 PM", startHour: 12, endHour: 16, leads: 0, revenue: 0 },
        { label: "16:00", fullLabel: "04:00 PM - 08:00 PM", startHour: 16, endHour: 20, leads: 0, revenue: 0 },
        { label: "20:00", fullLabel: "08:00 PM - 12:00 AM", startHour: 20, endHour: 24, leads: 0, revenue: 0 },
      ];
      leads.forEach((l) => {
        const dt = new Date(l.created_at);
        if (isNaN(dt.getTime())) return;
        const hr = dt.getHours();
        const slot = slots.find((s) => hr >= s.startHour && hr < s.endHour) || slots[slots.length - 1];
        slot.leads += 1;
        slot.revenue += getLeadAmount(l);
      });
      return slots.map(({ label, fullLabel, leads, revenue }) => ({ label, fullLabel, leads, revenue }));
    }

    if (range === "2D") {
      const now = new Date();
      const todayDate = now.getDate();
      const slots = [
        { label: "Yest AM", fullLabel: "Yesterday Morning (12am - 12pm)", isToday: false, isAM: true, leads: 0, revenue: 0 },
        { label: "Yest PM", fullLabel: "Yesterday Afternoon (12pm - 12am)", isToday: false, isAM: false, leads: 0, revenue: 0 },
        { label: "Today AM", fullLabel: "Today Morning (12am - 12pm)", isToday: true, isAM: true, leads: 0, revenue: 0 },
        { label: "Today PM", fullLabel: "Today Afternoon (12pm - 12am)", isToday: true, isAM: false, leads: 0, revenue: 0 },
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
      return slots.map(({ label, fullLabel, leads, revenue }) => ({ label, fullLabel, leads, revenue }));
    }

    if (range === "1M") {
      const slots = [
        { label: "Week 1", fullLabel: "Days 1 - 7 of Month", startDay: 1, endDay: 7, leads: 0, revenue: 0 },
        { label: "Week 2", fullLabel: "Days 8 - 14 of Month", startDay: 8, endDay: 14, leads: 0, revenue: 0 },
        { label: "Week 3", fullLabel: "Days 15 - 21 of Month", startDay: 15, endDay: 21, leads: 0, revenue: 0 },
        { label: "Week 4", fullLabel: "Days 22 - End of Month", startDay: 22, endDay: 31, leads: 0, revenue: 0 },
      ];
      leads.forEach((l) => {
        const dt = new Date(l.created_at);
        if (isNaN(dt.getTime())) return;
        const day = dt.getDate();
        const slot = slots.find((s) => day >= s.startDay && day <= s.endDay) || slots[slots.length - 1];
        slot.leads += 1;
        slot.revenue += getLeadAmount(l);
      });
      return slots.map(({ label, fullLabel, leads, revenue }) => ({ label, fullLabel, leads, revenue }));
    }

    if (range === "1Y") {
      const slots = [
        { label: "Q1", fullLabel: "Quarter 1 (Jan - Mar)", startMonth: 0, endMonth: 2, leads: 0, revenue: 0 },
        { label: "Q2", fullLabel: "Quarter 2 (Apr - Jun)", startMonth: 3, endMonth: 5, leads: 0, revenue: 0 },
        { label: "Q3", fullLabel: "Quarter 3 (Jul - Sep)", startMonth: 6, endMonth: 8, leads: 0, revenue: 0 },
        { label: "Q4", fullLabel: "Quarter 4 (Oct - Dec)", startMonth: 9, endMonth: 11, leads: 0, revenue: 0 },
      ];
      leads.forEach((l) => {
        const dt = new Date(l.created_at);
        if (isNaN(dt.getTime())) return;
        const m = dt.getMonth();
        const slot = slots.find((s) => m >= s.startMonth && m <= s.endMonth) || slots[slots.length - 1];
        slot.leads += 1;
        slot.revenue += getLeadAmount(l);
      });
      return slots.map(({ label, fullLabel, leads, revenue }) => ({ label, fullLabel, leads, revenue }));
    }

    // Default 1W: Group Mon-Sun
    const daysMap = [
      { label: "Sun", fullLabel: "Sunday", dayIdx: 0, leads: 0, revenue: 0 },
      { label: "Mon", fullLabel: "Monday", dayIdx: 1, leads: 0, revenue: 0 },
      { label: "Tue", fullLabel: "Tuesday", dayIdx: 2, leads: 0, revenue: 0 },
      { label: "Wed", fullLabel: "Wednesday", dayIdx: 3, leads: 0, revenue: 0 },
      { label: "Thu", fullLabel: "Thursday", dayIdx: 4, leads: 0, revenue: 0 },
      { label: "Fri", fullLabel: "Friday", dayIdx: 5, leads: 0, revenue: 0 },
      { label: "Sat", fullLabel: "Saturday", dayIdx: 6, leads: 0, revenue: 0 },
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
    return ordered.map(({ label, fullLabel, leads, revenue }) => ({ label, fullLabel, leads, revenue }));
  }, [range, leads]);

  const totalPeriodRevenue = useMemo(() => leads.reduce((acc, l) => acc + getLeadAmount(l), 0), [leads]);
  const totalPeriodLeads = leads.length;

  const maxLeadCount = Math.max(...data.map((d) => d.leads), 1);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  // Active highlighted item (hovered or clicked)
  const focusedIndex = hoveredIndex !== null ? hoveredIndex : selectedIndex;
  const focusedPoint = focusedIndex !== null ? data[focusedIndex] : null;

  return (
    <div className="card space-y-4">
      {/* Chart Header & Interactive Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-accent" />
            <h3 className="text-sm font-bold text-ink">Revenue & Pipeline Velocity</h3>
            <span className="flex items-center gap-1 rounded-md border border-hairline bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold text-accent">
              <Sparkles size={11} className="text-accent" />
              <span>Interactive</span>
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            Hover or click bars to inspect period metrics and booking distributions.
          </p>
        </div>

        {/* Metric Mode Switcher & Timeframe Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector Pill (Leads vs Revenue) */}
          <div className="flex items-center gap-1 rounded-xl border border-hairline bg-surface-sunken p-1">
            <button
              type="button"
              onClick={() => setActiveMetric("leads")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                activeMetric === "leads"
                  ? "bg-accent text-white shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Users size={13} />
              <span>Leads</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric("revenue")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                activeMetric === "revenue"
                  ? "bg-accent text-white shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <DollarSign size={13} />
              <span>Revenue</span>
            </button>
          </div>

          {/* Timeframe Filter Pills */}
          <div className="flex items-center gap-1 rounded-xl border border-hairline bg-surface-sunken p-1">
            {(["1D", "2D", "1W", "1M", "1Y"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRange(r);
                  setHoveredIndex(null);
                }}
                className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition-all ${
                  range === r
                    ? "bg-accent text-white shadow-xs"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Interactive KPI Highlight Strip */}
      <div className="grid grid-cols-2 gap-3 border-y border-hairline py-3 sm:grid-cols-4 bg-surface-sunken/40 rounded-xl px-4">
        <div>
          <span className="text-xs font-semibold text-ink-muted">
            {focusedPoint ? `${focusedPoint.label} Revenue` : "Period Revenue"}
          </span>
          <p className="mt-0.5 text-base sm:text-lg font-extrabold text-ink font-mono">
            ${(focusedPoint ? focusedPoint.revenue : totalPeriodRevenue).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div>
          <span className="text-xs font-semibold text-ink-muted">
            {focusedPoint ? `${focusedPoint.label} Volume` : "Total Intake"}
          </span>
          <p className="mt-0.5 text-base sm:text-lg font-extrabold text-accent font-mono">
            {focusedPoint ? focusedPoint.leads : totalPeriodLeads} leads
          </p>
        </div>

        <div>
          <span className="text-xs font-semibold text-ink-muted">Share of Total</span>
          <p className="mt-0.5 text-base sm:text-lg font-extrabold text-ink font-mono">
            {focusedPoint && totalPeriodLeads > 0
              ? `${Math.round((focusedPoint.leads / totalPeriodLeads) * 100)}%`
              : "100%"}
          </p>
        </div>

        <div>
          <span className="text-xs font-semibold text-ink-muted">Status</span>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-success">
            <TrendingUp size={14} />
            <span>{focusedPoint ? "Focused Interval" : "Live DB Aggregate"}</span>
          </p>
        </div>
      </div>

      {/* Interactive Bar Chart Visualization with Theme Gradient & Glow */}
      <div className="relative pt-4 select-none">
        {/* Subtle Horizontal Reference Grid Lines */}
        <div className="absolute inset-x-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-dashed border-hairline-strong w-full" />
          <div className="border-b border-dashed border-hairline-strong w-full" />
          <div className="border-b border-dashed border-hairline-strong w-full" />
        </div>

        <div className="flex h-48 items-end gap-2 sm:gap-3.5 relative z-10 px-1">
          {data.map((point, i) => {
            const val = activeMetric === "revenue" ? point.revenue : point.leads;
            const maxVal = activeMetric === "revenue" ? maxRevenue : maxLeadCount;
            const isPeak = val > 0 && val === maxVal;

            const heightPct = val > 0
              ? Math.max(16, Math.round((val / maxVal) * 100))
              : 8;

            const isHovered = hoveredIndex === i;
            const isSelected = selectedIndex === i;
            const isActive = isHovered || isSelected;

            return (
              <div
                key={point.label}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setSelectedIndex(selectedIndex === i ? null : i)}
                className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer transition-transform"
              >
                {/* Floating Interactive Glassmorphism Tooltip */}
                {isActive && (
                  <div className="absolute -top-16 z-30 whitespace-nowrap rounded-2xl border border-hairline bg-surface/95 backdrop-blur-md px-3.5 py-2 text-center shadow-xl pointer-events-none animate-fadeIn scale-105 transition-all">
                    <p className="text-xs font-bold text-ink font-mono flex items-center justify-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                      <span>{point.leads} leads</span>
                      <span className="text-ink-muted">•</span>
                      <span>${point.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </p>
                    <p className="text-[10px] text-ink-muted font-medium mt-0.5">
                      {point.fullLabel} ({totalPeriodLeads > 0 ? Math.round((point.leads / totalPeriodLeads) * 100) : 0}% share)
                    </p>
                  </div>
                )}

                {/* Peak Indicator Tag */}
                {isPeak && !isActive && (
                  <span className="absolute -top-6 text-[10px] font-mono font-bold text-accent animate-bounce">
                    Peak
                  </span>
                )}

                {/* Vertical Interactive Bar Matching CRM Theme Colors */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-xl transition-all duration-300 ease-out transform ${
                    isActive
                      ? "bg-gradient-to-t from-accent/50 via-accent to-accent-hover shadow-[0_0_20px_var(--accent)] scale-y-105 ring-1 ring-accent"
                      : val > 0
                        ? "bg-gradient-to-t from-accent/25 via-accent/60 to-accent group-hover:from-accent/40 group-hover:to-accent-hover group-hover:shadow-[0_0_14px_var(--accent)]"
                        : "bg-surface-sunken opacity-40 group-hover:opacity-60"
                  }`}
                />

                {/* X-Axis Label Pill */}
                <div className="mt-2.5 flex flex-col items-center">
                  <span
                    className={`text-[11px] font-mono transition-all text-center rounded-md px-1.5 py-0.5 ${
                      isActive
                        ? "text-accent font-bold bg-accent-soft"
                        : "text-ink-muted group-hover:text-ink font-semibold"
                    }`}
                  >
                    {point.label}
                  </span>
                  {/* Real Value Pill below Label on hover/selection */}
                  <span
                    className={`text-[10px] font-mono font-extrabold transition-opacity duration-200 ${
                      isActive
                        ? "text-accent opacity-100"
                        : "opacity-0 text-transparent"
                    }`}
                  >
                    {activeMetric === "revenue" ? `$${Math.round(point.revenue)}` : `${point.leads}L`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
