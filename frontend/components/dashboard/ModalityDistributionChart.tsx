"use client";

import React, { useState } from "react";
import { PieChart, Car, Hotel, Plane } from "lucide-react";

export interface ModalityLead {
  service_type: "car" | "hotel" | "flight" | string | null;
  status: string;
  custom_fields?: Record<string, unknown> | null;
}

interface ModalitySlice {
  type: "car" | "hotel" | "flight" | "general";
  label: string;
  count: number;
  revenue: number;
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export default function ModalityDistributionChart({ leads = [] }: { leads?: ModalityLead[] }) {
  const [activeSlice, setActiveSlice] = useState<ModalitySlice | null>(null);

  // Group real leads by service type
  const flightLeads = leads.filter((l) => l.service_type === "flight");
  const hotelLeads = leads.filter((l) => l.service_type === "hotel");
  const carLeads = leads.filter((l) => l.service_type === "car");
  const generalLeads = leads.filter((l) => !l.service_type || (l.service_type !== "flight" && l.service_type !== "hotel" && l.service_type !== "car"));

  const slices: ModalitySlice[] = [
    {
      type: "flight",
      label: "Flight Bookings",
      count: flightLeads.length,
      revenue: flightLeads.length * 450,
      color: "#3b82f6",
      icon: Plane,
    },
    {
      type: "hotel",
      label: "Hotel Reservations",
      count: hotelLeads.length,
      revenue: hotelLeads.length * 320,
      color: "#8b5cf6",
      icon: Hotel,
    },
    {
      type: "car",
      label: "Car Rentals",
      count: carLeads.length,
      revenue: carLeads.length * 180,
      color: "#10b981",
      icon: Car,
    },
  ];

  if (generalLeads.length > 0) {
    slices.push({
      type: "general",
      label: "General / Intake",
      count: generalLeads.length,
      revenue: generalLeads.length * 100,
      color: "#6366f1",
      icon: PieChart,
    });
  }

  const totalCount = Math.max(leads.length, 1);
  const activeSlicesWithData = slices.filter((s) => s.count > 0);
  const displaySlices = activeSlicesWithData.length > 0 ? slices : slices;

  // Calculate SVG stroke dashes for Donut Ring
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.32

  const segments = displaySlices.reduce<
    Array<ModalitySlice & { fraction: number; dashLength: number; offset: number }>
  >((acc, slice) => {
    const fraction = slice.count / totalCount;
    const dashLength = fraction * circumference;
    const offset = acc.reduce((sum, item) => sum + item.dashLength, 0);
    acc.push({ ...slice, fraction, dashLength, offset });
    return acc;
  }, []);

  const displayTarget = activeSlice ?? (activeSlicesWithData[0] || slices[0]);

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PieChart size={18} className="text-accent" />
            <h3 className="text-sm font-bold text-ink">Booking Modality Share</h3>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            Live database distribution by service vertical.
          </p>
        </div>
        <span className="rounded-full border border-hairline bg-surface-raised px-2.5 py-0.5 font-mono text-xs font-bold text-ink-muted">
          {leads.length} total
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
            <span className="font-mono text-base font-extrabold text-ink">
              {leads.length > 0 ? Math.round((displayTarget.count / totalCount) * 100) : 0}%
            </span>
            <span className="text-xs font-semibold capitalize text-ink-muted">
              {displayTarget.type}
            </span>
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className="mt-4 flex flex-1 flex-col gap-2 sm:mt-0 w-full">
          {displaySlices.map((slice) => {
            const Icon = slice.icon;
            const pct = leads.length > 0 ? Math.round((slice.count / totalCount) * 100) : 0;
            const isSelected = activeSlice?.type === slice.type;

            return (
              <div
                key={slice.type}
                onMouseEnter={() => setActiveSlice(slice)}
                onMouseLeave={() => setActiveSlice(null)}
                className={`flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? "border-accent/60 bg-surface-raised shadow-xs"
                    : "border-hairline bg-surface-sunken hover:border-hairline-strong"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink">{slice.label}</p>
                    <p className="font-mono text-xs text-ink-muted">
                      {slice.count} recorded leads
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-ink">{slice.count}</span>
                  <span className="ml-1 text-xs font-semibold text-ink-muted">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
