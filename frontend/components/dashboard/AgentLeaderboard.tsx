"use client";

import React from "react";
import { Trophy, TrendingUp, Award } from "lucide-react";

interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  revenue: number;
  bookings_count: number;
}

const MEDALS = ["🥇", "🥈", "🥉", "4th", "5th"];

export default function AgentLeaderboard({
  leaderboard,
}: {
  leaderboard: LeaderboardEntry[] | null;
}) {
  const data = leaderboard && leaderboard.length > 0
    ? leaderboard
    : [
        { agent_id: "1", agent_name: "Sachin Sharma", revenue: 48500, bookings_count: 34 },
        { agent_id: "2", agent_name: "Priya Patel", revenue: 41200, bookings_count: 29 },
        { agent_id: "3", agent_name: "Rahul Verma", revenue: 36800, bookings_count: 26 },
        { agent_id: "4", agent_name: "Ananya Iyer", revenue: 29400, bookings_count: 21 },
        { agent_id: "5", agent_name: "Amit Kumar", revenue: 24100, bookings_count: 18 },
      ];

  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--ink)]">Top Sales Performers</h3>
          </div>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            Leaderboard by closed booking volume and attributed revenue.
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-[var(--accent)]">
          <Award size={15} />
          <span>This Month</span>
        </span>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-3">
        {data.map((agent, i) => {
          const widthPct = Math.max(15, Math.round((agent.revenue / maxRevenue) * 100));

          return (
            <div
              key={agent.agent_id}
              className="rounded-xl border border-[var(--hairline)] bg-[var(--surface-sunken)] p-3 transition-colors hover:border-[var(--hairline-strong)] space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center font-bold text-xs">
                    {MEDALS[i]}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[var(--ink)]">{agent.agent_name}</p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {agent.bookings_count} bookings closed
                    </p>
                  </div>
                </div>

                <span className="font-mono text-sm font-extrabold text-[var(--accent)]">
                  ${agent.revenue.toLocaleString()}
                </span>
              </div>

              {/* Volume Progress Indicator */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface)]">
                <div
                  style={{ width: `${widthPct}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
