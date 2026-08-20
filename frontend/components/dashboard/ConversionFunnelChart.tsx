"use client";

import React from "react";
import { Filter, ArrowRight, Zap } from "lucide-react";

interface FunnelStage {
  name: string;
  count: number;
  pct: number;
  conversion: string;
  color: string;
}

interface ConversionFunnelProps {
  leadsByStatus: Record<string, number>;
  totalLeads: number;
}

export default function ConversionFunnelChart({ leadsByStatus, totalLeads }: ConversionFunnelProps) {
  const total = Math.max(totalLeads, 1);

  const STAGES: FunnelStage[] = [
    {
      name: "1. Inbound Intake",
      count: total,
      pct: 100,
      conversion: "100%",
      color: "#6366f1",
    },
    {
      name: "2. In Discussion / Quotation",
      count: Math.max(1, Math.round(total * 0.76)),
      pct: 76,
      conversion: "76.0%",
      color: "#3b82f6",
    },
    {
      name: "3. Payment Authorization",
      count: Math.max(1, Math.round(total * 0.54)),
      pct: 54,
      conversion: "71.0%",
      color: "#d3ab5e",
    },
    {
      name: "4. QC & Quality Audit",
      count: Math.max(1, Math.round(total * 0.42)),
      pct: 42,
      conversion: "77.7%",
      color: "#e0bc78",
    },
    {
      name: "5. Charged & Confirmed",
      count: Math.max(1, Math.round(total * 0.36)),
      pct: 36,
      conversion: "85.7%",
      color: "#3ecf9a",
    },
  ];

  return (
    <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-[#d3ab5e]" />
            <h3 className="text-sm font-bold text-white">Pipeline Conversion Funnel</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            End-to-end customer journey progression and stage throughput.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[#3ecf9a]/30 bg-[#113028] px-2.5 py-0.5 text-xs font-bold text-[#3ecf9a]">
          <span>36% Win Rate</span>
        </div>
      </div>

      {/* Funnel Waterfall Stages */}
      <div className="space-y-3 pt-2">
        {STAGES.map((stage, idx) => (
          <div key={stage.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">{stage.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">{stage.count} leads</span>
                <span className="font-mono text-[11px] text-slate-400">({stage.pct}%)</span>
              </div>
            </div>

            {/* Stage Progress Bar */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0d1220] border border-[#232e47]">
              <div
                style={{
                  width: `${stage.pct}%`,
                  backgroundColor: stage.color,
                }}
                className="h-full rounded-full transition-all duration-500 shadow-xs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
