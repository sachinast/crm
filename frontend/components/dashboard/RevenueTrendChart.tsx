"use client";

import React, { useState } from "react";
import { TrendingUp, ArrowUpRight, BarChart3 } from "lucide-react";

interface TrendPoint {
  label: string;
  revenue: number;
  leads: number;
}

const SAMPLE_7D: TrendPoint[] = [
  { label: "Mon", revenue: 4200, leads: 12 },
  { label: "Tue", revenue: 6800, leads: 18 },
  { label: "Wed", revenue: 5400, leads: 15 },
  { label: "Thu", revenue: 9100, leads: 24 },
  { label: "Fri", revenue: 11200, leads: 31 },
  { label: "Sat", revenue: 8300, leads: 22 },
  { label: "Sun", revenue: 7600, leads: 19 },
];

const SAMPLE_30D: TrendPoint[] = [
  { label: "W1", revenue: 28400, leads: 76 },
  { label: "W2", revenue: 34200, leads: 92 },
  { label: "W3", revenue: 41800, leads: 110 },
  { label: "W4", revenue: 48600, leads: 128 },
];

const SAMPLE_12M: TrendPoint[] = [
  { label: "Jan", revenue: 112000, leads: 310 },
  { label: "Feb", revenue: 124000, leads: 340 },
  { label: "Mar", revenue: 148000, leads: 405 },
  { label: "Apr", revenue: 139000, leads: 380 },
  { label: "May", revenue: 162000, leads: 440 },
  { label: "Jun", revenue: 185000, leads: 510 },
  { label: "Jul", revenue: 194000, leads: 530 },
  { label: "Aug", revenue: 215000, leads: 590 },
];

export default function RevenueTrendChart({ baseRevenue }: { baseRevenue?: number | null }) {
  const [range, setRange] = useState<"7D" | "30D" | "12M">("7D");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = range === "7D" ? SAMPLE_7D : range === "30D" ? SAMPLE_30D : SAMPLE_12M;
  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const totalPeriodRevenue = data.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalPeriodLeads = data.reduce((acc, curr) => acc + curr.leads, 0);

  return (
    <div className="card space-y-4">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--ink)]">Revenue & Pipeline Velocity</h3>
          </div>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            Booking revenue realization and intake velocity trends.
          </p>
        </div>

        {/* Timeframe Toggle Buttons */}
        <div className="flex items-center gap-1 rounded-xl border border-hairline bg-surface-sunken p-1">
          {(["7D", "30D", "12M"] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r);
                setHoveredIndex(null);
              }}
              className={`rounded-lg px-3 py-1 font-mono text-xs font-bold transition-all ${
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

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 gap-3 border-y border-[var(--hairline)] py-3 sm:grid-cols-3">
        <div>
          <span className="text-xs font-semibold text-[var(--ink-muted)]">Period Revenue</span>
          <p className="mt-0.5 text-lg font-extrabold text-[var(--ink)] font-mono">
            ${totalPeriodRevenue.toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-xs font-semibold text-[var(--ink-muted)]">Intake Volume</span>
          <p className="mt-0.5 text-lg font-extrabold text-[var(--accent)] font-mono">
            {totalPeriodLeads} leads
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-[var(--ink-muted)]">Period Growth</span>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-success">
            <TrendingUp size={14} />
            <span>+14.8% vs previous period</span>
          </p>
        </div>
      </div>

      {/* Interactive SVG Bar & Trend Graph */}
      <div className="relative pt-2">
        <div className="flex h-44 items-end gap-2 sm:gap-3">
          {data.map((point, i) => {
            const heightPct = Math.max(12, Math.round((point.revenue / maxRevenue) * 100));
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
                  <div className="absolute -top-12 z-20 whitespace-nowrap rounded-xl border border-[var(--accent)] bg-[var(--surface-sunken)] px-3 py-1 text-center shadow-lg pointer-events-none animate-fadeIn">
                    <p className="text-xs font-bold text-[var(--ink)] font-mono">
                      ${point.revenue.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[var(--accent)] font-semibold">
                      {point.leads} bookings
                    </p>
                  </div>
                )}

                {/* Vertical Bar with Gold Gradient */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-lg transition-all duration-300 ${
                    isHovered
                      ? "bg-gradient-to-t from-[var(--accent)] to-[var(--accent-hover)] shadow-[0_0_15px_rgba(211,171,94,0.4)]"
                      : "bg-gradient-to-t from-[var(--surface-raised)] to-[var(--accent)]/80 group-hover:to-[var(--accent)]"
                  }`}
                />

                {/* X-Axis Label */}
                <span
                  className={`mt-2 text-xs font-mono font-semibold transition-colors ${
                    isHovered ? "text-[var(--accent)] font-bold" : "text-[var(--ink-muted)]"
                  }`}
                >
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
