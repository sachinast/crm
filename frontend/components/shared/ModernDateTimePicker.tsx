"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  Sparkles,
} from "lucide-react";

export interface ModernDateTimePickerProps {
  value?: string | null;
  onChange: (isoOrFormattedString: string) => void;
  mode?: "date" | "datetime";
  placeholder?: string;
  required?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDateValue(val: string | null | undefined): {
  year: number;
  month: number; // 0-11
  day: number;
  hours: number;
  minutes: number;
} | null {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    // Attempt parsing "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
    if (!match) return null;
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10) - 1,
      day: parseInt(match[3], 10),
      hours: match[4] ? parseInt(match[4], 10) : 12,
      minutes: match[5] ? parseInt(match[5], 10) : 0,
    };
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    hours: d.getHours(),
    minutes: d.getMinutes(),
  };
}

export default function ModernDateTimePicker({
  value = "",
  onChange,
  mode = "datetime",
  placeholder,
  required = false,
  className = "",
}: ModernDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseDateValue(value), [value]);

  const [viewYear, setViewYear] = useState<number>(() => parsed?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => parsed?.month ?? new Date().getMonth());
  const [selectedHours, setSelectedHours] = useState<number>(() => parsed?.hours ?? 10);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(() => parsed?.minutes ?? 0);

  // Sync view state when value changes from outside
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
      setSelectedHours(parsed.hours);
      setSelectedMinutes(parsed.minutes);
    }
  }, [value, parsed]);

  // Outside click handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Calendar Grid Days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      monthOffset: -1 | 0 | 1;
      dateKey: string;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Leading days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        monthOffset: -1,
        dateKey,
        isToday: dateKey === todayStr,
        isSelected: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSelected = parsed
        ? parsed.year === viewYear && parsed.month === viewMonth && parsed.day === d
        : false;
      days.push({
        dayNumber: d,
        monthOffset: 0,
        dateKey,
        isToday: dateKey === todayStr,
        isSelected,
      });
    }

    // Trailing days from next month
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        monthOffset: 1,
        dateKey,
        isToday: dateKey === todayStr,
        isSelected: false,
      });
    }

    return days;
  }, [viewYear, viewMonth, parsed]);

  function handleSelectDay(day: number, monthOffset: -1 | 0 | 1) {
    let targetYear = viewYear;
    let targetMonth = viewMonth + monthOffset;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    const yStr = String(targetYear);
    const mStr = String(targetMonth + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");

    if (mode === "date") {
      onChange(`${yStr}-${mStr}-${dStr}`);
      setIsOpen(false);
    } else {
      const hrStr = String(selectedHours).padStart(2, "0");
      const minStr = String(selectedMinutes).padStart(2, "0");
      onChange(`${yStr}-${mStr}-${dStr}T${hrStr}:${minStr}`);
    }
  }

  function handleTimeChange(h: number, m: number) {
    setSelectedHours(h);
    setSelectedMinutes(m);

    if (parsed) {
      const yStr = String(parsed.year);
      const mStr = String(parsed.month + 1).padStart(2, "0");
      const dStr = String(parsed.day).padStart(2, "0");
      const hrStr = String(h).padStart(2, "0");
      const minStr = String(m).padStart(2, "0");
      onChange(`${yStr}-${mStr}-${dStr}T${hrStr}:${minStr}`);
    }
  }

  function handleSetToday() {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    setViewYear(y);
    setViewMonth(m);

    const yStr = String(y);
    const mStr = String(m + 1).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");

    if (mode === "date") {
      onChange(`${yStr}-${mStr}-${dStr}`);
      setIsOpen(false);
    } else {
      const hrStr = String(selectedHours).padStart(2, "0");
      const minStr = String(selectedMinutes).padStart(2, "0");
      onChange(`${yStr}-${mStr}-${dStr}T${hrStr}:${minStr}`);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  // Display text formatted cleanly
  const displayLabel = useMemo(() => {
    if (!parsed) return "";
    const dateObj = new Date(parsed.year, parsed.month, parsed.day);
    const monthShort = dateObj.toLocaleDateString("en-US", { month: "short" });
    const dayFormatted = `${monthShort} ${parsed.day}, ${parsed.year}`;

    if (mode === "date") return dayFormatted;

    const period = parsed.hours >= 12 ? "PM" : "AM";
    const hour12 = parsed.hours % 12 || 12;
    const minStr = String(parsed.minutes).padStart(2, "0");
    return `${dayFormatted} at ${hour12}:${minStr} ${period}`;
  }, [parsed, mode]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button Input Box */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`input flex items-center justify-between gap-2 text-left transition-all ${
          isOpen
            ? "border-accent ring-2 ring-accent/20 bg-surface"
            : "hover:border-hairline-strong bg-surface"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CalendarIcon size={16} className="text-accent shrink-0" />
          {displayLabel ? (
            <span className="font-mono text-xs font-semibold text-ink truncate">
              {displayLabel}
            </span>
          ) : (
            <span className="text-xs text-ink-muted truncate">
              {placeholder ?? (mode === "date" ? "Select date…" : "Select date & time…")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {displayLabel && (
            <span
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-surface-raised text-ink-muted hover:text-ink transition-colors cursor-pointer"
              title="Clear date"
            >
              <X size={13} />
            </span>
          )}
          {mode === "datetime" && <Clock size={14} className="text-ink-muted" />}
        </div>
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-80 rounded-2xl border border-hairline bg-surface p-4 shadow-2xl animate-fadeIn space-y-3">
          {/* Calendar Header with Month & Year dropdowns for fast birth date selection */}
          <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-hairline">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear((y) => y - 1);
                } else {
                  setViewMonth((m) => m - 1);
                }
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface hover:bg-surface-raised text-ink transition-colors"
              title="Previous Month"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              {/* Quick Month Select */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="select text-xs py-1 px-2 font-semibold text-ink bg-surface border border-hairline rounded-lg cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Quick Year Select (1930 to current+10) */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="select text-xs py-1 px-2 font-mono font-semibold text-ink bg-surface border border-hairline rounded-lg cursor-pointer"
              >
                {Array.from({ length: new Date().getFullYear() + 10 - 1930 + 1 }, (_, i) => {
                  const y = new Date().getFullYear() + 10 - i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else {
                  setViewMonth((m) => m + 1);
                }
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface hover:bg-surface-raised text-ink transition-colors"
              title="Next Month"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Days Grid */}
          <div>
            {/* Weekday Labels */}
            <div className="grid grid-cols-7 text-center font-mono text-[11px] font-bold text-ink-muted mb-1">
              {DAYS_SHORT.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days Matrix */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
              {calendarDays.map((cd, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cd.dayNumber, cd.monthOffset)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl font-medium transition-all ${
                    cd.isSelected
                      ? "bg-accent text-white font-bold shadow-xs scale-105"
                      : cd.isToday
                        ? "border border-accent/60 text-accent font-bold bg-accent-soft"
                        : cd.monthOffset !== 0
                          ? "text-ink-muted opacity-30 hover:opacity-80"
                          : "text-ink hover:bg-surface-raised"
                  }`}
                >
                  {cd.dayNumber}
                </button>
              ))}
            </div>
          </div>

          {/* Time Picker Bar (if mode="datetime") */}
          {mode === "datetime" && (
            <div className="pt-2.5 border-t border-hairline flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-ink font-semibold">
                <Clock size={14} className="text-accent" />
                <span>Time:</span>
              </div>

              <div className="flex items-center gap-1">
                {/* Hours Select */}
                <select
                  value={selectedHours}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), selectedMinutes)}
                  className="select font-mono text-xs py-1 px-2 rounded-lg"
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const period = h >= 12 ? "PM" : "AM";
                    const hour12 = h % 12 || 12;
                    return (
                      <option key={h} value={h}>
                        {String(hour12).padStart(2, "0")} {period} ({String(h).padStart(2, "0")}:00)
                      </option>
                    );
                  })}
                </select>

                <span className="font-bold text-ink-muted">:</span>

                {/* Minutes Select */}
                <select
                  value={selectedMinutes}
                  onChange={(e) => handleTimeChange(selectedHours, parseInt(e.target.value, 10))}
                  className="select font-mono text-xs py-1 px-2 rounded-lg"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Quick Footer Action Pills */}
          <div className="pt-2 border-t border-hairline flex items-center justify-between">
            <button
              type="button"
              onClick={handleSetToday}
              className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
            >
              <Sparkles size={12} />
              <span>Today</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn-primary text-xs py-1 px-3.5 rounded-lg font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
