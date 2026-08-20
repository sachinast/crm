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
  { type: "flight", label: "Flight Bookings", count: 184, revenue: 142000, color: "#3ecf9a", icon: Plane },
  { type: "hotel", label: "Hotel Reservations", count: 126, revenue: 98400, color: "#d3ab5e", icon: Hotel },
  { type: "car", label: "Car Rentals", count: 82, revenue: 34200, color: "#6366f1", icon: Car },
];

export default function ModalityDistributionChart() {
  const [activeSlice, setActiveSlice] = useState<ModalitySlice | null>(null);

  const totalCount = MODALITY_DATA.reduce((acc, curr) => acc + curr.count, 0);
  const totalRevenue = MODALITY_DATA.reduce((acc, curr) => acc + curr.revenue, 0);

  // Calculate SVG stroke dashes for Donut Ring
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.32

  let accumulatedOffset = 0;
  const segments = MODALITY_DATA.map((slice) => {
    const fraction = slice.count / totalCount;
    const dashLength = fraction * circumference;
    const offset = accumulatedOffset;
    accumulatedOffset += dashLength;
    return { ...slice, fraction, dashLength, offset };
  });

  const displayTarget = activeSlice ?? MODALITY_DATA[0];

  return (
    <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PieChart size={16} className="text-[#d3ab5e]" />
            <h3 className="text-sm font-bold text-white">Booking Modality Share</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Portfolio distribution by service vertical.
          </p>
        </div>
        <span className="rounded-full border border-[#2a3652] bg-[#182136] px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-300">
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
              stroke="#182136"
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
            <span className="font-mono text-base font-extrabold text-white">
              {Math.round((displayTarget.count / totalCount) * 100)}%
            </span>
            <span className="text-[10px] font-semibold capitalize text-slate-400">
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
                    ? "border-[#d3ab5e]/60 bg-[#182136]"
                    : "border-[#232e47] bg-[#0d1220]/60 hover:border-[#2a3652]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${slice.color}20`, color: slice.color }}
                  >
                    <Icon size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{slice.label}</p>
                    <p className="font-mono text-[10px] text-slate-400">
                      ${slice.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-white">{slice.count}</span>
                  <span className="ml-1 text-[11px] font-semibold text-slate-400">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
