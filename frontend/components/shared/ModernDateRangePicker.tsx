"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, Check, Sparkles, X } from "lucide-react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

function formatDateDisplay(isoDateStr: string): string {
  if (!isoDateStr) return "Select date";
  const [y, m, d] = isoDateStr.split("-").map(Number);
  if (!y || !m || !d) return isoDateStr;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ModernDateRangePicker({
  startDate,
  endDate,
  onChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const setPreset = (daysAgoStart: number, daysAgoEnd: number = 0) => {
    const end = new Date();
    end.setDate(end.getDate() - daysAgoEnd);
    const start = new Date();
    start.setDate(start.getDate() - daysAgoStart);

    onChange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
    setIsOpen(false);
  };

  const setThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    onChange(firstDay.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
    setIsOpen(false);
  };

  const setThisYear = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1);
    onChange(firstDay.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 rounded-xl border border-hairline bg-surface-raised px-3.5 py-2 text-xs font-semibold shadow-xs hover:border-accent hover:bg-surface transition-all active:scale-98"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-soft text-accent group-hover:bg-accent group-hover:text-white transition-colors">
          <CalendarIcon size={13} />
        </div>

        <div className="flex items-center gap-1.5 font-mono text-ink">
          <span className="font-bold">{formatDateDisplay(startDate)}</span>
          <span className="text-ink-faint font-sans text-[11px] font-normal">to</span>
          <span className="font-bold">{formatDateDisplay(endDate)}</span>
        </div>

        <ChevronDown
          size={13}
          className={`text-ink-muted transition-transform duration-200 ${isOpen ? "rotate-180 text-accent" : ""}`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-hairline bg-surface p-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hairline pb-2.5">
            <div className="flex items-center gap-2">
              <CalendarIcon size={15} className="text-accent" />
              <span className="text-xs font-bold uppercase tracking-wider text-ink">Select Date Range</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-surface-raised transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-2 block">
              Quick Presets
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPreset(0, 0)}
                className="rounded-lg border border-hairline bg-surface-raised px-2.5 py-1.5 text-center text-xs font-semibold text-ink hover:border-accent hover:text-accent hover:bg-accent-soft transition-all"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setPreset(1, 1)}
                className="rounded-lg border border-hairline bg-surface-raised px-2.5 py-1.5 text-center text-xs font-semibold text-ink hover:border-accent hover:text-accent hover:bg-accent-soft transition-all"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setPreset(7)}
                className="rounded-lg border border-hairline bg-surface-raised px-2.5 py-1.5 text-center text-xs font-semibold text-ink hover:border-accent hover:text-accent hover:bg-accent-soft transition-all"
              >
                Past 7 Days
              </button>
              <button
                type="button"
                onClick={setThisMonth}
                className="rounded-lg border border-hairline bg-surface-raised px-2.5 py-1.5 text-center text-xs font-semibold text-ink hover:border-accent hover:text-accent hover:bg-accent-soft transition-all"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setPreset(30)}
                className="rounded-lg border border-hairline bg-surface-raised px-2.5 py-1.5 text-center text-xs font-semibold text-ink hover:border-accent hover:text-accent hover:bg-accent-soft transition-all"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={setThisYear}
                className="rounded-lg border border-hairline bg-surface-raised px-2.5 py-1.5 text-center text-xs font-semibold text-ink hover:border-accent hover:text-accent hover:bg-accent-soft transition-all"
              >
                This Year
              </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          <div className="space-y-2.5 pt-2 border-t border-hairline">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
              Custom Range
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-ink-muted">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onChange(e.target.value, endDate)}
                  className="input py-1.5 px-2.5 text-xs font-mono font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-ink-muted">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onChange(startDate, e.target.value)}
                  className="input py-1.5 px-2.5 text-xs font-mono font-medium"
                />
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn-primary btn-sm w-full font-bold shadow-xs py-2"
            >
              Apply Date Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
