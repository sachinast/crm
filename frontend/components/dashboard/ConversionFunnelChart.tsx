"use client";

import React from "react";
import { Zap } from "lucide-react";

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
  const total = Math.max(totalLeads, 0);

  // Calculate real funnel stages from real database statuses
  const authorizationPendingCount = leadsByStatus["authorization_pending"] ?? 0;
  const clientApprovedCount = leadsByStatus["client_approved"] ?? 0;
  const transferredToBillingCount = leadsByStatus["transferred_to_billing"] ?? 0;
  const cardChargedCount = leadsByStatus["card_charged"] ?? 0;
  const qcDoneCount = leadsByStatus["qc_done"] ?? 0;
  const tagAuditorCount = leadsByStatus["tag_auditor"] ?? 0;
  const bookedSharedCount = leadsByStatus["booked_shared_client"] ?? 0;

  // Stage 1: All inbound intakes (100%)
  const stage1Count = total;

  // Stage 2: In discussion / quotation (all active leads past initial intake)
  const stage2Count = Math.max(
    total - (leadsByStatus["dropped"] ?? 0),
    0
  );

  // Stage 3: Payment authorization & billing
  const stage3Count = clientApprovedCount + transferredToBillingCount + cardChargedCount + qcDoneCount + bookedSharedCount;

  // Stage 4: QC & audit verification
  const stage4Count = qcDoneCount + tagAuditorCount + cardChargedCount + bookedSharedCount;

  // Stage 5: Realized / charged bookings
  const stage5Count = cardChargedCount + bookedSharedCount;

  const winRate = total > 0 ? Math.round((stage5Count / total) * 100) : 0;

  const STAGES: FunnelStage[] = [
    {
      name: "1. Inbound Intake",
      count: stage1Count,
      pct: total > 0 ? 100 : 0,
      conversion: "100%",
      color: "#6366f1",
    },
    {
      name: "2. Active Pipeline",
      count: stage2Count,
      pct: total > 0 ? Math.round((stage2Count / total) * 100) : 0,
      conversion: total > 0 ? `${Math.round((stage2Count / total) * 100)}%` : "0%",
      color: "#3b82f6",
    },
    {
      name: "3. Payment & Billing Review",
      count: stage3Count,
      pct: total > 0 ? Math.round((stage3Count / total) * 100) : 0,
      conversion: total > 0 ? `${Math.round((stage3Count / total) * 100)}%` : "0%",
      color: "#8b5cf6",
    },
    {
      name: "4. QC & Quality Audit",
      count: stage4Count,
      pct: total > 0 ? Math.round((stage4Count / total) * 100) : 0,
      conversion: total > 0 ? `${Math.round((stage4Count / total) * 100)}%` : "0%",
      color: "#f59e0b",
    },
    {
      name: "5. Charged & Realized",
      count: stage5Count,
      pct: total > 0 ? Math.round((stage5Count / total) * 100) : 0,
      conversion: total > 0 ? `${Math.round((stage5Count / total) * 100)}%` : "0%",
      color: "#10b981",
    },
  ];

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-accent" />
            <h3 className="text-sm font-bold text-ink">Pipeline Conversion Funnel</h3>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            Live database customer journey progression and stage throughput.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400">
          <span>{winRate}% Win Rate</span>
        </div>
      </div>

      {/* Funnel Waterfall Stages */}
      <div className="space-y-3 pt-2">
        {STAGES.map((stage) => (
          <div key={stage.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink text-sm">{stage.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-ink">{stage.count} leads</span>
                <span className="font-mono text-xs text-ink-muted">({stage.pct}%)</span>
              </div>
            </div>

            {/* Stage Progress Bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-sunken border border-hairline">
              <div
                style={{
                  width: `${Math.max(stage.pct, stage.count > 0 ? 4 : 0)}%`,
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
