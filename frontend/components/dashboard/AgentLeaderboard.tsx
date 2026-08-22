"use client";

import React from "react";
import { Trophy, Award, UserCheck } from "lucide-react";

export interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  revenue: number;
  bookings_count: number;
}

const MEDALS = ["🥇", "🥈", "🥉", "4th", "5th"];

export default function AgentLeaderboard({
  leaderboard = [],
  currentUser,
}: {
  leaderboard: LeaderboardEntry[] | null;
  currentUser?: { id: string; name: string };
}) {
  const data = leaderboard && leaderboard.length > 0 ? leaderboard : [];
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-accent" />
            <h3 className="text-sm font-bold text-ink">Top Sales Performers</h3>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            Live leaderboard by realized booking volume and attributed revenue.
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-accent">
          <Award size={15} />
          <span>Real Data</span>
        </span>
      </div>

      {/* Leaderboard List or Empty State */}
      {data.length === 0 ? (
        <div className="rounded-xl border border-hairline bg-surface-sunken p-6 text-center space-y-2">
          <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-surface-raised border border-hairline text-ink-muted">
            <UserCheck size={18} />
          </div>
          <p className="text-sm font-semibold text-ink">No closed sales recorded yet</p>
          <p className="text-xs text-ink-muted max-w-xs mx-auto">
            Bookings transitioned to Charged status will automatically rank here with real attributed revenue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((agent, i) => {
            const widthPct = Math.max(15, Math.round((agent.revenue / maxRevenue) * 100));
            const isCurrentUser = currentUser?.id === agent.agent_id;

            return (
              <div
                key={agent.agent_id}
                className={`rounded-xl border p-3 transition-colors space-y-2 ${
                  isCurrentUser
                    ? "border-accent/40 bg-surface-raised shadow-xs"
                    : "border-hairline bg-surface-sunken hover:border-hairline-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center font-bold text-xs">
                      {MEDALS[i] || `${i + 1}th`}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                        <span>{agent.agent_name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-accent text-white font-bold">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {agent.bookings_count} {agent.bookings_count === 1 ? "booking" : "bookings"} closed
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-sm font-extrabold text-accent">
                    ${agent.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Volume Progress Indicator */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface border border-hairline">
                  <div
                    style={{ width: `${widthPct}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
