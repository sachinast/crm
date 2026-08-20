"use client";

import React, { useState } from "react";
import { PieChart, Car, Hotel, Plane } from "lucide-react";

interface ModalitySlice {
  type: "car" | "hotel" | "flight";
  label: string;
  count: number;
  revenue: number;
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const MODALITY_DATA: ModalitySlice[] = [
  { type: "flight", label: "Flight Bookings", count: 184, revenue: 142000, color: "#3b82f6", icon: Plane },
  { type: "hotel", label: "Hotel Reservations", count: 126, revenue: 98400, color: "#8b5cf6", icon: Hotel },
  { type: "car", label: "Car Rentals", count: 82, revenue: 34200, color: "#10b981", icon: Car },
];

export default function ModalityDistributionChart() {
  const [activeSlice, setActiveSlice] = useState<ModalitySlice | null>(null);

  const totalCount = MODALITY_DATA.reduce((acc, curr) => acc + curr.count, 0);
  const totalRevenue = MODALITY_DATA.reduce((acc, curr) => acc + curr.revenue, 0);

  // Calculate SVG stroke dashes for Donut Ring
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.32

  const segments = MODALITY_DATA.reduce<
    Array<(typeof MODALITY_DATA)[number] & { fraction: number; dashLength: number; offset: number }>
  >((acc, slice) => {
    const fraction = slice.count / totalCount;
    const dashLength = fraction * circumference;
    const offset = acc.reduce((sum, item) => sum + item.dashLength, 0);
    acc.push({ ...slice, fraction, dashLength, offset });
    return acc;
  }, []);

  const displayTarget = activeSlice ?? MODALITY_DATA[0];

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PieChart size={18} className="text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--ink)]">Booking Modality Share</h3>
          </div>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            Portfolio distribution by service vertical.
          </p>
        </div>
        <span className="rounded-full border border-[var(--hairline)] bg-[var(--surface-raised)] px-2.5 py-0.5 font-mono text-xs font-bold text-[var(--ink-muted)]">
          {totalCount} total
        </span>
      </div>

      {/* SVG Donut Ring & Center Stats */}
      <div className="flex flex-col items-center justify-center py-2 sm:flex-row sm:gap-6">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="var(--hairline)"
              strokeWidth="12"
            />
            {/* Slices */}
            {segments.map((seg) => {
              const isSelected = activeSlice?.type === seg.type;
              return (
                <circle
                  key={seg.type}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isSelected ? "14" : "12"}
                  strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                  strokeDashoffset={-seg.offset}
                  strokeLinecap="round"
                  onMouseEnter={() => setActiveSlice(seg)}
                  className="cursor-pointer transition-all duration-300 hover:opacity-90"
                />
              );
            })}
          </svg>

          {/* Center Callout */}
          <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="font-mono text-base font-extrabold text-[var(--ink)]">
              {Math.round((displayTarget.count / totalCount) * 100)}%
            </span>
            <span className="text-xs font-semibold capitalize text-[var(--ink-muted)]">
              {displayTarget.type}
            </span>
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className="mt-4 flex flex-1 flex-col gap-2.5 sm:mt-0 w-full">
          {MODALITY_DATA.map((slice) => {
            const Icon = slice.icon;
            const pct = Math.round((slice.count / totalCount) * 100);
            const isSelected = activeSlice?.type === slice.type;

            return (
              <div
                key={slice.type}
                onMouseEnter={() => setActiveSlice(slice)}
                onMouseLeave={() => setActiveSlice(null)}
                className={`flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? "border-[var(--accent)]/60 bg-[var(--surface-raised)]"
                    : "border-[var(--hairline)] bg-[var(--surface-sunken)] hover:border-[var(--hairline-strong)]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent"
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink)]">{slice.label}</p>
                    <p className="font-mono text-xs text-[var(--ink-muted)]">
                      ${slice.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-[var(--ink)]">{slice.count}</span>
                  <span className="ml-1 text-xs font-semibold text-[var(--ink-muted)]">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
