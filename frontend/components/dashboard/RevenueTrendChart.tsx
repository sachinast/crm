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
    <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-5 shadow-sm space-y-4">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-[#d3ab5e]" />
            <h3 className="text-sm font-bold text-white">Revenue & Pipeline Velocity</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Booking revenue realization and intake velocity trends.
          </p>
        </div>

        {/* Timeframe Toggle Buttons */}
        <div className="flex items-center gap-1 rounded-xl border border-[#232e47] bg-[#0d1220] p-1">
          {(["7D", "30D", "12M"] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r);
                setHoveredIndex(null);
              }}
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-all ${
                range === r
                  ? "bg-[#d3ab5e] text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 gap-3 border-y border-[#232e47] py-3 sm:grid-cols-3">
        <div>
          <span className="text-[11px] font-semibold text-slate-400">Period Revenue</span>
          <p className="mt-0.5 text-base font-extrabold text-white font-mono">
            ${totalPeriodRevenue.toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400">Intake Volume</span>
          <p className="mt-0.5 text-base font-extrabold text-[#d3ab5e] font-mono">
            {totalPeriodLeads} leads
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-400">Period Growth</span>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-[#3ecf9a]">
            <TrendingUp size={13} />
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
                  <div className="absolute -top-12 z-20 whitespace-nowrap rounded-xl border border-[#d3ab5e]/60 bg-[#0d1220] px-2.5 py-1 text-center shadow-lg pointer-events-none animate-fadeIn">
                    <p className="text-[11px] font-bold text-white font-mono">
                      ${point.revenue.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[#d3ab5e] font-medium">
                      {point.leads} bookings
                    </p>
                  </div>
                )}

                {/* Vertical Bar with Gold Gradient */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-lg transition-all duration-300 ${
                    isHovered
                      ? "bg-gradient-to-t from-[#d3ab5e] to-[#f0d59e] shadow-[0_0_15px_rgba(211,171,94,0.4)]"
                      : "bg-gradient-to-t from-[#182136] to-[#d3ab5e]/80 group-hover:to-[#d3ab5e]"
                  }`}
                />

                {/* X-Axis Label */}
                <span
                  className={`mt-2 text-[10px] font-mono font-semibold transition-colors ${
                    isHovered ? "text-[#d3ab5e]" : "text-slate-400"
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
